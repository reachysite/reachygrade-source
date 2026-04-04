import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

function getDb() {
  return new PrismaClient();
}

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "RG-";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET /api/invitation-codes - List all codes (admin only)
export async function GET() {
  const db = getDb();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const codes = await db.invitationCode.findMany({
      include: {
        creator: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ codes });
  } catch (error) {
    console.error("Error fetching codes:", error);
    return NextResponse.json({ error: "Failed to fetch codes" }, { status: 500 });
  } finally {
    await db.$disconnect();
  }
}

// POST /api/invitation-codes - Create new code (admin only)
export async function POST(request: Request) {
  const db = getDb();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const { maxUses, expiresInDays } = body;

    const code = generateCode();
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const invitationCode = await db.invitationCode.create({
      data: {
        code,
        maxUses: maxUses || 1,
        createdBy: userId,
        expiresAt,
      },
      include: {
        creator: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json({ code: invitationCode }, { status: 201 });
  } catch (error) {
    console.error("Error creating code:", error);
    return NextResponse.json({ error: "Failed to create code" }, { status: 500 });
  } finally {
    await db.$disconnect();
  }
}

// PATCH /api/invitation-codes - Update code (admin only)
export async function PATCH(request: Request) {
  const db = getDb();
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
    const { id, isActive, maxUses } = body;

    const code = await db.invitationCode.update({
      where: { id },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(maxUses !== undefined && { maxUses }),
      },
    });

    return NextResponse.json({ code });
  } catch (error) {
    console.error("Error updating code:", error);
    return NextResponse.json({ error: "Failed to update code" }, { status: 500 });
  } finally {
    await db.$disconnect();
  }
}

// DELETE /api/invitation-codes - Delete code (admin only)
export async function DELETE(request: Request) {
  const db = getDb();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Code ID required" }, { status: 400 });
    }

    await db.invitationCode.delete({ where: { id } });
    return NextResponse.json({ message: "Code deleted" });
  } catch (error) {
    console.error("Error deleting code:", error);
    return NextResponse.json({ error: "Failed to delete code" }, { status: 500 });
  } finally {
    await db.$disconnect();
  }
}
