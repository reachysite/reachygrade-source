import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { promises as fs } from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "upload");

async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text || "";
  } catch (err) {
    console.error("[UPLOAD] PDF parse error:", err);
    return "";
  }
}

async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.default.extractRawText({ buffer });
    return result.value || "";
  } catch (err) {
    console.error("[UPLOAD] DOCX parse error:", err);
    return "";
  }
}

async function extractTextFromTXT(buffer: Buffer): Promise<string> {
  return buffer.toString("utf-8");
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const assignmentId = formData.get("assignmentId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!assignmentId) {
      return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx", "txt"].includes(ext || "")) {
      return NextResponse.json(
        { error: "Only PDF, DOCX, and TXT files are allowed" },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    const assignment = await db.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const existingSubmission = await db.submission.findFirst({
      where: {
        assignmentId,
        studentId: session.user.id,
      },
    });

    if (existingSubmission) {
      return NextResponse.json(
        { error: "You have already submitted this assignment" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let content = "";

    switch (ext) {
      case "pdf":
        content = await extractTextFromPDF(buffer);
        break;
      case "docx":
        content = await extractTextFromDOCX(buffer);
        break;
      case "txt":
        content = await extractTextFromTXT(buffer);
        break;
    }

    if (!content.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from the file. Please ensure the file contains readable text." },
        { status: 400 }
      );
    }

    await ensureUploadDir();
    const timestamp = Date.now();
    const uniqueName = `${timestamp}-${file.name}`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);
    await fs.writeFile(filePath, buffer);

    const submission = await db.submission.create({
      data: {
        content: content.trim(),
        fileName: file.name,
        fileType: ext || "unknown",
        assignmentId,
        studentId: session.user.id,
      },
      include: {
        assignment: {
          select: { title: true, totalMarks: true },
        },
      },
    });

    console.log(`[UPLOAD] Submission created: ${submission.id} for assignment ${assignmentId}`);

    return NextResponse.json({
      message: "Assignment submitted successfully",
      submission,
    });
  } catch (error) {
    console.error("[UPLOAD] Error:", error);
    return NextResponse.json(
      { error: "Failed to upload assignment. Please try again." },
      { status: 500 }
    );
  }
}