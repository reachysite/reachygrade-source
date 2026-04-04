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

    const submissions = await db.submission.findMany({
      include: {
        student: { select: { id: true, name: true, email: true } },
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
  } catch (error) {
    console.error("Error fetching admin submissions:", error);
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  } finally {
    await db.$disconnect();
  }
}
