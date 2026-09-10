import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { getCsrfHeaders, ensureCsrfToken } from "@/lib/csrf-client";

export interface StaffPayrollItem {
  id: string;
  fullName: string;
  role: string;
  email: string | null;
  phone: string | null;
  branchIds: string[];
  branchName?: string;
  paymentRecord?: {
    id: string;
    payRunNo: string;
    period: string | null;
    payType: string | null;
    hours: number | null;
    rate: number | null;
    grossPay: number | null;
    paymentMethod: string | null;
    status: string;
    datePaid: string | null;
    notes: string | null;
  } | null;
  loggedHours?: number;
  status: "Paid" | "Approved" | "Draft";
}

export interface SubmitPaymentPayload {
  userId: string;
  datePaid: string;
  period: string;
  payType?: string;
  hours: number;
  rate: number;
  grossPay: number;
  paymentMethod: string;
  notes?: string;
  branchId?: string;
}

interface StaffPayrollState {
  data: StaffPayrollItem[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  isForbidden: boolean;
  filters: {
    search: string;
    period: string; // e.g. "2026-05"
    role: string;   // e.g. "all", "teacher", "cleaner", "smm", "finance"
  };
}

// Default initial period is current YYYY-MM
const now = new Date();
const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

const initialState: StaffPayrollState = {
  data: [],
  totalCount: 0,
  currentPage: 1,
  totalPages: 1,
  limit: 10,
  loading: false,
  submitting: false,
  error: null,
  isForbidden: false,
  filters: {
    search: "",
    period: currentPeriod,
    role: "all",
  },
};

export const fetchStaffPayrollData = createAsyncThunk(
  "staffPayroll/fetchStaffPayrollData",
  async (
    params: { page?: number; limit?: number; search?: string; period?: string; role?: string } | undefined,
    { getState, rejectWithValue }
  ) => {
    try {
      const state = (getState() as any).staffPayroll as StaffPayrollState;
      const page = params?.page ?? state.currentPage;
      const limit = params?.limit ?? state.limit;
      const search = params?.search ?? state.filters.search;
      const period = params?.period ?? state.filters.period;
      const role = params?.role ?? state.filters.role;

      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: search.trim(),
        period: period.trim(),
        role: role.trim(),
      });

      const response = await fetch(`/api/staff-payroll?${queryParams.toString()}`);

      if (!response.ok) {
        if (response.status === 403) {
          return rejectWithValue({ isForbidden: true, message: "Access Restricted. Owner or Office/Admin permission required." });
        }
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error ${response.status}`);
      }

      const resData = await response.json();
      return {
        data: resData.data || [],
        totalCount: resData.pagination?.total || 0,
        currentPage: resData.pagination?.page || page,
        totalPages: resData.pagination?.totalPages || 1,
        limit: resData.pagination?.limit || limit,
      };
    } catch (error: any) {
      return rejectWithValue({
        isForbidden: false,
        message: error.message || "Failed to load staff payroll data",
      });
    }
  }
);

export const submitStaffPaymentThunk = createAsyncThunk(
  "staffPayroll/submitStaffPaymentThunk",
  async (payload: SubmitPaymentPayload, { dispatch, rejectWithValue }) => {
    try {
      const csrfToken = await ensureCsrfToken();
      const headers = getCsrfHeaders({ "Content-Type": "application/json" }, csrfToken);

      const response = await fetch("/api/staff-payroll", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to submit payment (${response.status})`);
      }

      const result = await response.json();
      // Refresh list after successful payment submission
      dispatch(fetchStaffPayrollData());
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || "Payment submission failed");
    }
  }
);

const staffPayrollSlice = createSlice({
  name: "staffPayroll",
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<StaffPayrollState["filters"]>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.currentPage = 1; // reset to first page when filter changes
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Staff Payroll Data
      .addCase(fetchStaffPayrollData.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.isForbidden = false;
      })
      .addCase(fetchStaffPayrollData.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload.data;
        state.totalCount = action.payload.totalCount;
        state.currentPage = action.payload.currentPage;
        state.totalPages = action.payload.totalPages;
        state.limit = action.payload.limit;
      })
      .addCase(fetchStaffPayrollData.rejected, (state, action: any) => {
        state.loading = false;
        if (action.payload?.isForbidden) {
          state.isForbidden = true;
        }
        state.error = action.payload?.message || "Error fetching staff payroll data.";
      })

      // Submit Staff Payment
      .addCase(submitStaffPaymentThunk.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitStaffPaymentThunk.fulfilled, (state) => {
        state.submitting = false;
      })
      .addCase(submitStaffPaymentThunk.rejected, (state, action: any) => {
        state.submitting = false;
        state.error = action.payload || "Payment submission failed.";
      });
  },
});

export const { setFilters, setPage, clearError } = staffPayrollSlice.actions;

export const selectStaffPayrollData = (state: { staffPayroll: StaffPayrollState }) => state.staffPayroll.data;
export const selectStaffPayrollTotalCount = (state: { staffPayroll: StaffPayrollState }) => state.staffPayroll.totalCount;
export const selectStaffPayrollCurrentPage = (state: { staffPayroll: StaffPayrollState }) => state.staffPayroll.currentPage;
export const selectStaffPayrollTotalPages = (state: { staffPayroll: StaffPayrollState }) => state.staffPayroll.totalPages;
export const selectStaffPayrollLimit = (state: { staffPayroll: StaffPayrollState }) => state.staffPayroll.limit;
export const selectStaffPayrollLoading = (state: { staffPayroll: StaffPayrollState }) => state.staffPayroll.loading;
export const selectStaffPayrollSubmitting = (state: { staffPayroll: StaffPayrollState }) => state.staffPayroll.submitting;
export const selectStaffPayrollError = (state: { staffPayroll: StaffPayrollState }) => state.staffPayroll.error;
export const selectStaffPayrollIsForbidden = (state: { staffPayroll: StaffPayrollState }) => state.staffPayroll.isForbidden;
export const selectStaffPayrollFilters = (state: { staffPayroll: StaffPayrollState }) => state.staffPayroll.filters;

export default staffPayrollSlice.reducer;
