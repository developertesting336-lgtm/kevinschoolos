import { NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({
      userId: session.userId,
      role: session.role,
    });
  } catch (error) {
    console.error("[Auth/Me Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}