import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;

    if (userRole !== "TEACHER") {
      return NextResponse.json(
        { error: "Only teachers can access analytics" },
        { status: 403 }
      );
    }

    const teacherId = (session.user as { id: string }).id;

    const totalAssignments = await db.assignment.count({
      where: { teacherId },
    });

    const totalSubmissions = await db.submission.count({
      where: { assignment: { teacherId } },
    });

    const totalStudents = await db.user.count({
      where: { role: "STUDENT" },
    });

    const recentSubmissions = await db.submission.findMany({
      where: { assignment: { teacherId } },
      include: {
        student: { select: { name: true, email: true } },
        assignment: { select: { title: true, totalMarks: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Fetch both teacherGrade and autoGrade to compute effective grades (teacherGrade takes priority)
    const gradedSubmissions = await db.submission.findMany({
      where: {
        assignment: { teacherId },
        OR: [
          { autoGrade: { not: null } },
          { teacherGrade: { not: null } },
        ],
      },
      select: { autoGrade: true, teacherGrade: true },
    });

    // Calculate average using teacherGrade ?? autoGrade
    let gradeSum = 0;
    let gradeCount = 0;
    gradedSubmissions.forEach((s) => {
      const effectiveGrade = s.teacherGrade ?? s.autoGrade;
      if (effectiveGrade !== null) {
        gradeSum += effectiveGrade;
        gradeCount++;
      }
    });
    const averageGrade =
      gradeCount > 0 ? Math.round((gradeSum / gradeCount) * 10) / 10 : 0;

    // Calculate grade distribution using teacherGrade ?? autoGrade
    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    gradedSubmissions.forEach((s) => {
      const grade = s.teacherGrade ?? s.autoGrade ?? 0;
      if (grade >= 80) gradeDistribution.A++;
      else if (grade >= 60) gradeDistribution.B++;
      else if (grade >= 40) gradeDistribution.C++;
      else if (grade >= 20) gradeDistribution.D++;
      else gradeDistribution.F++;
    });

    return NextResponse.json({
      analytics: {
        totalAssignments,
        totalSubmissions,
        averageGrade,
        totalStudents,
        gradeDistribution,
        recentSubmissions,
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
