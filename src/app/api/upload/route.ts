import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const maxDuration = 30;

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

    const body = await request.json();
    const { assignmentId, content, fileName, fileType } = body;

    if (!assignmentId || !content || !fileName) {
      return NextResponse.json(
        { error: "Assignment ID, content, and file name are required" },
        { status: 400 }
      );
    }

    if (!content.trim()) {
      return NextResponse.json(
        { error: "File content is empty." },
        { status: 400 }
      );
    }

    const existingSubmission = await db.submission.findFirst({
      where: { assignmentId, studentId: userId },
    });

    if (existingSubmission) {
      return NextResponse.json(
        { error: "You have already submitted this assignment" },
        { status: 409 }
      );
    }

    const assignment = await db.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    const submission = await db.submission.create({
      data: {
        content: content.trim(),
        fileName,
        fileType: fileType || "txt",
        assignmentId,
        studentId: userId,
      },
      include: {
        student: { select: { name: true, email: true } },
        assignment: {
          select: { id: true, title: true, totalMarks: true },
        },
      },
    });

    return NextResponse.json(
      { message: "File uploaded successfully", submission },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload assignment. Please try again." },
      { status: 500 }
    );
  }
}