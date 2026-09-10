import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getCsrfHeaders, ensureCsrfToken } from "@/lib/csrf-client";

export interface Student {
  id: string;
  studentName: string;
  dateOfBirth?: string | Date | null;
  gender: string | null;
  status: string | null;
  notes: string | null;
  branchIds: string[];
  parentIds?: string[];
  medicalNotes?: string | null;
  grade?: string | null;
}

export interface BranchData {
  id: string;
  name: string;
}

export interface StudentFeeRecord {
  status: "Paid" | "Unpaid";
  amount?: number;
  paymentRef?: string;
  date?: string;
  method?: string;
  paymentId?: string;
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
  selectedMonth: string;
  monthlyFeeRecords: Record<string, StudentFeeRecord>;
  feeRecordsLoading: boolean;
  submittingFeeStudentId: string | null;
  feeStatusFilter: "all" | "paid" | "unpaid";
}

const getCurrentMonthString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

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
  selectedMonth: getCurrentMonthString(),
  monthlyFeeRecords: {},
  feeRecordsLoading: false,
  submittingFeeStudentId: null,
  feeStatusFilter: "all",
};

export const fetchStudentsData = createAsyncThunk(
  "students/fetchStudentsData",
  async (params: { page?: string; search?: string }, { rejectWithValue }) => {
    try {
      const currentPage = params.page || "1";
      const search = params.search || "";

      const [studentsResponse, branchesResponse] = await Promise.all([
        fetch(`/api/data/student?page=1&limit=1000&search=${encodeURIComponent(search)}`)
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

export const fetchStudentFeeStatuses = createAsyncThunk(
  "students/fetchStudentFeeStatuses",
  async (month: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/students/fees?month=${encodeURIComponent(month)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch fee statuses: ${response.statusText}`);
      }
      const data = await response.json();
      return {
        month: data.month || month,
        feeRecords: data.feeRecords || {},
      };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to load fee statuses");
    }
  }
);

export const submitStudentFee = createAsyncThunk(
  "students/submitStudentFee",
  async (
    payload: {
      studentId: string;
      amount: number;
      date: string;
      method: string;
      month: string;
    },
    { rejectWithValue }
  ) => {
    try {
      await ensureCsrfToken();
      const response = await fetch("/api/students/fees", {
        method: "POST",
        headers: getCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit student fee");
      }

      return {
        studentId: payload.studentId,
        month: payload.month,
        amount: payload.amount,
        date: payload.date,
        method: payload.method,
        paymentRef: data.payment?.paymentRef,
        paymentId: data.payment?.id,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to submit student fee");
    }
  }
);

export const updateStudentFee = createAsyncThunk(
  "students/updateStudentFee",
  async (
    payload: {
      paymentId: string;
      studentId: string;
      amount: number;
      date: string;
      method: string;
      month: string;
    },
    { rejectWithValue }
  ) => {
    try {
      await ensureCsrfToken();
      const response = await fetch("/api/students/fees", {
        method: "PATCH",
        headers: getCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update student fee");
      }

      return {
        studentId: payload.studentId,
        month: payload.month,
        amount: payload.amount,
        date: payload.date,
        method: payload.method,
        paymentRef: data.payment?.paymentRef,
        paymentId: data.payment?.id,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to update student fee");
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
    setSelectedMonth: (state, action) => {
      state.selectedMonth = action.payload;
    },
    setFeeStatusFilter: (state, action) => {
      state.feeStatusFilter = action.payload;
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
      })
      // Fee status extra reducers
      .addCase(fetchStudentFeeStatuses.pending, (state) => {
        state.feeRecordsLoading = true;
      })
      .addCase(fetchStudentFeeStatuses.fulfilled, (state, action) => {
        state.selectedMonth = action.payload.month;
        state.monthlyFeeRecords = action.payload.feeRecords;
        state.feeRecordsLoading = false;
      })
      .addCase(fetchStudentFeeStatuses.rejected, (state) => {
        state.feeRecordsLoading = false;
      })
      // Submit fee extra reducers
      .addCase(submitStudentFee.pending, (state, action) => {
        state.submittingFeeStudentId = action.meta.arg.studentId;
      })
      .addCase(submitStudentFee.fulfilled, (state, action) => {
        state.submittingFeeStudentId = null;
        state.monthlyFeeRecords[action.payload.studentId] = {
          status: "Paid",
          amount: action.payload.amount,
          date: action.payload.date,
          method: action.payload.method,
          paymentRef: action.payload.paymentRef,
          paymentId: action.payload.paymentId,
        };
      })
      .addCase(submitStudentFee.rejected, (state) => {
        state.submittingFeeStudentId = null;
      })
      // Update fee extra reducers
      .addCase(updateStudentFee.pending, (state, action) => {
        state.submittingFeeStudentId = action.meta.arg.studentId;
      })
      .addCase(updateStudentFee.fulfilled, (state, action) => {
        state.submittingFeeStudentId = null;
        state.monthlyFeeRecords[action.payload.studentId] = {
          status: "Paid",
          amount: action.payload.amount,
          date: action.payload.date,
          method: action.payload.method,
          paymentRef: action.payload.paymentRef,
          paymentId: action.payload.paymentId,
        };
      })
      .addCase(updateStudentFee.rejected, (state) => {
        state.submittingFeeStudentId = null;
      });
  },
});

export const { clearStudents, setSelectedMonth, setFeeStatusFilter } = studentsSlice.actions;
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
export const selectSelectedMonth = (state: any) => state.students?.selectedMonth || getCurrentMonthString();
export const selectMonthlyFeeRecords = (state: any) => state.students?.monthlyFeeRecords || {};
export const selectFeeRecordsLoading = (state: any) => state.students?.feeRecordsLoading || false;
export const selectSubmittingFeeStudentId = (state: any) => state.students?.submittingFeeStudentId || null;
export const selectFeeStatusFilter = (state: any) => state.students?.feeStatusFilter || "all";