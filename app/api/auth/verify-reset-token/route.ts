import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashToken } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Token parameter is missing." },
        { status: 400 }
      );
    }

    const hashedToken = hashToken(token);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashedToken },
    });

    const now = new Date();

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < now) {
      return NextResponse.json(
        { valid: false, error: "Invalid or expired password reset link." },
        { status: 200 }
      );
    }

    return NextResponse.json({ valid: true }, { status: 200 });
  } catch (error: any) {
    console.error("[Verify Reset Token Error]", error);
    return NextResponse.json(
      { valid: false, error: "Failed to verify token." },
      { status: 500 }
    );
  }
}
