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
      select: { id: true, fullName: true, role: true, branchIds: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: dbUser.id,
        fullName: dbUser.fullName,
        role: dbUser.role || "staff",
        branchIds: dbUser.branchIds || [],
      },
    });
  } catch (error) {
    console.error("[Verify API Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
