import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/assignments - List assignments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    const userId = (session.user as { id: string }).id;

    if (userRole === "TEACHER") {
      // Teachers see their own assignments with submission counts
      const assignments = await db.assignment.findMany({
        where: { teacherId: userId },
        include: {
          teacher: { select: { name: true, email: true } },
          _count: { select: { submissions: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ assignments });
    } else {
      // Students see all active assignments
      const assignments = await db.assignment.findMany({
        include: {
          teacher: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      // Add submission status for each assignment
      const assignmentsWithStatus = await Promise.all(
        assignments.map(async (assignment) => {
          const submission = await db.submission.findFirst({
            where: {
              assignmentId: assignment.id,
              studentId: userId,
            },
            select: {
              id: true,
              autoGrade: true,
              teacherGrade: true,
              createdAt: true,
            },
          });
          return {
            ...assignment,
            hasSubmitted: !!submission,
            submission,
          };
        })
      );

      return NextResponse.json({ assignments: assignmentsWithStatus });
    }
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignments" },
      { status: 500 }
    );
  }
}

// POST /api/assignments - Create assignment (teacher only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (userRole !== "TEACHER") {
      return NextResponse.json(
        { error: "Only teachers can create assignments" },
        { status: 403 }
      );
    }

    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const { title, description, modelAnswer, dueDate, totalMarks } = body;

    if (!title || !description || !modelAnswer) {
      return NextResponse.json(
        { error: "Title, description, and model answer are required" },
        { status: 400 }
      );
    }

    const assignment = await db.assignment.create({
      data: {
        title,
        description,
        modelAnswer,
        dueDate: dueDate ? new Date(dueDate) : null,
        totalMarks: totalMarks || 100,
        teacherId: userId,
      },
      include: {
        teacher: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json(
      { message: "Assignment created successfully", assignment },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating assignment:", error);
    return NextResponse.json(
      { error: "Failed to create assignment" },
      { status: 500 }
    );
  }
}
