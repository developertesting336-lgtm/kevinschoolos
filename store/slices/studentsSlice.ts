import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export interface Student {
  id: string;
  studentName: string;
  dateOfBirth?: string | Date | null;
  gender: string | null;
  status: string | null;
  notes: string | null;
  branchIds: string[];
  medicalNotes?: string | null;
  grade?: string | null;
}

export interface BranchData {
  id: string;
  name: string;
}

interface StudentsState {
  students: Student[];
  branches: BranchData[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  loading: boolean;
  error: string | null;
  isForbidden: boolean;
}

const initialState: StudentsState = {
  students: [],
  branches: [],
  totalCount: 0,
  currentPage: 1,
  totalPages: 1,
  limit: 10,
  loading: true,
  error: null,
  isForbidden: false,
};

export const fetchStudentsData = createAsyncThunk(
  "students/fetchStudentsData",
  async (params: { page?: string; search?: string }, { rejectWithValue }) => {
    try {
      const currentPage = params.page || "1";
      const search = params.search || "";

      const [studentsResponse, branchesResponse] = await Promise.all([
        fetch(`/api/data/student?page=${currentPage}&limit=10&search=${encodeURIComponent(search)}`)
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

      const students = (studentsResponse as any).data || [];
      const pag = (studentsResponse as any).pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };
      const branches = Array.isArray(branchesResponse) ? branchesResponse : (branchesResponse as any).data || [];

      return {
        students,
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
      return rejectWithValue({ isForbidden: false, message: error.message || "Failed to fetch students data" });
    }
  }
);

const studentsSlice = createSlice({
  name: "students",
  initialState,
  reducers: {
    clearStudents: (state) => {
      state.students = [];
      state.error = null;
      state.isForbidden = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudentsData.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.isForbidden = false;
      })
      .addCase(fetchStudentsData.fulfilled, (state, action) => {
        state.students = action.payload.students;
        state.branches = action.payload.branches;
        state.totalCount = action.payload.totalCount;
        state.currentPage = action.payload.currentPage;
        state.totalPages = action.payload.totalPages;
        state.limit = action.payload.limit;
        state.loading = false;
        state.error = null;
        state.isForbidden = false;
      })
      .addCase(fetchStudentsData.rejected, (state, action) => {
        state.loading = false;
        const payload = action.payload as { isForbidden?: boolean; message?: string } | undefined;
        state.isForbidden = payload?.isForbidden || false;
        state.error = payload?.message || "Failed to fetch students data";
      });
  },
});

export const { clearStudents } = studentsSlice.actions;
export default studentsSlice.reducer;

// Selectors
export const selectStudents = (state: any) => state.students?.students || [];
export const selectStudentsBranches = (state: any) => state.students?.branches || [];
export const selectStudentsTotalCount = (state: any) => state.students?.totalCount || 0;
export const selectStudentsCurrentPage = (state: any) => state.students?.currentPage || 1;
export const selectStudentsTotalPages = (state: any) => state.students?.totalPages || 1;
export const selectStudentsLimit = (state: any) => state.students?.limit || 10;
export const selectStudentsLoading = (state: any) => state.students?.loading !== false;
export const selectStudentsError = (state: any) => state.students?.error;
export const selectStudentsIsForbidden = (state: any) => state.students?.isForbidden || false;