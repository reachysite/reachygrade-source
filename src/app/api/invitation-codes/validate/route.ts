import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// POST /api/invitation-codes/validate - Validate a code (public, for registration)
export async function POST(request: NextRequest) {
  const db = new PrismaClient();
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ valid: false, error: "Code is required" });
    }

    const invitationCode = await db.invitationCode.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!invitationCode) {
      return NextResponse.json({ valid: false, error: "Invalid invitation code" });
    }

    if (!invitationCode.isActive) {
      return NextResponse.json({ valid: false, error: "This code has been deactivated" });
    }

    if (invitationCode.expiresAt && new Date() > invitationCode.expiresAt) {
      return NextResponse.json({ valid: false, error: "This code has expired" });
    }

    if (invitationCode.usedCount >= invitationCode.maxUses) {
      return NextResponse.json({ valid: false, error: "This code has reached its usage limit" });
    }

    return NextResponse.json({ valid: true, message: "Code is valid" });
  } catch (error) {
    console.error("Error validating code:", error);
    return NextResponse.json({ valid: false, error: "Validation failed" }, { status: 500 });
  } finally {
    await db.$disconnect();
  }
}
