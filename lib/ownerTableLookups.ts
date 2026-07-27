import prisma from "@/lib/prisma";

export interface OwnerTableLookups {
  parents: Record<string, string>;
  students: Record<string, string>;
  users: Record<string, string>;
  branches: Record<string, string>;
  classGroups: Record<string, string>;
  rooms: Record<string, string>;
  courses: Record<string, string>;
  enrollments: Record<string, string>;
  leads: Record<string, string>;
  tuitionPlans: Record<string, string>;
}

export async function resolveOwnerTableLookups(records: any[]): Promise<OwnerTableLookups> {
  if (!Array.isArray(records) || records.length === 0) {
    return {
      parents: {},
      students: {},
      users: {},
      branches: {},
      classGroups: {},
      rooms: {},
      courses: {},
      enrollments: {},
      leads: {},
      tuitionPlans: {},
    };
  }

  const collectIds = (keys: string[]): string[] => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (!r) return;
      keys.forEach((k) => {
        const val = r[k];
        if (Array.isArray(val)) {
          val.forEach((item) => {
            if (typeof item === "string" && item.trim()) set.add(item.trim());
          });
        } else if (typeof val === "string" && val.trim()) {
          set.add(val.trim());
        }
      });
    });
    return Array.from(set);
  };

  const parentIds = collectIds(["parentIds", "parentId"]);
  const studentIds = collectIds(["studentIds", "studentId"]);
  const userIds = collectIds(["userIds", "userId", "ownerIds", "ownerId", "teacherIds", "teacherId", "staffIds", "staffId"]);
  const branchIds = collectIds(["branchIds", "branchId"]);
  const classGroupIds = collectIds(["classGroupIds", "classGroupId"]);
  const roomIds = collectIds(["roomIds", "roomId"]);
  const courseIds = collectIds(["courseIds", "courseId"]);
  const enrollmentIds = collectIds(["enrollmentIds", "enrollmentId"]);
  const leadIds = collectIds(["leadIds", "leadId"]);
  const tuitionPlanIds = collectIds(["tuitionPlanIds", "tuitionPlanId"]);

  const [
    parents,
    students,
    users,
    branches,
    classGroups,
    rooms,
    courses,
    enrollments,
    leads,
    tuitionPlans,
  ] = await Promise.all([
    parentIds.length ? prisma.parent.findMany({ where: { id: { in: parentIds } }, select: { id: true, parentName: true } }) : [],
    studentIds.length ? prisma.student.findMany({ where: { id: { in: studentIds } }, select: { id: true, studentName: true } }) : [],
    userIds.length ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true, email: true } }) : [],
    branchIds.length ? prisma.branch.findMany({ where: { id: { in: branchIds } }, select: { id: true, name: true } }) : [],
    classGroupIds.length ? prisma.classGroup.findMany({ where: { id: { in: classGroupIds } }, select: { id: true, groupName: true } }) : [],
    roomIds.length ? prisma.room.findMany({ where: { id: { in: roomIds } }, select: { id: true, roomName: true } }) : [],
    courseIds.length ? prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, courseName: true } }) : [],
    enrollmentIds.length ? prisma.enrollment.findMany({ where: { id: { in: enrollmentIds } }, select: { id: true, enrollmentId: true } }) : [],
    leadIds.length ? prisma.lead.findMany({ where: { id: { in: leadIds } }, select: { id: true, leadName: true } }) : [],
    tuitionPlanIds.length ? prisma.tuitionPlan.findMany({ where: { id: { in: tuitionPlanIds } }, select: { id: true, planName: true } }) : [],
  ]);

  return {
    parents: Object.fromEntries(parents.map((p) => [p.id, p.parentName || p.id])),
    students: Object.fromEntries(students.map((s) => [s.id, s.studentName || s.id])),
    users: Object.fromEntries(users.map((u) => [u.id, u.fullName || u.email || u.id])),
    branches: Object.fromEntries(branches.map((b) => [b.id, b.name || b.id])),
    classGroups: Object.fromEntries(classGroups.map((cg) => [cg.id, cg.groupName || cg.id])),
    rooms: Object.fromEntries(rooms.map((r) => [r.id, r.roomName || r.id])),
    courses: Object.fromEntries(courses.map((c) => [c.id, c.courseName || c.id])),
    enrollments: Object.fromEntries(enrollments.map((e) => [e.id, e.enrollmentId || e.id])),
    leads: Object.fromEntries(leads.map((l) => [l.id, l.leadName || l.id])),
    tuitionPlans: Object.fromEntries(tuitionPlans.map((tp) => [tp.id, tp.planName || tp.id])),
  };
}
