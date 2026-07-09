import { NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { fullName: true, email: true, role: true },
    });
    console.log("user info ", dbUser);
    return NextResponse.json({
      fullName: dbUser?.fullName || null,
      email: dbUser?.email || null,
      role: dbUser?.role || null,
    });
  } catch (error) {
    console.error("[Dashboard User API Error]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
