"use client";

import { useState, useEffect } from "react";
import { SearchBar } from "./SearchBar";
import { Filters } from "./Filters";
import { EnrollmentTable } from "./EnrollmentTable";
import { EnrollmentCard } from "./EnrollmentCard";
import { OnboardingDrawer } from "./OnboardingDrawer";
import { PaginationControls } from "@/components/dashboard/PaginationControls";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ClipboardCheck } from "lucide-react";

interface EnrollmentData {
  id: string;
  enrollmentId: string;
  enrollDate: string | Date | null;
  status: string | null;
  studentIds: string[];
  classGroupIds: string[];
  tuitionPlanIds: string[];
  branchIds: string[];
  trialFeeDeducted: boolean;
  contractSigned: boolean;
  contractDate: string | Date | null;
  hdSystemRegistered: boolean;
  appCredentialsIssued: boolean;
  scheduleDelivered: boolean;
  calendarDelivered: boolean;
  appInstructionsDelivered: boolean;
  audioRecommendationsDelivered: boolean;
  firstLessonConfirmed: boolean;
  firstLessonDate: string | Date | null;
  onboardingStatus: string | null;
}

interface StudentData {
  id: string;
  studentName: string;
  dateOfBirth?: string | Date | null;
  gender?: string | null;
  notes?: string | null;
  parentIds?: string[];
}

interface ParentData {
  id: string;
  parentName: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
}

interface UserData {
  id: string;
  fullName: string;
}

interface BranchData {
  id: string;
  name: string;
}

interface CourseData {
  id: string;
  courseName: string;
}

interface ClassGroupData {
  id: string;
  groupName: string;
  courseIds: string[];
  teacherIds: string[];
}

interface OnboardingClientProps {
  enrollments: EnrollmentData[];
  students: StudentData[];
  parents: ParentData[];
  users: UserData[];
  branches: BranchData[];
  courses: CourseData[];
  classGroups: ClassGroupData[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function OnboardingClient({
  enrollments,
  students,
  parents,
  users,
  branches,
  courses,
  classGroups,
  pagination,
}: OnboardingClientProps) {
  const [selectedEnrollment, setSelectedEnrollment] = useState<EnrollmentData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Trigger POST audit logging whenever an onboarding record is selected and drawer is opened
  useEffect(() => {
    if (selectedEnrollment) {
      fetch("/api/onboarding/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enrollmentId: selectedEnrollment.id }),
      }).catch((err) => {
        console.error("[Audit Service] Failed to trigger onboarding audit endpoint", err);
      });
    }
  }, [selectedEnrollment]);

  const handleSelectEnrollment = (enrollment: EnrollmentData) => {
    setSelectedEnrollment(enrollment);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setSelectedEnrollment(null);
    setIsDrawerOpen(false);
  };

  // Helper mappings
  const branchNameMap = new Map(branches.map((b) => [b.id, b.name]));
  const studentNameMap = new Map(students.map((s) => [s.id, s.studentName]));

  // Dynamic lookup mappings for class groups, courses, and teachers
  const parentNameMap = new Map<string, string>();
  const courseNameMap = new Map<string, string>();
  const staffNameMap = new Map<string, string>();

  enrollments.forEach((enroll) => {
    // 1. Resolve Parent Name
    const sId = enroll.studentIds[0] || "";
    const stud = students.find((s) => s.id === sId);
    const parentIds = stud?.parentIds;
    if (parentIds && parentIds.length > 0) {
      const parentRecord = parents.find((pr) => pr.id === parentIds[0]);
      if (parentRecord) {
        parentNameMap.set(enroll.id, parentRecord.parentName);
      }
    } else {
      parentNameMap.set(enroll.id, "—");
    }

    // 2. Resolve Class Group, Course Name, and Teacher name
    const cgId = enroll.classGroupIds[0] || "";
    const cg = classGroups.find((cgRecord) => cgRecord.id === cgId);
    if (cg) {
      const course = courses.find((c) => cg.courseIds.includes(c.id));
      courseNameMap.set(enroll.id, course ? course.courseName : "—");

      const teacher = users.find((u) => cg.teacherIds.includes(u.id));
      staffNameMap.set(enroll.id, teacher ? teacher.fullName : "Unassigned");
    } else {
      courseNameMap.set(enroll.id, "—");
      staffNameMap.set(enroll.id, "Unassigned");
    }
  });

  // Resolve detail drawer fields
  const activeStudent = selectedEnrollment && selectedEnrollment.studentIds.length > 0
    ? students.find((s) => s.id === selectedEnrollment.studentIds[0]) || null
    : null;

  const activeStudentParentIds = activeStudent?.parentIds;
  const activeParent = activeStudentParentIds && activeStudentParentIds.length > 0
    ? parents.find((p) => p.id === activeStudentParentIds[0]) || null
    : null;

  const activeBranchName = selectedEnrollment && selectedEnrollment.branchIds.length > 0
    ? branchNameMap.get(selectedEnrollment.branchIds[0]) || null
    : null;

  const activeCourseName = selectedEnrollment
    ? courseNameMap.get(selectedEnrollment.id) || null
    : null;

  const activeStaffName = selectedEnrollment
    ? staffNameMap.get(selectedEnrollment.id) || null
    : null;

  const branchFilterOptions = branches.map((b) => ({ id: b.id, name: b.name }));
  const staffFilterOptions = users.map((u) => ({ id: u.id, name: u.fullName }));

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-300">
      
      {/* Header Search & Filtering */}
      <Card className="bg-card border-border shadow-xs overflow-hidden">
        <CardHeader className="border-b border-border py-4 px-6 bg-muted/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 space-y-0">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            Onboarding List ({pagination.total})
          </CardTitle>
          <SearchBar />
        </CardHeader>
        <CardContent className="p-4">
          <Filters
            branches={branchFilterOptions}
            staff={staffFilterOptions}
          />
        </CardContent>
      </Card>

      {/* Desktop Layout Table View */}
      <div className="hidden md:block">
        <EnrollmentTable
          enrollments={enrollments}
          studentNameMap={studentNameMap}
          parentNameMap={parentNameMap}
          branchNameMap={branchNameMap}
          courseNameMap={courseNameMap}
          staffNameMap={staffNameMap}
          onSelect={handleSelectEnrollment}
        />
      </div>

      {/* Mobile Layout Card List View */}
      <div className="md:hidden grid grid-cols-1 gap-4">
        {enrollments.length === 0 ? (
          <div className="text-center py-8 bg-card border border-border rounded-xl">
            <p className="text-xs font-semibold text-muted-foreground">No onboarding records found</p>
          </div>
        ) : (
          enrollments.map((enroll) => {
            const studentId = enroll.studentIds[0] || "";
            const sName = studentNameMap.get(studentId) || "Unknown Student";
            const pName = parentNameMap.get(enroll.id) || null;
            const bName = branchNameMap.get(enroll.branchIds[0] || "") || null;
            const cName = courseNameMap.get(enroll.id) || null;
            const sStaff = staffNameMap.get(enroll.id) || null;

            return (
              <EnrollmentCard
                key={enroll.id}
                enrollment={enroll}
                studentName={sName}
                parentName={pName}
                branchName={bName}
                courseName={cName}
                staffName={sStaff}
                onSelect={handleSelectEnrollment}
              />
            );
          })
        )}
      </div>

      {/* Pagination controls */}
      <div className="flex justify-end p-2 border border-border bg-card rounded-xl shadow-xs">
        <PaginationControls
          totalPages={pagination.totalPages}
          currentPage={pagination.page}
        />
      </div>

      {/* Detailed Sheet Drawer */}
      <OnboardingDrawer
        enrollment={selectedEnrollment}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        student={activeStudent}
        parent={activeParent}
        branchName={activeBranchName}
        courseName={activeCourseName}
        staffName={activeStaffName}
      />
    </div>
  );
}
