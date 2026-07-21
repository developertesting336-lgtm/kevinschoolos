import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export interface SessionData {
  id: string;
  sessionId: string;
  dateTime: string | null;
  status: string | null;
  classGroupIds: string[];
  teacherIds: string[];
  branchIds: string[];
}

export interface ClassGroupData {
  id: string;
  groupName: string;
  weekdays: string[];
  startTime: string | null;
  capacity: number | null;
  status: string | null;
  courseIds: string[];
  teacherIds: string[];
  roomIds: string[];
  termIds: string[];
  branchIds: string[];
}

export interface BranchData {
  id: string;
  name: string;
}

interface ScheduleState {
  tab: "sessions" | "groups";
  sessions: SessionData[];
  classGroups: ClassGroupData[];
  branches: BranchData[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  loading: boolean;
  error: string | null;
  isForbidden: boolean;

  // Enrollment dialog state
  enrollDialog: {
    students: Array<{ id: string; name: string }>;
    enrolledStudentIds: string[];
    loading: boolean;
    error: string | null;
    saving: boolean;
    saveError: string | null;
  };
}

const initialState: ScheduleState = {
  tab: "sessions",
  sessions: [],
  classGroups: [],
  branches: [],
  totalCount: 0,
  currentPage: 1,
  totalPages: 1,
  limit: 10,
  loading: true,
  error: null,
  isForbidden: false,

  enrollDialog: {
    students: [],
    enrolledStudentIds: [],
    loading: true,
    error: null,
    saving: false,
    saveError: null,
  },
};

export const fetchScheduleData = createAsyncThunk(
  "schedule/fetchScheduleData",
  async (params: { tab?: string; page?: string; search?: string }, { rejectWithValue }) => {
    try {
      const activeTab = params.tab || "sessions";
      const currentPage = params.page || "1";
      const search = params.search || "";

      // Always fetch branches for mapping
      const branchesRes = await fetch("/api/data/branch")
        .then((r) => r.json())
        .catch(() => []);

      // We always fetch branches for mapping (unpaginated)
      const branches = Array.isArray(branchesRes) ? branchesRes : (branchesRes as any).data || [];

      let sessions: SessionData[] = [];
      let classGroups: ClassGroupData[] = [];
      let totalCount = 0;
      let totalPages = 1;
      let page = parseInt(currentPage, 10);

      if (activeTab === "sessions") {
        const [sessionsRes, groupsRes] = await Promise.all([
          fetch(`/api/data/session?page=${currentPage}&limit=10&search=${encodeURIComponent(search)}`)
            .then((r) => {
              if (!r.ok && r.status === 403) throw new Error("Forbidden");
              return r.json();
            })
            .catch(() => ({ data: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 1 } })),
          fetch("/api/data/classgroup")
            .then((r) => r.json())
            .catch(() => ({ data: [] })),
        ]);

        sessions = (sessionsRes as any).data || [];
        const pag = (sessionsRes as any).pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };
        totalCount = pag.total;
        totalPages = pag.totalPages;
        page = pag.page;
        classGroups = Array.isArray(groupsRes) ? groupsRes : (groupsRes as any).data || [];
      } else {
        const groupsRes = await fetch(`/api/data/classgroup?page=${currentPage}&limit=10&search=${encodeURIComponent(search)}`)
          .then((r) => {
            if (!r.ok && r.status === 403) throw new Error("Forbidden");
            return r.json();
          })
          .catch(() => ({ data: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 1 } }));

        classGroups = (groupsRes as any).data || [];
        const pag = (groupsRes as any).pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };
        totalCount = pag.total;
        totalPages = pag.totalPages;
        page = pag.page;
      }

      return {
        tab: activeTab,
        sessions,
        classGroups,
        branches,
        totalCount,
        currentPage: page,
        totalPages,
        limit: 10,
      };
    } catch (error: any) {
      if (error.message === "Forbidden") {
        return rejectWithValue({ isForbidden: true, message: "Access Restricted" });
      }
      return rejectWithValue({ isForbidden: false, message: error.message || "Failed to fetch schedule data" });
    }
  }
);

export const fetchEnrollmentsForGroup = createAsyncThunk(
  "schedule/fetchEnrollmentsForGroup",
  async (classGroupId: string, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/dashboard/groups/enroll?classGroupId=${classGroupId}`);
      if (!res.ok) {
        throw new Error("Failed to load student roster data.");
      }
      return await res.json();
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to load enrollments.");
    }
  }
);

export const saveEnrollmentsForGroup = createAsyncThunk(
  "schedule/saveEnrollmentsForGroup",
  async (params: { classGroupId: string; studentIds: string[] }, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/dashboard/groups/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classGroupId: params.classGroupId,
          studentIds: params.studentIds,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      return params.studentIds;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to save student enrollments.");
    }
  }
);

const scheduleSlice = createSlice({
  name: "schedule",
  initialState,
  reducers: {
    clearSchedule: (state) => {
      state.sessions = [];
      state.classGroups = [];
      state.error = null;
      state.isForbidden = false;
    },
    clearEnrollDialogError: (state) => {
      state.enrollDialog.error = null;
      state.enrollDialog.saveError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchScheduleData
      .addCase(fetchScheduleData.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.isForbidden = false;
      })
      .addCase(fetchScheduleData.fulfilled, (state, action) => {
        state.tab = action.payload.tab as "sessions" | "groups";
        state.sessions = action.payload.sessions;
        state.classGroups = action.payload.classGroups;
        state.branches = action.payload.branches;
        state.totalCount = action.payload.totalCount;
        state.currentPage = action.payload.currentPage;
        state.totalPages = action.payload.totalPages;
        state.limit = action.payload.limit;
        state.loading = false;
        state.error = null;
        state.isForbidden = false;
      })
      .addCase(fetchScheduleData.rejected, (state, action) => {
        state.loading = false;
        const payload = action.payload as { isForbidden?: boolean; message?: string } | undefined;
        state.isForbidden = payload?.isForbidden || false;
        state.error = payload?.message || "Failed to fetch schedule data";
      })
      // fetchEnrollmentsForGroup
      .addCase(fetchEnrollmentsForGroup.pending, (state) => {
        state.enrollDialog.loading = true;
        state.enrollDialog.error = null;
      })
      .addCase(fetchEnrollmentsForGroup.fulfilled, (state, action) => {
        state.enrollDialog.students = action.payload.students || [];
        state.enrollDialog.enrolledStudentIds = action.payload.enrolledStudentIds || [];
        state.enrollDialog.loading = false;
      })
      .addCase(fetchEnrollmentsForGroup.rejected, (state, action) => {
        state.enrollDialog.loading = false;
        state.enrollDialog.error = action.payload as string;
      })
      // saveEnrollmentsForGroup
      .addCase(saveEnrollmentsForGroup.pending, (state) => {
        state.enrollDialog.saving = true;
        state.enrollDialog.saveError = null;
      })
      .addCase(saveEnrollmentsForGroup.fulfilled, (state, action) => {
        state.enrollDialog.enrolledStudentIds = action.payload;
        state.enrollDialog.saving = false;
      })
      .addCase(saveEnrollmentsForGroup.rejected, (state, action) => {
        state.enrollDialog.saving = false;
        state.enrollDialog.saveError = action.payload as string;
      });
  },
});

export const { clearSchedule, clearEnrollDialogError } = scheduleSlice.actions;
export default scheduleSlice.reducer;

// Selectors
export const selectScheduleTab = (state: any) => state.schedule.tab;
export const selectScheduleSessions = (state: any) => state.schedule.sessions;
export const selectScheduleClassGroups = (state: any) => state.schedule.classGroups;
export const selectScheduleBranches = (state: any) => state.schedule.branches;
export const selectScheduleTotalCount = (state: any) => state.schedule.totalCount;
export const selectScheduleCurrentPage = (state: any) => state.schedule.currentPage;
export const selectScheduleTotalPages = (state: any) => state.schedule.totalPages;
export const selectScheduleLimit = (state: any) => state.schedule.limit;
export const selectScheduleLoading = (state: any) => state.schedule.loading !== false;
export const selectScheduleError = (state: any) => state.schedule.error;
export const selectScheduleIsForbidden = (state: any) => state.schedule.isForbidden || false;

export const selectEnrollDialogStudents = (state: any) => state.schedule.enrollDialog.students;
export const selectEnrollDialogEnrolledIds = (state: any) => state.schedule.enrollDialog.enrolledStudentIds;
export const selectEnrollDialogLoading = (state: any) => state.schedule.enrollDialog.loading;
export const selectEnrollDialogError = (state: any) => state.schedule.enrollDialog.error;
export const selectEnrollDialogSaving = (state: any) => state.schedule.enrollDialog.saving;
export const selectEnrollDialogSaveError = (state: any) => state.schedule.enrollDialog.saveError;