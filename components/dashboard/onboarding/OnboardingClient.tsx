"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchOnboardingData, selectOnboardingEnrollments, selectOnboardingStudents, selectOnboardingParents, selectOnboardingUsers, selectOnboardingBranches, selectOnboardingCourses, selectOnboardingClassGroups, selectOnboardingPagination, selectOnboardingLoading, selectOnboardingFilters } from "@/store/slices/onboardingSlice";
import type { EnrollmentData, StudentData, ParentData, UserData, BranchData, CourseData, ClassGroupData } from "@/store/slices/onboardingSlice";
import { SearchBar } from "./SearchBar";
import { Filters } from "./Filters";
import { EnrollmentTable } from "./EnrollmentTable";
import { EnrollmentCard } from "./EnrollmentCard";
import { OnboardingDrawer } from "./OnboardingDrawer";
import { PaginationControls } from "@/components/dashboard/PaginationControls";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ClipboardCheck } from "lucide-react";

export function OnboardingClient() {
  const dispatch = useAppDispatch();
  
  // Redux state
  const enrollments = useAppSelector(selectOnboardingEnrollments);
  const students = useAppSelector(selectOnboardingStudents);
  const parents = useAppSelector(selectOnboardingParents);
  const users = useAppSelector(selectOnboardingUsers);
  const branches = useAppSelector(selectOnboardingBranches);
  const courses = useAppSelector(selectOnboardingCourses);
  const classGroups = useAppSelector(selectOnboardingClassGroups);
  const pagination = useAppSelector(selectOnboardingPagination);
  const loading = useAppSelector(selectOnboardingLoading);
  const filters = useAppSelector(selectOnboardingFilters);
  
  const [selectedEnrollment, setSelectedEnrollment] = useState<EnrollmentData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const searchParams = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1", 10);
  const search = searchParams.get("search") || undefined;
  const branch = searchParams.get("branch") || undefined;
  const onboardingStatus = searchParams.get("onboardingStatus") || undefined;
  const owner = searchParams.get("owner") || undefined;
  const enrollDate = searchParams.get("enrollDate") || undefined;

  // Fetch data when filters/search URL params change
  useEffect(() => {
    dispatch(fetchOnboardingData({
      page,
      search,
      branch,
      onboardingStatus,
      owner,
      enrollDate
    }));
  }, [dispatch, page, search, branch, onboardingStatus, owner, enrollDate]);

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
  const branchNameMap = useMemo(() => new Map<string, string>(branches.map((b: any) => [b.id, b.name])), [branches]);
  const studentNameMap = useMemo(() => new Map<string, string>(students.map((s: any) => [s.id, s.studentName])), [students]);

  // Dynamic lookup mappings for class groups, courses, and teachers using Hash Maps
  const { parentNameMap, courseNameMap, staffNameMap } = useMemo(() => {
    const parentMap = new Map<string, string>();
    const courseMap = new Map<string, string>();
    const staffMap = new Map<string, string>();

    const studentsById = new Map<string, any>(students.map((s: any) => [s.id, s]));
    const parentsById = new Map<string, any>(parents.map((p: any) => [p.id, p]));
    const classGroupsById = new Map<string, any>(classGroups.map((cg: any) => [cg.id, cg]));
    const coursesById = new Map<string, any>(courses.map((c: any) => [c.id, c]));
    const usersById = new Map<string, any>(users.map((u: any) => [u.id, u]));

    enrollments.forEach((enroll: any) => {
      // 1. Resolve Parent Name
      const sId = enroll.studentIds[0] || "";
      const stud = studentsById.get(sId);
      const parentIds = stud?.parentIds;
      if (parentIds && parentIds.length > 0) {
        const parentRecord = parentsById.get(parentIds[0]);
        if (parentRecord) {
          parentMap.set(enroll.id, parentRecord.parentName);
        } else {
          parentMap.set(enroll.id, "—");
        }
      } else {
        parentMap.set(enroll.id, "—");
      }

      // 2. Resolve Class Group, Course Name, and Teacher name
      const cgId = enroll.classGroupIds[0] || "";
      const cg = classGroupsById.get(cgId);
      if (cg) {
        const courseId = cg.courseIds.find((id: string) => coursesById.has(id));
        const course = courseId ? coursesById.get(courseId) : null;
        courseMap.set(enroll.id, course ? course.courseName : "—");

        const teacherId = cg.teacherIds.find((id: string) => usersById.has(id));
        const teacher = teacherId ? usersById.get(teacherId) : null;
        staffMap.set(enroll.id, teacher ? teacher.fullName : "Unassigned");
      } else {
        courseMap.set(enroll.id, "—");
        staffMap.set(enroll.id, "Unassigned");
      }
    });

    return { parentNameMap: parentMap, courseNameMap: courseMap, staffNameMap: staffMap };
  }, [enrollments, students, parents, classGroups, courses, users]);

  // Resolve detail drawer fields
  const activeStudent = useMemo(() => {
    return selectedEnrollment && selectedEnrollment.studentIds.length > 0
      ? students.find((s: any) => s.id === selectedEnrollment.studentIds[0]) || null
      : null;
  }, [selectedEnrollment, students]);

  const activeParent = useMemo(() => {
    const activeStudentParentIds = activeStudent?.parentIds;
    return activeStudentParentIds && activeStudentParentIds.length > 0
      ? parents.find((p: any) => p.id === activeStudentParentIds[0]) || null
      : null;
  }, [activeStudent, parents]);

  const activeBranchName = useMemo(() => {
    return selectedEnrollment && selectedEnrollment.branchIds.length > 0
      ? (branchNameMap.get(selectedEnrollment.branchIds[0]) as string | undefined) || null
      : null;
  }, [selectedEnrollment, branchNameMap]);

  const activeCourseName = useMemo(() => {
    return selectedEnrollment
      ? (courseNameMap.get(selectedEnrollment.id) as string | undefined) || null
      : null;
  }, [selectedEnrollment, courseNameMap]);

  const activeStaffName = useMemo(() => {
    return selectedEnrollment
      ? (staffNameMap.get(selectedEnrollment.id) as string | undefined) || null
      : null;
  }, [selectedEnrollment, staffNameMap]);

  const branchFilterOptions = branches.map((b: any) => ({ id: b.id, name: b.name }));
  const staffFilterOptions = users.map((u: any) => ({ id: u.id, name: u.fullName }));

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

      {/* List Content */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl border border-border/40" />
          ))}
        </div>
      ) : (
        <>
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
              enrollments.map((enroll: any) => {
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
        </>
      )}

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