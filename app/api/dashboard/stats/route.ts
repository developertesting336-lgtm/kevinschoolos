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

    const activeStudents = await prisma.student.count({
      where: { status: { equals: "active", mode: "insensitive" } },
    });
    const totalStudents = await prisma.student.count();

    const activeGroups = await prisma.classGroup.count({
      where: { status: { equals: "active", mode: "insensitive" } },
    });
    const totalGroups = await prisma.classGroup.count();

    const activeEnrollments = await prisma.enrollment.count({
      where: { status: { equals: "active", mode: "insensitive" } },
    });
    const totalEnrollments = await prisma.enrollment.count();

    const totalStaff = await prisma.user.count();
    const teachersCount = await prisma.user.count({
      where: { role: { equals: "teacher", mode: "insensitive" } },
    });

    const branchesCount = await prisma.branch.count();
    const roomsCount = await prisma.room.count();
    const coursesCount = await prisma.course.count();
    const parentsCount = await prisma.parent.count();
    const recentPayments = await prisma.payment.count();

    return NextResponse.json({
      activeStudents,
      totalStudents,
      activeGroups,
      totalGroups,
      activeEnrollments,
      totalEnrollments,
      totalStaff,
      teachersCount,
      branchesCount,
      roomsCount,
      coursesCount,
      parentsCount,
      recentPayments,
    });
  } catch (error) {
    console.error("[Dashboard Stats API Error]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
