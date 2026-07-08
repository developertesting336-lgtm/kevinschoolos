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

    const branchesList = await prisma.branch.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(branchesList);
  } catch (error) {
    console.error("[Dashboard Branches API Error]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
