import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, hashToken, verifyPassword } from "@/lib/auth";
import { validatePasswordComplexity } from "@/lib/passwordPolicy";
import { auditService } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { token, newPassword } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Reset token is required." },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== "string") {
      return NextResponse.json(
        { error: "New password is required." },
        { status: 400 }
      );
    }

    // 1. Validate password complexity before touching token or DB
    const validationErrors = validatePasswordComplexity(newPassword);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Password does not meet complexity requirements.",
          errors: validationErrors,
        },
        { status: 400 }
      );
    }

    // 2. Hash incoming token and lookup record
    const hashedToken = hashToken(token);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashedToken },
    });

    const now = new Date();

    // 3. Reject if not found, already used, or expired
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < now) {
      auditService.logFailure(
        resetToken ? { id: resetToken.userId } : undefined,
        "PASSWORD_RESET_SUCCESS" as any,
        undefined,
        "Attempted password reset with invalid or expired token.",
        request
      );

      return NextResponse.json(
        { error: "Invalid or expired password reset link." },
        { status: 400 }
      );
    }

    // 3.5. Prevent reusing existing password
    const existingSecret = await prisma.userSecret.findUnique({
      where: { userId: resetToken.userId },
      select: { passwordHash: true },
    });

    if (existingSecret && existingSecret.passwordHash) {
      const isSamePassword = await verifyPassword(existingSecret.passwordHash, newPassword);
      if (isSamePassword) {
        auditService.logFailure(
          { id: resetToken.userId },
          "PASSWORD_RESET_SUCCESS" as any,
          undefined,
          "Attempted password reset using existing password.",
          request
        );

        return NextResponse.json(
          { error: "New password cannot be the same as your existing password." },
          { status: 400 }
        );
      }
    }

    // 4. Hash new password with Argon2id
    const newPasswordHash = await hashPassword(newPassword);

    // 5. Update user password & clear any account lockout
    await prisma.userSecret.upsert({
      where: { userId: resetToken.userId },
      update: {
        passwordHash: newPasswordHash,
        loginAttempts: 0,
        lockoutUntil: null,
      },
      create: {
        userId: resetToken.userId,
        passwordHash: newPasswordHash,
        loginAttempts: 0,
        lockoutUntil: null,
      },
    });

    // 6. Mark token as used
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: now },
    });

    // 7. Invalidate all existing sessions for this user
    await prisma.userSession.deleteMany({
      where: { userId: resetToken.userId },
    });

    // 8. Audit log success
    auditService.log(
      {
        actorId: resetToken.userId,
        action: "PASSWORD_RESET_SUCCESS" as any,
        result: "SUCCESS",
        details: "Password reset completed successfully. Active sessions invalidated.",
      },
      request
    );

    return NextResponse.json(
      { success: true, message: "Password has been reset successfully." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[Reset Password API Error]", error);
    auditService.logFailure(
      undefined,
      "PASSWORD_RESET_SUCCESS" as any,
      undefined,
      `Reset password error: ${error.message}`,
      request
    );
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
