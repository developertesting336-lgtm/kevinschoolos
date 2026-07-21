import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface KPIs {
  activeStudents?: number;
  totalStudents?: number;
  activeEnrollments?: number;
  totalEnrollments?: number;
  monthlyRevenue?: number;
  receivables?: number;
  attendanceHealth?: number;
  todaySessions?: number;
  trialToEnrollmentConversion?: number;
  leadsCount?: number;
  trialsBooked?: number;
  trialsAttended?: number;
  enrolled?: number;
  channelPerformance?: any[];
}

export interface Funnel {
  totalLeads: number;
  trialsBooked: number;
  trialsAttended: number;
  enrolled: number;
  lost: number;
}

export interface FinancialSnapshot {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  pendingInvoices: number;
}

export interface PayrollAlerts {
  unpaidPayments: number;
  unconfirmedHours: number;
}

export interface ChannelPerformanceData {
  data: Array<{
    id: string;
    month: string;
    channel: string;
    leads: number;
    trialsBooked: number;
    trialsAttended: number;
    enrolled: number;
    lost: number;
    trialBookedRate: number | null;
    showRate: number | null;
    closeRate: number | null;
    updatedAt: string;
  }>;
  lastUpdated: string | null;
  isStale: boolean;
  staleMessage: string | null;
}

export interface EnrollmentTrend {
  month: string;
  count: number;
}

export interface DashboardResponse {
  role: string;
  branchIds: string[];
  filters: {
    branch: string;
    month: string;
    course: string;
    channel: string;
  };
  kpis: KPIs;
  funnel: Funnel;
  enrollmentTrend: EnrollmentTrend[];
  channelPerformance: ChannelPerformanceData | null;
  financialSnapshot?: FinancialSnapshot;
  payrollAlerts?: PayrollAlerts;
}

interface DashboardState {
  data: DashboardResponse | null;
  loading: boolean;
  error: string | null;
  filters: {
    branch: string;
    month: string;
    course: string;
    channel: string;
  };
  ownerView: "hq" | "branch";

  // SMM Dashboard data
  smmData: {
    stats: {
      branchesCount: number;
      coursesCount: number;
      leadsCount: number;
      trialsCount: number;
    };
    courses: any[];
    recentActivities: any[];
    loading: boolean;
    error: string | null;
  };
}

const initialState: DashboardState = {
  data: null,
  loading: true,
  error: null,
  filters: {
    branch: "",
    month: "",
    course: "",
    channel: "",
  },
  ownerView: "hq",

  smmData: {
    stats: {
      branchesCount: 0,
      coursesCount: 0,
      leadsCount: 0,
      trialsCount: 0,
    },
    courses: [],
    recentActivities: [],
    loading: true,
    error: null,
  },
};

// Async thunk to fetch owner dashboard data
export const fetchOwnerDashboard = createAsyncThunk(
  "dashboard/fetchOwnerDashboard",
  async (filters: { branch?: string; month?: string; course?: string; channel?: string }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.branch) params.set("branch", filters.branch);
      if (filters.month) params.set("month", filters.month);
      if (filters.course) params.set("course", filters.course);
      if (filters.channel) params.set("channel", filters.channel);

      const res = await fetch(`/api/owner/dashboard?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch dashboard data");
    }
  }
);

// Async thunk to fetch SMM dashboard data
export const fetchSmmDashboardData = createAsyncThunk(
  "dashboard/fetchSmmDashboardData",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/dashboard/smm");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch SMM dashboard data");
    }
  }
);

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<{ branch?: string; month?: string; course?: string; channel?: string }>) => {
      if (action.payload.branch !== undefined) state.filters.branch = action.payload.branch;
      if (action.payload.month !== undefined) state.filters.month = action.payload.month;
      if (action.payload.course !== undefined) state.filters.course = action.payload.course;
      if (action.payload.channel !== undefined) state.filters.channel = action.payload.channel;
    },
    clearFilters: (state) => {
      state.filters = {
        branch: "",
        month: "",
        course: "",
        channel: "",
      };
    },
    setOwnerView: (state, action: PayloadAction<"hq" | "branch">) => {
      state.ownerView = action.payload;
    },
    clearDashboard: (state) => {
      state.data = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchOwnerDashboard
      .addCase(fetchOwnerDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOwnerDashboard.fulfilled, (state, action) => {
        state.data = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchOwnerDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchSmmDashboardData
      .addCase(fetchSmmDashboardData.pending, (state) => {
        state.smmData.loading = true;
        state.smmData.error = null;
      })
      .addCase(fetchSmmDashboardData.fulfilled, (state, action) => {
        state.smmData.stats = action.payload.stats || initialState.smmData.stats;
        state.smmData.courses = action.payload.courses || [];
        state.smmData.recentActivities = action.payload.recentActivities || [];
        state.smmData.loading = false;
      })
      .addCase(fetchSmmDashboardData.rejected, (state, action) => {
        state.smmData.loading = false;
        state.smmData.error = action.payload as string;
      });
  },
});

export const { setFilters, clearFilters, setOwnerView, clearDashboard } = dashboardSlice.actions;
export default dashboardSlice.reducer;

// Selectors
export const selectDashboardData = (state: { dashboard: DashboardState }) => state.dashboard.data;
export const selectDashboardLoading = (state: { dashboard: DashboardState }) => state.dashboard.loading;
export const selectDashboardError = (state: { dashboard: DashboardState }) => state.dashboard.error;
export const selectDashboardFilters = (state: { dashboard: DashboardState }) => state.dashboard.filters;
export const selectOwnerView = (state: { dashboard: DashboardState }) => state.dashboard.ownerView;

export const selectSmmStats = (state: { dashboard: DashboardState }) => state.dashboard.smmData.stats;
export const selectSmmCourses = (state: { dashboard: DashboardState }) => state.dashboard.smmData.courses;
export const selectSmmActivities = (state: { dashboard: DashboardState }) => state.dashboard.smmData.recentActivities;
export const selectSmmLoading = (state: { dashboard: DashboardState }) => state.dashboard.smmData.loading;
export const selectSmmError = (state: { dashboard: DashboardState }) => state.dashboard.smmData.error;
