import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

// GET /api/payments/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId }
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const userRole = dbUser.role || "staff";
    const normRole = normalizeRole(userRole);

    // Allowed roles: Owner, Office Admin, Finance
    if (!["owner", "office_admin", "finance"].includes(normRole)) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions." }, { status: 403 });
    }

    const { id } = await params;
    const payment = await prisma.payment.findUnique({
      where: { id }
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found." }, { status: 404 });
    }

    return NextResponse.json(payment);
  } catch (error: any) {
    console.error("[Single Payment GET Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}
