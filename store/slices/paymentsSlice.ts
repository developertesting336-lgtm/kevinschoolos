import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface Payment {
  id: string;
  paymentRef: string;
  date: string | null;
  amount: number | null;
  method: string | null;
  invoiceIds: string[];
  parentIds: string[];
  branchIds: string[];
  possibleDuplicate: boolean;
  paymentType: string | null;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  amount: number | null;
  status: string | null;
  studentIds: string[];
  parentIds: string[];
  enrollmentIds: string[];
  dueDate?: string | null;
}

export interface Enrollment {
  id: string;
  enrollmentId: string;
  status: string | null;
  studentIds: string[];
  branchIds: string[];
  tuitionPlanIds: string[];
}

export interface Student {
  id: string;
  studentName: string;
}

export interface Parent {
  id: string;
  parentName: string;
  studentIds: string[];
}

export interface Branch {
  id: string;
  name: string;
}

export interface User {
  id: string;
  fullName: string;
}

interface PaymentsState {
  payments: Payment[];
  invoices: Invoice[];
  enrollments: Enrollment[];
  students: Student[];
  parents: Parent[];
  branches: Branch[];
  users: User[];
  totalCount: number;
  currentPage: number;
  limit: number;
  loading: boolean;
  error: string | null;
  filters: {
    search?: string;
    branch?: string;
    paymentType?: string;
    paymentMethod?: string;
    date?: string;
  };
}

const initialState: PaymentsState = {
  payments: [],
  invoices: [],
  enrollments: [],
  students: [],
  parents: [],
  branches: [],
  users: [],
  totalCount: 0,
  currentPage: 1,
  limit: 20,
  loading: true,
  error: null,
  filters: {},
};

export const fetchPaymentsData = createAsyncThunk(
  "payments/fetchPaymentsData",
  async (filters: { page?: number; search?: string; branch?: string; paymentType?: string; paymentMethod?: string; date?: string }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      params.set("page", String(filters.page || 1));
      params.set("limit", "20");
      if (filters.search) params.set("search", filters.search);
      if (filters.branch) params.set("branch", filters.branch);
      if (filters.paymentType) params.set("paymentType", filters.paymentType);
      if (filters.paymentMethod) params.set("paymentMethod", filters.paymentMethod);
      if (filters.date) params.set("date", filters.date);

      const [paymentsRes, invoicesRes, enrollmentsRes, studentsRes, parentsRes, branchesRes, usersRes] = await Promise.all([
        fetch(`/api/payments?${params.toString()}`).then((r) => r.json()).catch(() => ({ data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } })),
        fetch("/api/data/invoice").then((r) => r.json()).catch(() => []),
        fetch("/api/data/enrollment").then((r) => r.json()).catch(() => []),
        fetch("/api/data/student").then((r) => r.json()).catch(() => []),
        fetch("/api/data/parent").then((r) => r.json()).catch(() => []),
        fetch("/api/data/branch").then((r) => r.json()).catch(() => []),
        fetch("/api/data/user").then((r) => r.json()).catch(() => []),
      ]);

      const payments = (paymentsRes as any).data || [];
      const pagination = (paymentsRes as any).pagination || { total: 0, page: 1, limit: 20, totalPages: 1 };

      return {
        payments,
        invoices: Array.isArray(invoicesRes) ? invoicesRes : [],
        enrollments: Array.isArray(enrollmentsRes) ? enrollmentsRes : [],
        students: Array.isArray(studentsRes) ? studentsRes : [],
        parents: Array.isArray(parentsRes) ? parentsRes : [],
        branches: Array.isArray(branchesRes) ? branchesRes : [],
        users: Array.isArray(usersRes) ? usersRes : [],
        totalCount: pagination.total || 0,
        currentPage: pagination.page || 1,
        limit: pagination.limit || 20,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch payments data");
    }
  }
);

export const createPaymentThunk = createAsyncThunk(
  "payments/createPayment",
  async (paymentData: any, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          return rejectWithValue({ possibleDuplicate: true, message: data.message });
        }
        throw new Error(data.error || "Failed to record payment");
      }
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to record payment");
    }
  }
);

const paymentsSlice = createSlice({
  name: "payments",
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<PaymentsState["filters"]>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearPayments: (state) => {
      state.payments = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPaymentsData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentsData.fulfilled, (state, action) => {
        state.payments = action.payload.payments;
        state.invoices = action.payload.invoices;
        state.enrollments = action.payload.enrollments;
        state.students = action.payload.students;
        state.parents = action.payload.parents;
        state.branches = action.payload.branches;
        state.users = action.payload.users;
        state.totalCount = action.payload.totalCount;
        state.currentPage = action.payload.currentPage;
        state.limit = action.payload.limit;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchPaymentsData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createPaymentThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPaymentThunk.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(createPaymentThunk.rejected, (state, action) => {
        state.loading = false;
        if (action.payload && typeof action.payload === "object" && (action.payload as any).possibleDuplicate) {
          return;
        }
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearFilters, clearPayments } = paymentsSlice.actions;
export default paymentsSlice.reducer;

// Selectors
export const selectPaymentsPayments = (state: { payments: PaymentsState }) => state.payments.payments;
export const selectPaymentsInvoices = (state: { payments: PaymentsState }) => state.payments.invoices;
export const selectPaymentsEnrollments = (state: { payments: PaymentsState }) => state.payments.enrollments;
export const selectPaymentsStudents = (state: { payments: PaymentsState }) => state.payments.students;
export const selectPaymentsParents = (state: { payments: PaymentsState }) => state.payments.parents;
export const selectPaymentsBranches = (state: { payments: PaymentsState }) => state.payments.branches;
export const selectPaymentsUsers = (state: { payments: PaymentsState }) => state.payments.users;
export const selectPaymentsTotalCount = (state: { payments: PaymentsState }) => state.payments.totalCount;
export const selectPaymentsCurrentPage = (state: { payments: PaymentsState }) => state.payments.currentPage;
export const selectPaymentsLimit = (state: { payments: PaymentsState }) => state.payments.limit;
export const selectPaymentsLoading = (state: { payments: PaymentsState }) => state.payments.loading;
export const selectPaymentsError = (state: { payments: PaymentsState }) => state.payments.error;
export const selectPaymentsFilters = (state: { payments: PaymentsState }) => state.payments.filters;