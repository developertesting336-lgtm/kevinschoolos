import crypto from "crypto";
import argon2 from "argon2";
import { cookies } from "next/headers";
import prisma from "./prisma";

// Expiry configuration
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes idle timeout
const ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12 hours absolute timeout

// Securely hash password using Argon2id
export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password, {
    type: argon2.argon2id,
  });
}

// Verify password against Argon2id hash
export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    console.error("[Auth] Password verification error:", error);
    return false;
  }
}

// Generate secure SHA-256 hash of a session token
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Create a new session in Postgres and set the HTTP-only cookie
export async function createSession(userId: string): Promise<void> {
  // Generate random secure token
  const token = crypto.randomBytes(32).toString("hex");
  const hashedToken = hashToken(token);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ABSOLUTE_TIMEOUT_MS);
  const lastActiveAt = now;

  // Save session in PostgreSQL
  await prisma.userSession.create({
    data: {
      id: hashedToken,
      userId,
      expiresAt,
      lastActiveAt,
    },
  });

  // Set httpOnly secure cookie
  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: expiresAt,
    path: "/",
  });
}

// Validate session from cookies, returning the user and session details
export async function validateSession(): Promise<{
  userId: string;
  role: string;
} | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if (!token) return null;

    const hashedToken = hashToken(token);

    // Find session in PostgreSQL
    const session = await prisma.userSession.findUnique({
      where: { id: hashedToken },
    });

    if (!session) return null;

    const now = new Date();

    // 1. Verify absolute timeout expiration
    if (now > session.expiresAt) {
      await destroySession();
      return null;
    }

    // 2. Verify idle timeout expiration
    if (now.getTime() - session.lastActiveAt.getTime() > IDLE_TIMEOUT_MS) {
      await destroySession();
      return null;
    }

    // 3. Find User details in Postgres
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      await destroySession();
      return null;
    }

    // 4. Strictly exclude Cleaners from gaining access
    if (user.role?.toLowerCase() === "cleaner") {
      console.warn(
        `[Auth Warning] Blocked Cleaner role user (${user.fullName}) from dashboard access.`,
      );
      await destroySession();
      return null;
    }

    // 5. Update lastActiveAt tracker to slide the idle expiration window
    await prisma.userSession.update({
      where: { id: hashedToken },
      data: { lastActiveAt: now },
    });

    return {
      userId: user.id,
      role: user.role || "staff",
    };
  } catch (error) {
    console.error("[Auth] Session validation error:", error);
    return null;
  }
}

// Destroy session in database and delete the cookie
export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if (token) {
      const hashedToken = hashToken(token);
      await prisma.userSession.deleteMany({
        where: { id: hashedToken },
      });
    }

    cookieStore.set("session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });
  } catch (error) {
    console.error("[Auth] Session destruction error:", error);
  }
}
