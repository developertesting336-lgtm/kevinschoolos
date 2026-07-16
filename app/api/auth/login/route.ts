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
      auditService.logFailure(
        undefined,
        "LOGIN",
        undefined,
        "Missing email or password.",
        request
      );
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email.trim(),
          mode: "insensitive",
        },
      },
    });

    if (!user) {
      auditService.log({
        actorEmail: email,
        action: "LOGIN",
        result: "FAIL",
        details: "Invalid email or account does not exist.",
      }, request);

      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    if (user.role?.toLowerCase() === "cleaner") {
      auditService.log({
        actorId: user.id,
        actorEmail: user.email,
        role: user.role,
        branchIds: user.branchIds,
        action: "LOGIN",
        result: "FAIL",
        details: "Cleaner role blocked from accessing dashboard.",
      }, request);

      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }
    let secret = await prisma.userSecret.findUnique({
      where: { userId: user.id },
    });

    if (!secret) {
      auditService.log({
        actorId: user.id,
        actorEmail: user.email,
        role: user.role,
        branchIds: user.branchIds,
        action: "LOGIN",
        result: "FAIL",
        details: "Password not set up.",
      }, request);

      return NextResponse.json(
        {
          error:
            "Account exists but password is not set up. Please use setup endpoint.",
        },
        { status: 400 },
      );
    }

    const now = new Date();

    if (secret.lockoutUntil && secret.lockoutUntil > now) {
      const minutesLeft = Math.ceil(
        (secret.lockoutUntil.getTime() - now.getTime()) / (60 * 1000),
      );

      auditService.log({
        actorId: user.id,
        actorEmail: user.email,
        role: user.role,
        branchIds: user.branchIds,
        action: "LOGIN",
        result: "FAIL",
        details: "Account locked out due to multiple failed attempts.",
      }, request);

      return NextResponse.json(
        {
          error: `Account locked due to multiple failed attempts. Try again in ${minutesLeft} minutes.`,
        },
        { status: 403 },
      );
    }

    const isPasswordValid = secret.passwordHash
      ? await verifyPassword(secret.passwordHash, password)
      : false;

    if (!isPasswordValid) {
      const attempts = secret.loginAttempts + 1;
      const lockoutUntil =
        attempts >= MAX_LOGIN_ATTEMPTS
          ? new Date(now.getTime() + LOCKOUT_DURATION_MS)
          : null;

      await prisma.userSecret.update({
        where: { userId: user.id },
        data: {
          loginAttempts: attempts,
          lockoutUntil,
        },
      });

      auditService.log({
        actorId: user.id,
        actorEmail: user.email,
        role: user.role,
        branchIds: user.branchIds,
        action: "LOGIN",
        result: "FAIL",
        details: lockoutUntil ? "Too many failed attempts. Account locked." : "Invalid password entered.",
      }, request);

      if (lockoutUntil) {
        return NextResponse.json(
          { error: "Too many failed attempts. Account locked for 15 minutes." },
          { status: 403 },
        );
      }

      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    await prisma.userSecret.update({
      where: { userId: user.id },
      data: {
        loginAttempts: 0,
        lockoutUntil: null,
      },
    });

    await createSession(user.id);

    auditService.log({
      actorId: user.id,
      actorEmail: user.email,
      role: user.role,
      branchIds: user.branchIds,
      action: "LOGIN",
      result: "SUCCESS",
      details: "User logged in successfully.",
    }, request);

    return NextResponse.json({
      success: true,
      message: "Successfully logged in.",
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("[Login API Error]", error);
    auditService.logFailure(
      undefined,
      "LOGIN",
      undefined,
      `Internal server error during login: ${error.message || String(error)}`,
      request
    );
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
