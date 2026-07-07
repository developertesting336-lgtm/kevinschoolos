import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    await destroySession();
    const requestUrl = new URL(request.url);
    const loginUrl = new URL("/login", requestUrl.origin);
    return NextResponse.redirect(loginUrl, { status: 303 });
  } catch (error) {
    console.error("[Logout Error]", error);
    return NextResponse.json({ error: "Failed to log out" }, { status: 500 });
  }
}
