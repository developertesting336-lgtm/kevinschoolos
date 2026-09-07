import { NextResponse } from "next/server";
import { touchSession, validateSession } from "@/lib/auth";

export async function POST() {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await touchSession();
    return NextResponse.json({ success: true, timestamp: Date.now() });
  } catch (error) {
    console.error("[Touch Route Error]", error);
    return NextResponse.json({ error: "Failed to touch session" }, { status: 500 });
  }
}
