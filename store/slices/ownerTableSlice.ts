import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

interface OwnerTableState {
  data: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  branches: any[];
  loading: boolean;
  error: string | null;
}

const initialState: OwnerTableState = {
  data: [],
  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
  branches: [],
  loading: true,
  error: null,
};

export const fetchOwnerTableData = createAsyncThunk(
  "ownerTable/fetchOwnerTableData",
  async (params: {
    table: string;
    page?: string;
    limit?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    branchId?: string;
    extraFilters?: Record<string, string>;
  }, { rejectWithValue }) => {
    try {
      const { table } = params;
      const queryParams = new URLSearchParams();
      queryParams.set("page", params.page || "1");
      queryParams.set("limit", params.limit || "10");
      if (params.search) queryParams.set("search", params.search);
      if (params.sortBy) queryParams.set("sortBy", params.sortBy);
      if (params.sortOrder) queryParams.set("sortOrder", params.sortOrder);
      if (params.branchId) queryParams.set("branchId", params.branchId);

      if (params.extraFilters) {
        Object.entries(params.extraFilters).forEach(([key, val]) => {
          if (val) queryParams.set(key, val);
        });
      }

      const dataUrl = table === "tuitionplan"
        ? `/api/tuition-plans?${queryParams.toString()}`
        : `/api/owner/${table}?${queryParams.toString()}`;
      const branchUrl = "/api/owner/branch?limit=100";

      const [dataRes, branchRes] = await Promise.all([
        fetch(dataUrl).then((r) => r.json()),
        fetch(branchUrl).then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      return {
        data: dataRes.data || [],
        pagination: dataRes.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 },
        branches: branchRes.data || [],
      };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch table data");
    }
  }
);

export const createTuitionPlanThunk = createAsyncThunk(
  "ownerTable/createTuitionPlan",
  async (planData: any, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/tuition-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(planData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create tuition plan");
      }
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to create tuition plan");
    }
  }
);

export const updateTuitionPlanThunk = createAsyncThunk(
  "ownerTable/updateTuitionPlan",
  async ({ id, planData }: { id: string; planData: any }, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/tuition-plans/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(planData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update tuition plan");
      }
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to update tuition plan");
    }
  }
);

const ownerTableSlice = createSlice({
  name: "ownerTable",
  initialState,
  reducers: {
    clearOwnerTable: (state) => {
      state.data = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOwnerTableData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOwnerTableData.fulfilled, (state, action) => {
        state.data = action.payload.data;
        state.pagination = action.payload.pagination;
        state.branches = action.payload.branches;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchOwnerTableData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createTuitionPlanThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTuitionPlanThunk.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(createTuitionPlanThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateTuitionPlanThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTuitionPlanThunk.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(updateTuitionPlanThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearOwnerTable } = ownerTableSlice.actions;
export default ownerTableSlice.reducer;

// Selectors
export const selectOwnerTableData = (state: any) => state.ownerTable.data;
export const selectOwnerTablePagination = (state: any) => state.ownerTable.pagination;
export const selectOwnerTableBranches = (state: any) => state.ownerTable.branches;
export const selectOwnerTableLoading = (state: any) => state.ownerTable.loading;
export const selectOwnerTableError = (state: any) => state.ownerTable.error;