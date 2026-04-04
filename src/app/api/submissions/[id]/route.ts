import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

// GET /api/submissions/[id] - Get single submission
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = new PrismaClient();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const submission = await db.submission.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, name: true, email: true } },
        assignment: {
          select: {
            id: true,
            title: true,
            description: true,
            modelAnswer: true,
            totalMarks: true,
            teacher: { select: { name: true } },
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ submission });
  } catch (error) {
    console.error("Error fetching submission:", error);
    return NextResponse.json(
      { error: "Failed to fetch submission" },
      { status: 500 }
    );
  } finally {
    await db.$disconnect();
  }
}

// PATCH /api/submissions/[id] - Update submission (teacher override)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = new PrismaClient();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (userRole !== "TEACHER") {
      return NextResponse.json(
        { error: "Only teachers can update grades" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { teacherGrade, teacherFeedback } = body;

    const submission = await db.submission.update({
      where: { id },
      data: {
        ...(teacherGrade !== undefined && { teacherGrade }),
        ...(teacherFeedback !== undefined && { teacherFeedback }),
      },
      include: {
        student: { select: { name: true, email: true } },
        assignment: {
          select: { id: true, title: true, totalMarks: true },
        },
      },
    });

    return NextResponse.json({
      message: "Grade updated successfully",
      submission,
    });
  } catch (error) {
    console.error("Error updating submission:", error);
    return NextResponse.json(
      { error: "Failed to update grade" },
      { status: 500 }
    );
  } finally {
    await db.$disconnect();
  }
}
