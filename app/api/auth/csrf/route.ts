import { NextResponse } from "next/server";
import { generateCsrfToken, attachCsrfCookie } from "@/lib/csrf";

export async function GET() {
  const token = generateCsrfToken();
  const response = NextResponse.json({ csrfToken: token });
  attachCsrfCookie(response, token);
  return response;
}
