import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/teacher/sessions/[sessionId]/notes
 * Phase 1/2: read-only. Stubbed for Phase 3+.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Saving notes isn't enabled yet — this is a preview. Phase 3+ will enable writes." },
    { status: 403 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Phase 1/2 is read-only. Writes are blocked." },
    { status: 403 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Phase 1/2 is read-only. Writes are blocked." },
    { status: 403 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Phase 1/2 is read-only. Writes are blocked." },
    { status: 403 }
  );
}