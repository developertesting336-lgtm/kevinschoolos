import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { hashToken } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { auditService } from "@/lib/audit";
import { isRateLimited } from "@/lib/rateLimit";

const GENERIC_RESPONSE = {
  success: true,
  message: "If that email exists, a reset link has been sent.",
};

function getPublicOrigin(request: Request): string {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL;
  }
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || (host && !host.includes("localhost") && !host.includes("127.0.0.1") ? "https" : "http");
  if (host) {
    return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  try {
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    // Rate limiting: 3 requests per 15 mins per IP
    if (isRateLimited(`forgot_pass_${ipAddress}`, 3, 15 * 60 * 1000)) {
      auditService.logFailure(undefined, "PASSWORD_RESET_REQUESTED" as any, undefined, "Rate limit exceeded for password reset.", request);
      return NextResponse.json(
        { error: "Too many reset requests. Please try again in 15 minutes." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = body.email;

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "Email address is required." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim();

    // Look up user (case-insensitive)
    const user = await prisma.user.findFirst({
      where: { email: { equals: trimmedEmail, mode: "insensitive" } },
      select: { id: true, email: true, role: true },
    });

    // If user exists and is NOT a cleaner, process reset token
    if (user && user.email && user.role?.toLowerCase() !== "cleaner") {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

      // Invalidate prior unused tokens for this user
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: now },
      });

      // Generate raw token and hash it
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashToken(rawToken);

      // Create new reset token record
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          requestIp: ipAddress,
        },
      });

      // Build reset URL
      const baseUrl = getPublicOrigin(request);
      const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

      // Send email via Nodemailer
      try {
        await sendPasswordResetEmail(user.email, resetUrl);
        auditService.log(
          {
            actorId: user.id,
            actorEmail: user.email,
            role: user.role,
            action: "PASSWORD_RESET_REQUESTED" as any,
            result: "SUCCESS",
            details: "Reset link sent.",
          },
          request
        );
      } catch (mailError: any) {
        console.error("[Mailer Error] Failed to send password reset email:", mailError);
        auditService.logFailure(
          { id: user.id, email: user.email, role: user.role },
          "PASSWORD_RESET_REQUESTED" as any,
          undefined,
          `Failed to dispatch email: ${mailError.message}`,
          request
        );
      }
    }

    // Always return generic 200 response to prevent email enumeration
    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  } catch (error: any) {
    console.error("[Forgot Password API Error]", error);
    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  }
}
