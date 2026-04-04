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

    const userRole = (session.user as { role: string }).role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            assignments: true,
            submissions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // For teachers, count submissions received on their assignments
    const teacherIds = users.filter((u) => u.role === "TEACHER").map((u) => u.id);

    let teacherSubmissionCounts: Record<string, number> = {};
    if (teacherIds.length > 0) {
      const submissionCounts = await db.submission.groupBy({
        by: ["assignmentId"],
        where: {
          assignment: { teacherId: { in: teacherIds } },
        },
        _count: { id: true },
      });

      // Get assignment->teacher mapping
      const assignments = await db.assignment.findMany({
        where: { teacherId: { in: teacherIds } },
        select: { id: true, teacherId: true },
      });

      const assignmentTeacherMap: Record<string, string> = {};
      for (const a of assignments) {
        assignmentTeacherMap[a.id] = a.teacherId;
      }

      for (const sc of submissionCounts) {
        const teacherId = assignmentTeacherMap[sc.assignmentId];
        if (teacherId) {
          teacherSubmissionCounts[teacherId] = (teacherSubmissionCounts[teacherId] || 0) + sc._count.id;
        }
      }
    }

    const enrichedUsers = users.map((u) => ({
      ...u,
      receivedSubmissions: u.role === "TEACHER" ? (teacherSubmissionCounts[u.id] || 0) : undefined,
    }));

    return NextResponse.json({ users: enrichedUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  } finally {
    await db.$disconnect();
  }
}
