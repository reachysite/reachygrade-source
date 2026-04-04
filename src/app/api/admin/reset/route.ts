import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

type ResetTarget = "teachers" | "students" | "assignments" | "submissions" | "codes";

export async function POST(request: NextRequest) {
  const db = new PrismaClient();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const targets: ResetTarget[] = body.targets || [];

    if (!Array.isArray(targets) || targets.length === 0) {
      return NextResponse.json({ error: "No targets specified" }, { status: 400 });
    }

    const validTargets: ResetTarget[] = ["teachers", "students", "assignments", "submissions", "codes"];
    const invalidTargets = targets.filter((t) => !validTargets.includes(t));
    if (invalidTargets.length > 0) {
      return NextResponse.json({ error: `Invalid targets: ${invalidTargets.join(", ")}` }, { status: 400 });
    }

    let deletedTeachers = 0;
    let deletedStudents = 0;
    let deletedAssignments = 0;
    let deletedSubmissions = 0;
    let deletedCodes = 0;

    const onlyTeachers = targets.includes("teachers") && !targets.includes("students") && !targets.includes("submissions") && !targets.includes("assignments");
    const onlyStudents = targets.includes("students") && !targets.includes("submissions") && !targets.includes("assignments");

    // Step 1: Delete submissions first
    if (targets.includes("submissions") || targets.includes("students") || targets.includes("teachers") || targets.includes("assignments")) {
      if (onlyTeachers) {
        const teacherIds = await db.user.findMany({ where: { role: "TEACHER" }, select: { id: true } });
        const assignmentIds = await db.assignment.findMany({
          where: { teacherId: { in: teacherIds.map((t) => t.id) } },
          select: { id: true },
        });
        if (assignmentIds.length > 0) {
          const result = await db.submission.deleteMany({
            where: { assignmentId: { in: assignmentIds.map((a) => a.id) } },
          });
          deletedSubmissions = result.count;
        }
      } else if (onlyStudents) {
        const studentIds = await db.user.findMany({ where: { role: "STUDENT" }, select: { id: true } });
        if (studentIds.length > 0) {
          const result = await db.submission.deleteMany({
            where: { studentId: { in: studentIds.map((s) => s.id) } },
          });
          deletedSubmissions = result.count;
        }
      } else {
        const result = await db.submission.deleteMany();
        deletedSubmissions = result.count;
      }
    }

    // Step 2: Delete assignments
    if (targets.includes("assignments") || targets.includes("teachers")) {
      if (targets.includes("teachers") && !targets.includes("assignments")) {
        const teacherIds = await db.user.findMany({ where: { role: "TEACHER" }, select: { id: true } });
        if (teacherIds.length > 0) {
          const result = await db.assignment.deleteMany({
            where: { teacherId: { in: teacherIds.map((t) => t.id) } },
          });
          deletedAssignments = result.count;
        }
      } else {
        const result = await db.assignment.deleteMany();
        deletedAssignments = result.count;
      }
    }

    // Step 3: Delete invitation codes
    if (targets.includes("codes") || targets.includes("teachers")) {
      const result = await db.invitationCode.deleteMany();
      deletedCodes = result.count;
    }

    // Step 4: Delete teacher users
    if (targets.includes("teachers")) {
      const result = await db.user.deleteMany({ where: { role: "TEACHER" } });
      deletedTeachers = result.count;
    }

    // Step 5: Delete student users
    if (targets.includes("students")) {
      const result = await db.user.deleteMany({ where: { role: "STUDENT" } });
      deletedStudents = result.count;
    }

    const parts: string[] = [];
    if (deletedTeachers > 0) parts.push(`${deletedTeachers} teachers`);
    if (deletedStudents > 0) parts.push(`${deletedStudents} students`);
    if (deletedAssignments > 0) parts.push(`${deletedAssignments} assignments`);
    if (deletedSubmissions > 0) parts.push(`${deletedSubmissions} submissions`);
    if (deletedCodes > 0) parts.push(`${deletedCodes} invitation codes`);

    return NextResponse.json({
      success: true,
      message: parts.length > 0 ? `Deleted ${parts.join(", ")}` : "Nothing to delete",
      deleted: {
        teachers: deletedTeachers,
        students: deletedStudents,
        assignments: deletedAssignments,
        submissions: deletedSubmissions,
        invitationCodes: deletedCodes,
      },
    });
  } catch (error) {
    console.error("Error resetting data:", error);
    return NextResponse.json({ error: "Failed to reset data" }, { status: 500 });
  } finally {
    await db.$disconnect();
  }
}