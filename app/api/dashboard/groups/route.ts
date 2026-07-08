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

    const dbGroups = await prisma.classGroup.findMany({
      where: { status: { equals: "active", mode: "insensitive" } },
      take: 10,
    });

    const dbEnrollments = await prisma.enrollment.findMany({
      where: { status: { equals: "active", mode: "insensitive" } },
    });

    const groupData = dbGroups.map((group) => {
      const studentCount = dbEnrollments.filter((e) =>
        e.classGroupIds.includes(group.id),
      ).length;

      return {
        id: group.id,
        name: group.groupName,
        studentCount,
        capacity: group.capacity || 8,
      };
    });

    return NextResponse.json(groupData);
  } catch (error) {
    console.error("[Dashboard Groups API Error]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
