import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (userRole !== "STUDENT") {
      return NextResponse.json(
        { error: "Only students can submit assignments" },
        { status: 403 }
      );
    }

    const userId = (session.user as { id: string }).id;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const assignmentId = formData.get("assignmentId") as string | null;

    if (!file || !assignmentId) {
      return NextResponse.json(
        { error: "File and assignment ID are required" },
        { status: 400 }
      );
    }

    // Validate file type
    const fileName = file.name;
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx", "txt"].includes(ext || "")) {
      return NextResponse.json(
        { error: "Only PDF, DOCX, and TXT files are allowed" },
        { status: 400 }
      );
    }

    // Check for existing submission
    const existingSubmission = await db.submission.findFirst({
      where: {
        assignmentId,
        studentId: userId,
      },
    });

    if (existingSubmission) {
      return NextResponse.json(
        { error: "You have already submitted this assignment" },
        { status: 409 }
      );
    }

    // Get the assignment
    const assignment = await db.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    // Extract text from file based on type
    let content = "";

    if (ext === "txt") {
      content = await file.text();
    } else if (ext === "pdf") {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        // Dynamic import for pdf-parse
        const pdfParse = (await import("pdf-parse")).default;
        const pdfData = await pdfParse(buffer);
        content = pdfData.text || "";
      } catch (err) {
        console.error("PDF parsing error:", err);
        return NextResponse.json(
          { error: "Failed to parse PDF file. Please try a different format." },
          { status: 400 }
        );
      }
    } else if (ext === "docx") {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ arrayBuffer });
        content = result.value || "";
      } catch (err) {
        console.error("DOCX parsing error:", err);
        return NextResponse.json(
          { error: "Failed to parse DOCX file. Please try a different format." },
          { status: 400 }
        );
      }
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Could not extract any text from the file. The file may be empty or corrupted." },
        { status: 400 }
      );
    }

    // Create submission
    const submission = await db.submission.create({
      data: {
        content: content.trim(),
        fileName,
        fileType: ext || "txt",
        assignmentId,
        studentId: userId,
      },
      include: {
        student: { select: { name: true, email: true } },
        assignment: {
          select: {
            id: true,
            title: true,
            totalMarks: true,
          },
        },
      },
    });

    return NextResponse.json(
      { message: "File uploaded successfully", submission },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload assignment. Please try again." },
      { status: 500 }
    );
  }
}