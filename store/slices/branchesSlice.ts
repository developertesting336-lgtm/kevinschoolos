import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface Branch {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  status: string | null;
  notes: string | null;
  openedDate: string | null;
}

interface BranchesState {
  branches: Branch[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  loading: boolean;
  error: string | null;
  search: string;

  // Branch Dashboard / Command Center data
  branchDashboard: {
    data: any | null;
    loading: boolean;
    error: string | null;
  };
}

const initialState: BranchesState = {
  branches: [],
  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
  loading: true,
  error: null,
  search: "",

  branchDashboard: {
    data: null,
    loading: true,
    error: null,
  },
};

export const fetchBranches = createAsyncThunk(
  "branches/fetchBranches",
  async (params: { page?: string; search?: string }, { rejectWithValue }) => {
    try {
      const page = params.page || "1";
      const search = params.search || "";
      const res = await fetch(`/api/data/branch?page=${page}&search=${encodeURIComponent(search)}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch branches");
    }
  }
);

export const fetchBranchDashboardData = createAsyncThunk(
  "branches/fetchBranchDashboardData",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/branch/dashboard");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch branch dashboard data");
    }
  }
);

const branchesSlice = createSlice({
  name: "branches",
  initialState,
  reducers: {
    clearBranches: (state) => {
      state.branches = [];
      state.error = null;
    },
    setBranchSearch: (state, action: PayloadAction<string>) => {
      state.search = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchBranches
      .addCase(fetchBranches.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBranches.fulfilled, (state, action) => {
        const response = action.payload as any;
        state.branches = Array.isArray(response.data) ? response.data : (Array.isArray(response) ? response : []);
        state.pagination = response.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchBranches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchBranchDashboardData
      .addCase(fetchBranchDashboardData.pending, (state) => {
        state.branchDashboard.loading = true;
        state.branchDashboard.error = null;
      })
      .addCase(fetchBranchDashboardData.fulfilled, (state, action) => {
        state.branchDashboard.data = action.payload;
        state.branchDashboard.loading = false;
      })
      .addCase(fetchBranchDashboardData.rejected, (state, action) => {
        state.branchDashboard.loading = false;
        state.branchDashboard.error = action.payload as string;
      });
  },
});

export const { clearBranches, setBranchSearch } = branchesSlice.actions;
export default branchesSlice.reducer;

// Selectors
export const selectBranches = (state: any) => state.branches.branches;
export const selectBranchesLoading = (state: any) => state.branches.loading;
export const selectBranchesError = (state: any) => state.branches.error;
export const selectBranchesPagination = (state: any) => state.branches.pagination;
export const selectBranchesSearch = (state: any) => state.branches.search;

export const selectBranchDashboardData = (state: any) => state.branches.branchDashboard.data;
export const selectBranchDashboardLoading = (state: any) => state.branches.branchDashboard.loading;
export const selectBranchDashboardError = (state: any) => state.branches.branchDashboard.error;