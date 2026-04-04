import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

export async function GET() {
  const db = new PrismaClient();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const userRole = (session.user as { role: string }).role;

    if (userRole !== "STUDENT") {
      return NextResponse.json(
        { error: "Only students can access this endpoint" },
        { status: 403 }
      );
    }

    const totalAssignments = await db.assignment.count();

    const mySubmissions = await db.submission.findMany({
      where: { studentId: userId },
      include: {
        assignment: { select: { title: true, totalMarks: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Use teacherGrade if available, otherwise fall back to autoGrade
    const gradedSubmissions = mySubmissions.filter(
      (s) => s.teacherGrade !== null || s.autoGrade !== null
    );

    // Calculate average using the best available grade (teacher override takes priority)
    const avgGrade =
      gradedSubmissions.length > 0
        ? Math.round(
            (gradedSubmissions.reduce(
              (acc, s) => {
                const finalGrade = s.teacherGrade ?? s.autoGrade ?? 0;
                const totalMarks = s.assignment?.totalMarks || 100;
                return acc + (finalGrade / totalMarks) * 100;
              },
              0
            ) /
              gradedSubmissions.length) *
              10
          ) / 10
        : 0;

    const submittedAssignmentIds = mySubmissions.map((s) => s.assignmentId);
    const pendingAssignments = await db.assignment.findMany({
      where: { id: { notIn: submittedAssignmentIds } },
      select: { id: true, title: true, dueDate: true },
      take: 5,
    });

    return NextResponse.json({
      analytics: {
        totalAssignments,
        submittedCount: mySubmissions.length,
        gradedCount: gradedSubmissions.length,
        pendingCount: totalAssignments - mySubmissions.length,
        averageGrade: avgGrade,
        recentSubmissions: mySubmissions.slice(0, 5),
        pendingAssignments,
      },
    });
  } catch (error) {
    console.error("Error fetching student analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  } finally {
    await db.$disconnect();
  }
}
