import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export interface Branch {
  id: string;
  name: string;
}

export interface Notification {
  id: string;
  type: string | null;
  channel: string | null;
  status: string | null;
  recipientName: string | null;
  recipientType: string | null;
  scheduledFor: string | null;
  sentAt: string | null;
  message: string | null;
}

interface NotificationsState {
  branches: Branch[];
  loading: boolean;
  error: string | null;
  userRole: string;
  userName: string;

  // History state
  history: {
    data: Notification[];
    stats: {
      scheduledCount: number;
      sentCount: number;
      failedCount: number;
      totalCount: number;
    };
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    loading: boolean;
    error: string | null;
  };
}

const initialState: NotificationsState = {
  branches: [],
  loading: true,
  error: null,
  userRole: "",
  userName: "",

  history: {
    data: [],
    stats: {
      scheduledCount: 0,
      sentCount: 0,
      failedCount: 0,
      totalCount: 0,
    },
    pagination: {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
    loading: true,
    error: null,
  },
};

export const fetchNotificationsData = createAsyncThunk(
  "notifications/fetchNotificationsData",
  async (params: { userRole?: string; userName?: string }, { rejectWithValue }) => {
    try {
      const branchesRes = await fetch("/api/data/branch").then((r) => r.json()).catch(() => []);
      const branches = Array.isArray(branchesRes) ? branchesRes : (branchesRes.data || []);

      return {
        branches,
        userRole: params.userRole || "",
        userName: params.userName || "",
      };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch notifications data");
    }
  }
);

export const fetchNotificationsHistory = createAsyncThunk(
  "notifications/fetchNotificationsHistory",
  async (
    filters: {
      page?: number;
      search?: string;
      status?: string;
      channel?: string;
      branchId?: string;
      recipientType?: string;
      startDate?: string;
      endDate?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const page = filters.page || 1;
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "10");

      if (filters.search) params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);
      if (filters.channel) params.set("channel", filters.channel);
      if (filters.branchId) params.set("branchId", filters.branchId);
      if (filters.recipientType) params.set("recipientType", filters.recipientType);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const res = await fetch(`/api/dashboard/notifications?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch notifications history");
    }
  }
);

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchNotificationsData
      .addCase(fetchNotificationsData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotificationsData.fulfilled, (state, action) => {
        state.branches = action.payload.branches;
        state.userRole = action.payload.userRole;
        state.userName = action.payload.userName;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchNotificationsData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchNotificationsHistory
      .addCase(fetchNotificationsHistory.pending, (state) => {
        state.history.loading = true;
        state.history.error = null;
      })
      .addCase(fetchNotificationsHistory.fulfilled, (state, action) => {
        state.history.data = action.payload.data || [];
        state.history.stats = action.payload.stats || initialState.history.stats;
        state.history.pagination = action.payload.pagination || initialState.history.pagination;
        state.history.loading = false;
      })
      .addCase(fetchNotificationsHistory.rejected, (state, action) => {
        state.history.loading = false;
        state.history.error = action.payload as string;
      });
  },
});

export default notificationsSlice.reducer;

// Selectors
export const selectNotificationsBranches = (state: any) => state.notifications.branches;
export const selectNotificationsLoading = (state: any) => state.notifications.loading;
export const selectNotificationsError = (state: any) => state.notifications.error;
export const selectNotificationsUserRole = (state: any) => state.notifications.userRole;
export const selectNotificationsUserName = (state: any) => state.notifications.userName;

export const selectNotificationsHistory = (state: any) => state.notifications.history.data;
export const selectNotificationsHistoryStats = (state: any) => state.notifications.history.stats;
export const selectNotificationsHistoryPagination = (state: any) => state.notifications.history.pagination;
export const selectNotificationsHistoryLoading = (state: any) => state.notifications.history.loading;
export const selectNotificationsHistoryError = (state: any) => state.notifications.history.error;