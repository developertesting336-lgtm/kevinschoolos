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

    const coursesCount = await prisma.course.count();
    const coursesList = await prisma.course.findMany({
      take: 6,
      orderBy: { courseName: "asc" },
    });

    return NextResponse.json({
      count: coursesCount,
      courses: coursesList,
    });
  } catch (error) {
    console.error("[Dashboard Courses API Error]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
