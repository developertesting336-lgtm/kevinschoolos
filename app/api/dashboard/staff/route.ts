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

    const staffList = await prisma.user.findMany({
      take: 8,
      orderBy: { fullName: "asc" },
    });

    return NextResponse.json(staffList);
  } catch (error) {
    console.error("[Dashboard Staff API Error]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
