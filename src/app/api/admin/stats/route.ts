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

    const [totalStudents, totalTeachers, totalCodes, activeCodes, totalAssignments, totalSubmissions] = await Promise.all([
      db.user.count({ where: { role: "STUDENT" } }),
      db.user.count({ where: { role: "TEACHER" } }),
      db.invitationCode.count(),
      db.invitationCode.count({ where: { isActive: true } }),
      db.assignment.count(),
      db.submission.count(),
    ]);

    return NextResponse.json({
      stats: { totalStudents, totalTeachers, totalCodes, activeCodes, totalAssignments, totalSubmissions },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  } finally {
    await db.$disconnect();
  }
}
