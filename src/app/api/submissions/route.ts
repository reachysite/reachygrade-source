import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/submissions - List submissions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    const userId = (session.user as { id: string }).id;
    const searchParams = request.nextUrl.searchParams;
    const assignmentId = searchParams.get("assignmentId");

    if (userRole === "TEACHER") {
      // Teachers can filter by assignment
      const where: Record<string, unknown> = {};
      if (assignmentId) {
        where.assignmentId = assignmentId;
      }

      const submissions = await db.submission.findMany({
        where,
        include: {
          student: { select: { id: true, name: true, email: true } },
          assignment: {
            select: {
              id: true,
              title: true,
              totalMarks: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ submissions });
    } else {
      // Students see only their own submissions
      const where: Record<string, unknown> = { studentId: userId };
      if (assignmentId) {
        where.assignmentId = assignmentId;
      }

      const submissions = await db.submission.findMany({
        where,
        include: {
          assignment: {
            select: {
              id: true,
              title: true,
              totalMarks: true,
              teacher: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ submissions });
    }
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}

// POST /api/submissions - Create submission (student only)
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

    // Get the assignment with model answer
    const assignment = await db.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    // Create submission (initially without grade)
    const submission = await db.submission.create({
      data: {
        content,
        fileName,
        fileType: fileType || "txt",
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
      { message: "Assignment submitted successfully", submission },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating submission:", error);
    return NextResponse.json(
      { error: "Failed to submit assignment" },
      { status: 500 }
    );
  }
}
