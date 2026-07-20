import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";
import { auditService } from "@/lib/audit";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      auditService.logFailure(undefined, "LOGIN", undefined, "Missing email or password.", request);
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    // OPTIMIZATION: Single query with select to fetch only needed columns
    const user = await prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: "insensitive" } },
      select: { id: true, email: true, role: true, branchIds: true },
    });

    if (!user) {
      // Fire-and-forget audit — don't block the response
      auditService.log({ actorEmail: email, action: "LOGIN", result: "FAIL", details: "Invalid email." }, request);
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (user.role?.toLowerCase() === "cleaner") {
      auditService.log({ actorId: user.id, actorEmail: user.email, role: user.role, branchIds: user.branchIds, action: "LOGIN", result: "FAIL", details: "Cleaner blocked." }, request);
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    // OPTIMIZATION: Single query with select for secret
    const secret = await prisma.userSecret.findUnique({
      where: { userId: user.id },
      select: { passwordHash: true, loginAttempts: true, lockoutUntil: true },
    });

    if (!secret || !secret.passwordHash) {
      auditService.log({ actorId: user.id, actorEmail: user.email, role: user.role, action: "LOGIN", result: "FAIL", details: "Password not set up." }, request);
      return NextResponse.json({ error: "Account exists but password is not set up." }, { status: 400 });
    }

    const now = new Date();

    // Check lockout
    if (secret.lockoutUntil && secret.lockoutUntil > now) {
      const minutesLeft = Math.ceil((secret.lockoutUntil.getTime() - now.getTime()) / (60 * 1000));
      auditService.log({ actorId: user.id, actorEmail: user.email, role: user.role, action: "LOGIN", result: "FAIL", details: "Account locked." }, request);
      return NextResponse.json({ error: `Account locked. Try again in ${minutesLeft} minutes.` }, { status: 403 });
    }

    // Verify password (CPU-intensive but unavoidable)
    const isPasswordValid = await verifyPassword(secret.passwordHash, password);

    if (!isPasswordValid) {
      const attempts = secret.loginAttempts + 1;
      const lockoutUntil = attempts >= MAX_LOGIN_ATTEMPTS ? new Date(now.getTime() + LOCKOUT_DURATION_MS) : null;

      // OPTIMIZATION: Single update query
      await prisma.userSecret.update({
        where: { userId: user.id },
        data: { loginAttempts: attempts, lockoutUntil },
      });

      auditService.log({ actorId: user.id, actorEmail: user.email, role: user.role, action: "LOGIN", result: "FAIL", details: lockoutUntil ? "Account locked." : "Invalid password." }, request);

      if (lockoutUntil) {
        return NextResponse.json({ error: "Too many failed attempts. Account locked for 15 minutes." }, { status: 403 });
      }
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Success: reset attempts and create session in parallel
    await Promise.all([
      prisma.userSecret.update({
        where: { userId: user.id },
        data: { loginAttempts: 0, lockoutUntil: null },
      }),
      createSession(user.id),
    ]);

    // Fire-and-forget audit
    auditService.log({ actorId: user.id, actorEmail: user.email, role: user.role, branchIds: user.branchIds, action: "LOGIN", result: "SUCCESS", details: "Login successful." }, request);

    // OPTIMIZATION: Return minimal payload — no full user object
    return NextResponse.json({
      success: true,
      message: "Successfully logged in.",
    });
  } catch (error: any) {
    console.error("[Login API Error]", error);
    auditService.logFailure(undefined, "LOGIN", undefined, `Login error: ${error.message}`, request);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}