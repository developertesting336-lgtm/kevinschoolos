import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface Branch {
  id: string;
  name: string;
}

export interface ChannelPerformanceRecord {
  id: string;
  channel: string | null;
  month: string | null;
  leads: number | null;
  trialsBooked: number | null;
  trialsAttended: number | null;
  enrolled: number | null;
  lost: number | null;
  trialBookingRate: number;
  trialShowRate: number;
  closeRate: number;
}

interface ChannelPerformanceStats {
  totalLeads: number;
  totalBooked: number;
  totalAttended: number;
  totalEnrolled: number;
  totalLost: number;
  overallCloseRate: number;
}

interface ChannelPerformanceState {
  data: ChannelPerformanceRecord[];
  stats: ChannelPerformanceStats;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  lastUpdated: string | null;
  loading: boolean;
  error: string | null;
  filters: {
    search: string;
    channel: string;
    month: string;
    branchId: string;
  };
  branches: Branch[];
  userRole: string;
  userName: string;
}

const initialState: ChannelPerformanceState = {
  data: [],
  stats: {
    totalLeads: 0,
    totalBooked: 0,
    totalAttended: 0,
    totalEnrolled: 0,
    totalLost: 0,
    overallCloseRate: 0,
  },
  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
  lastUpdated: null,
  loading: true,
  error: null,
  filters: {
    search: "",
    channel: "",
    month: "",
    branchId: "",
  },
  branches: [],
  userRole: "",
  userName: "",
};

export const fetchChannelPerformanceData = createAsyncThunk(
  "channelPerformance/fetchData",
  async (params: {
    page?: number;
    search?: string;
    channel?: string;
    month?: string;
    branchId?: string;
    userRole?: string;
    userName?: string;
  }, { rejectWithValue }) => {
    try {
      // Fetch branches
      let branchesRes;
      if (params.userRole === "owner") {
        branchesRes = await fetch("/api/data/branch").then((r) => r.json()).catch(() => []);
      } else {
        branchesRes = await fetch("/api/data/branch").then((r) => r.json()).catch(() => []);
      }
      const branches = Array.isArray(branchesRes) ? branchesRes : (branchesRes.data || []);

      // Fetch channel performance data
      const url = new URLSearchParams();
      url.set("page", String(params.page || 1));
      url.set("limit", "10");
      if (params.search) url.set("search", params.search);
      if (params.channel) url.set("channel", params.channel);
      if (params.month) url.set("month", params.month);
      if (params.branchId) url.set("branchId", params.branchId);

      const res = await fetch(`/api/dashboard/channel-performance?${url.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const json = await res.json();

      return {
        data: json.data || [],
        stats: json.stats || initialState.stats,
        pagination: json.pagination || initialState.pagination,
        lastUpdated: json.lastUpdated || null,
        branches,
        userRole: params.userRole || "",
        userName: params.userName || "",
      };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch channel performance data");
    }
  }
);

const channelPerformanceSlice = createSlice({
  name: "channelPerformance",
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<ChannelPerformanceState["filters"]>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = { search: "", channel: "", month: "", branchId: "" };
      state.pagination.page = 1;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChannelPerformanceData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChannelPerformanceData.fulfilled, (state, action) => {
        state.data = action.payload.data;
        state.stats = action.payload.stats;
        state.pagination = action.payload.pagination;
        state.lastUpdated = action.payload.lastUpdated;
        state.branches = action.payload.branches;
        state.userRole = action.payload.userRole;
        state.userName = action.payload.userName;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchChannelPerformanceData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearFilters, setPage } = channelPerformanceSlice.actions;
export default channelPerformanceSlice.reducer;

// Selectors
export const selectChannelData = (state: any) => state.channelPerformance.data;
export const selectChannelStats = (state: any) => state.channelPerformance.stats;
export const selectChannelPagination = (state: any) => state.channelPerformance.pagination;
export const selectChannelLastUpdated = (state: any) => state.channelPerformance.lastUpdated;
export const selectChannelLoading = (state: any) => state.channelPerformance.loading;
export const selectChannelError = (state: any) => state.channelPerformance.error;
export const selectChannelFilters = (state: any) => state.channelPerformance.filters;
export const selectChannelBranches = (state: any) => state.channelPerformance.branches;
export const selectChannelUserRole = (state: any) => state.channelPerformance.userRole;
export const selectChannelUserName = (state: any) => state.channelPerformance.userName;