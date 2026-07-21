import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export interface UserData {
  id: string;
  fullName: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  workingLanguage: string | null;
  status: string | null;
  branchIds: string[];
}

export interface BranchData {
  id: string;
  name: string;
}

interface StaffState {
  users: UserData[];
  branches: BranchData[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  loading: boolean;
  error: string | null;
  isForbidden: boolean;
}

const initialState: StaffState = {
  users: [],
  branches: [],
  totalCount: 0,
  currentPage: 1,
  totalPages: 1,
  limit: 10,
  loading: true,
  error: null,
  isForbidden: false,
};

export const fetchStaffData = createAsyncThunk(
  "staff/fetchStaffData",
  async (params: { page?: string; search?: string }, { rejectWithValue }) => {
    try {
      const currentPage = params.page || "1";
      const search = params.search || "";

      const [usersResponse, branchesResponse] = await Promise.all([
        fetch(`/api/data/user?page=${currentPage}&limit=10&search=${encodeURIComponent(search)}`)
          .then((r) => {
            if (!r.ok) {
              if (r.status === 403) throw new Error("Forbidden");
              throw new Error(`HTTP error! status: ${r.status}`);
            }
            return r.json();
          }),
        fetch("/api/data/branch")
          .then((r) => {
            if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
            return r.json();
          })
          .catch(() => []),
      ]);

      const users = (usersResponse as any).data || [];
      const pag = (usersResponse as any).pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };
      const branches = Array.isArray(branchesResponse) ? branchesResponse : (branchesResponse as any).data || [];

      return {
        users,
        branches,
        totalCount: pag.total || 0,
        currentPage: pag.page || 1,
        totalPages: pag.totalPages || 1,
        limit: pag.limit || 10,
      };
    } catch (error: any) {
      if (error.message === "Forbidden") {
        return rejectWithValue({ isForbidden: true, message: "Access Restricted" });
      }
      return rejectWithValue({ isForbidden: false, message: error.message || "Failed to fetch staff data" });
    }
  }
);

const staffSlice = createSlice({
  name: "staff",
  initialState,
  reducers: {
    clearStaff: (state) => {
      state.users = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStaffData.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.isForbidden = false;
      })
      .addCase(fetchStaffData.fulfilled, (state, action) => {
        state.users = action.payload.users;
        state.branches = action.payload.branches;
        state.totalCount = action.payload.totalCount;
        state.currentPage = action.payload.currentPage;
        state.totalPages = action.payload.totalPages;
        state.limit = action.payload.limit;
        state.loading = false;
        state.error = null;
        state.isForbidden = false;
      })
      .addCase(fetchStaffData.rejected, (state, action) => {
        state.loading = false;
        const payload = action.payload as { isForbidden?: boolean; message?: string } | undefined;
        state.isForbidden = payload?.isForbidden || false;
        state.error = payload?.message || "Failed to fetch staff data";
      });
  },
});

export const { clearStaff } = staffSlice.actions;
export default staffSlice.reducer;

// Selectors
export const selectStaffUsers = (state: any) => state.staff?.users || [];
export const selectStaffBranches = (state: any) => state.staff?.branches || [];
export const selectStaffTotalCount = (state: any) => state.staff?.totalCount || 0;
export const selectStaffCurrentPage = (state: any) => state.staff?.currentPage || 1;
export const selectStaffTotalPages = (state: any) => state.staff?.totalPages || 1;
export const selectStaffLimit = (state: any) => state.staff?.limit || 10;
export const selectStaffLoading = (state: any) => state.staff?.loading !== false;
export const selectStaffError = (state: any) => state.staff?.error;
export const selectStaffIsForbidden = (state: any) => state.staff?.isForbidden || false;