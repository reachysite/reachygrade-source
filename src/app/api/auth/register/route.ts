import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, role, invitationCode } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (!["STUDENT", "TEACHER"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be STUDENT or TEACHER" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // ---- TEACHER REGISTRATION: Require valid invitation code ----
    if (role === "TEACHER") {
      if (!invitationCode || !invitationCode.trim()) {
        return NextResponse.json(
          { error: "An invitation code is required to register as a teacher" },
          { status: 400 }
        );
      }

      const code = await db.invitationCode.findUnique({
        where: { code: invitationCode.trim().toUpperCase() },
      });

      if (!code) {
        return NextResponse.json(
          { error: "Invalid invitation code. Please contact your administrator." },
          { status: 403 }
        );
      }

      if (!code.isActive) {
        return NextResponse.json(
          { error: "This invitation code has been deactivated." },
          { status: 403 }
        );
      }

      if (code.expiresAt && new Date() > code.expiresAt) {
        return NextResponse.json(
          { error: "This invitation code has expired." },
          { status: 403 }
        );
      }

      if (code.usedCount >= code.maxUses) {
        return NextResponse.json(
          { error: "This invitation code has reached its usage limit." },
          { status: 403 }
        );
      }

      // Increment usage count
      await db.invitationCode.update({
        where: { id: code.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "STUDENT",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json(
      { message: "Account created successfully", user },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
