import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export const maxDuration = 30;

async function extractTextFromFile(
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "txt") {
    return await file.text();
  }

  if (ext === "pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfData = await pdfParse(buffer);
    return (pdfData.text || "").trim();
  }

  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || "").trim();
  }

  throw new Error(`Unsupported file type: ${ext}. Please upload PDF, DOCX, or TXT files.`);
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
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Assignment ID is required" },
        { status: 400 }
      );
    }

    // Validate file type
    const ext = file.name.split(".").pop()?.toLowerCase();
    const allowedTypes = ["pdf", "docx", "txt"];
    if (!ext || !allowedTypes.includes(ext)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload PDF, DOCX, or TXT files." },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Check assignment exists
    const assignment = await db.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    // Check if student already submitted
    const existingSubmission = await db.submission.findFirst({
      where: {
        assignmentId,
        studentId: session.user.id,
      },
    });

    if (existingSubmission) {
      return NextResponse.json(
        { error: "You have already submitted this assignment." },
        { status: 400 }
      );
    }

    // Extract text from file
    let content = "";
    try {
      content = await extractTextFromFile(file);
    } catch (err) {
      console.error("Text extraction error:", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to read file content." },
        { status: 400 }
      );
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Could not extract any text from the file. It may be empty, scanned, or corrupted." },
        { status: 400 }
      );
    }

    // Save file to disk
    try {
      const uploadDir = join(process.cwd(), "uploads");
      await mkdir(uploadDir, { recursive: true });
      const filePath = join(uploadDir, `${Date.now()}-${file.name}`);
      const bytes = await file.arrayBuffer();
      await writeFile(filePath, Buffer.from(bytes));
    } catch (err) {
      console.error("File save error (non-critical):", err);
    }

    // Create submission in database
    const submission = await db.submission.create({
      data: {
        content: content.trim(),
        fileName: file.name,
        fileType: ext,
        assignmentId,
        studentId: session.user.id,
      },
      include: {
        student: { select: { name: true, email: true } },
        assignment: { select: { title: true, totalMarks: true } },
      },
    });

    return NextResponse.json({
      message: "Assignment submitted successfully!",
      submission,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload assignment. Please try again." },
      { status: 500 }
    );
  }
}