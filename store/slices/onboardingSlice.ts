import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface EnrollmentData {
  id: string;
  enrollmentId: string;
  status: string | null;
  studentIds: string[];
  branchIds: string[];
  tuitionPlanIds: string[];
  enrollDate: string | Date | null;
  onboardingStatus: string | null;
  ownerIds: string[];
  notes: string | null;
  classGroupIds: string[];
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
}

export interface StudentData {
  id: string;
  studentName: string;
  dateOfBirth?: string | Date | null;
  gender?: string | null;
  notes?: string | null;
  parentIds?: string[];
}

export interface ParentData {
  id: string;
  parentName: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface UserData {
  id: string;
  fullName: string;
}

export interface BranchData {
  id: string;
  name: string;
}

export interface CourseData {
  id: string;
  courseName: string;
  courseCode?: string | null;
  duration?: string | null;
}

export interface ClassGroupData {
  id: string;
  groupName: string;
  courseIds: string[];
  teacherIds: string[];
}

interface OnboardingState {
  enrollments: EnrollmentData[];
  students: StudentData[];
  parents: any[];
  users: any[];
  branches: any[];
  courses: CourseData[];
  classGroups: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  loading: boolean;
  error: string | null;
  filters: {
    search?: string;
    branch?: string;
    onboardingStatus?: string;
    owner?: string;
    enrollDate?: string;
  };
}

const initialState: OnboardingState = {
  enrollments: [],
  students: [],
  parents: [],
  users: [],
  branches: [],
  courses: [],
  classGroups: [],
  pagination: {
    total: 0,
    page: 1,
    limit: 30,
    totalPages: 1,
  },
  loading: true,
  error: null,
  filters: {},
};

export const fetchOnboardingData = createAsyncThunk(
  "onboarding/fetchOnboardingData",
  async (filters: { page?: number; search?: string; branch?: string; onboardingStatus?: string; owner?: string; enrollDate?: string }, { getState, rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      params.set("page", String(filters.page || 1));
      params.set("limit", "30");
      if (filters.search) params.set("search", filters.search);
      if (filters.branch) params.set("branch", filters.branch);
      if (filters.onboardingStatus) params.set("onboardingStatus", filters.onboardingStatus);
      if (filters.owner) params.set("owner", filters.owner);
      if (filters.enrollDate) params.set("enrollDate", filters.enrollDate);

      const state = getState() as any;
      const onboardingState = state.onboarding;
      const alreadyHasMetadata = onboardingState && onboardingState.students.length > 0;

      let enrollmentsResponse;
      let studentsRes = alreadyHasMetadata ? onboardingState.students : [];
      let parentsRes = alreadyHasMetadata ? onboardingState.parents : [];
      let usersRes = alreadyHasMetadata ? onboardingState.users : [];
      let branchesRes = alreadyHasMetadata ? onboardingState.branches : [];
      let coursesRes = alreadyHasMetadata ? onboardingState.courses : [];
      let classGroupsRes = alreadyHasMetadata ? onboardingState.classGroups : [];

      if (alreadyHasMetadata) {
        enrollmentsResponse = await fetch(`/api/data/enrollment?${params.toString()}`).then((r) => r.json()).catch(() => ({ data: [], pagination: { total: 0, page: 1, limit: 30, totalPages: 1 } }));
      } else {
        const responses = await Promise.all([
          fetch(`/api/data/enrollment?${params.toString()}`).then((r) => r.json()).catch(() => ({ data: [], pagination: { total: 0, page: 1, limit: 30, totalPages: 1 } })),
          fetch("/api/data/student").then((r) => r.json()).catch(() => []),
          fetch("/api/data/parent").then((r) => r.json()).catch(() => []),
          fetch("/api/data/user").then((r) => r.json()).catch(() => []),
          fetch("/api/data/branch").then((r) => r.json()).catch(() => []),
          fetch("/api/data/course").then((r) => r.json()).catch(() => []),
          fetch("/api/data/classgroup").then((r) => r.json()).catch(() => []),
        ]);
        enrollmentsResponse = responses[0];
        studentsRes = responses[1];
        parentsRes = responses[2];
        usersRes = responses[3];
        branchesRes = responses[4];
        coursesRes = responses[5];
        classGroupsRes = responses[6];
      }

      const enrollments = (enrollmentsResponse as any).data || [];
      const pagination = (enrollmentsResponse as any).pagination || initialState.pagination;

      return {
        enrollments,
        students: Array.isArray(studentsRes) ? studentsRes : [],
        parents: Array.isArray(parentsRes) ? parentsRes : [],
        users: Array.isArray(usersRes) ? usersRes : [],
        branches: Array.isArray(branchesRes) ? branchesRes : [],
        courses: Array.isArray(coursesRes) ? coursesRes : [],
        classGroups: Array.isArray(classGroupsRes) ? classGroupsRes : [],
        pagination,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch onboarding data");
    }
  }
);

const onboardingSlice = createSlice({
  name: "onboarding",
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<OnboardingState["filters"]>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearOnboarding: (state) => {
      state.enrollments = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOnboardingData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOnboardingData.fulfilled, (state, action) => {
        state.enrollments = action.payload.enrollments;
        state.students = action.payload.students;
        state.parents = action.payload.parents;
        state.users = action.payload.users;
        state.branches = action.payload.branches;
        state.courses = action.payload.courses;
        state.classGroups = action.payload.classGroups;
        state.pagination = action.payload.pagination;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchOnboardingData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearFilters, clearOnboarding } = onboardingSlice.actions;
export default onboardingSlice.reducer;

// Selectors
export const selectOnboardingEnrollments = (state: any) => state.onboarding.enrollments;
export const selectOnboardingStudents = (state: any) => state.onboarding.students;
export const selectOnboardingParents = (state: any) => state.onboarding.parents;
export const selectOnboardingUsers = (state: any) => state.onboarding.users;
export const selectOnboardingBranches = (state: any) => state.onboarding.branches;
export const selectOnboardingCourses = (state: any) => state.onboarding.courses;
export const selectOnboardingClassGroups = (state: any) => state.onboarding.classGroups;
export const selectOnboardingPagination = (state: any) => state.onboarding.pagination;
export const selectOnboardingLoading = (state: any) => state.onboarding.loading;
export const selectOnboardingError = (state: any) => state.onboarding.error;
export const selectOnboardingFilters = (state: any) => state.onboarding.filters;
