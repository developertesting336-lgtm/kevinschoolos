import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface Branch {
  id: string;
  name: string;
}

interface FinanceStats {
  totalRevenue: number;
  totalExpenses: number;
  totalTeacherPayroll: number;
  totalRoyalties: number;
  outstandingPayments: number;
  currentAccountingPeriod: string;
}

interface FinanceState {
  branches: Branch[];
  stats: FinanceStats;
  invoices: any[];
  payments: any[];
  expenses: any[];
  accounts: any[];
  selectedBranch: string;
  loading: boolean;
  error: string | null;
  userRole: string;
  userName: string;
  userEmail: string | null;

  expensesList: {
    data: any[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
    loading: boolean;
    error: string | null;
  };
  royaltiesList: {
    data: any[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
    loading: boolean;
    error: string | null;
  };
  teacherPayList: {
    data: any[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
    loading: boolean;
    error: string | null;
  };
  ledgerList: {
    data: any[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
    loading: boolean;
    error: string | null;
  };
}

const initialState: FinanceState = {
  branches: [],
  stats: {
    totalRevenue: 0,
    totalExpenses: 0,
    totalTeacherPayroll: 0,
    totalRoyalties: 0,
    outstandingPayments: 0,
    currentAccountingPeriod: "Loading...",
  },
  invoices: [],
  payments: [],
  expenses: [],
  accounts: [],
  selectedBranch: "",
  loading: true,
  error: null,
  userRole: "",
  userName: "",
  userEmail: null,

  expensesList: {
    data: [],
    pagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
    loading: true,
    error: null,
  },
  royaltiesList: {
    data: [],
    pagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
    loading: true,
    error: null,
  },
  teacherPayList: {
    data: [],
    pagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
    loading: true,
    error: null,
  },
  ledgerList: {
    data: [],
    pagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
    loading: true,
    error: null,
  },
};

export const fetchFinanceData = createAsyncThunk(
  "finance/fetchFinanceData",
  async (params: { branchId?: string; userRole?: string; userName?: string; userEmail?: string | null }, { rejectWithValue }) => {
    try {
      // Fetch branches
      const branchesRes = await fetch("/api/data/branch").then((r) => r.json()).catch(() => []);
      const branches = Array.isArray(branchesRes) ? branchesRes : (branchesRes.data || []);

      // Fetch finance stats
      let url = "/api/dashboard/finance";
      if (params.branchId) url += `?branchId=${encodeURIComponent(params.branchId)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load dashboard metrics");
      const json = await res.json();

      return {
        branches,
        stats: json.stats || initialState.stats,
        invoices: json.invoices || [],
        payments: json.payments || [],
        expenses: json.expenses || [],
        accounts: json.accounts || [],
        selectedBranch: params.branchId || "",
        userRole: params.userRole || "",
        userName: params.userName || "",
        userEmail: params.userEmail || null,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch finance data");
    }
  }
);

export const fetchExpensesList = createAsyncThunk(
  "finance/fetchExpensesList",
  async (params: { page?: number; branchId?: string }, { rejectWithValue }) => {
    try {
      const page = params.page || 1;
      let url = `/api/dashboard/finance/expenses?page=${page}&limit=10`;
      if (params.branchId) {
        url += `&branchId=${encodeURIComponent(params.branchId)}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch expenses");
    }
  }
);

export const fetchRoyaltiesList = createAsyncThunk(
  "finance/fetchRoyaltiesList",
  async (params: { page?: number; branchId?: string }, { rejectWithValue }) => {
    try {
      const page = params.page || 1;
      let url = `/api/dashboard/finance/royalties?page=${page}&limit=10`;
      if (params.branchId) {
        url += `&branchId=${encodeURIComponent(params.branchId)}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch royalties");
    }
  }
);

export const fetchTeacherPayList = createAsyncThunk(
  "finance/fetchTeacherPayList",
  async (params: { page?: number; branchId?: string }, { rejectWithValue }) => {
    try {
      const page = params.page || 1;
      let url = `/api/dashboard/finance/teacher-pay?page=${page}&limit=10`;
      if (params.branchId) {
        url += `&branchId=${encodeURIComponent(params.branchId)}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch teacher pay runs");
    }
  }
);

export const fetchLedgerList = createAsyncThunk(
  "finance/fetchLedgerList",
  async (params: { page?: number; search?: string; posted?: string; branchId?: string }, { rejectWithValue }) => {
    try {
      const page = params.page || 1;
      let url = `/api/dashboard/finance/ledger?page=${page}&limit=10`;
      if (params.search) {
        url += `&search=${encodeURIComponent(params.search)}`;
      }
      if (params.posted && params.posted !== "all") {
        url += `&posted=${encodeURIComponent(params.posted)}`;
      }
      if (params.branchId) {
        url += `&branchId=${encodeURIComponent(params.branchId)}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch ledger data");
    }
  }
);

const financeSlice = createSlice({
  name: "finance",
  initialState,
  reducers: {
    setSelectedBranch: (state, action: PayloadAction<string>) => {
      state.selectedBranch = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchFinanceData
      .addCase(fetchFinanceData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFinanceData.fulfilled, (state, action) => {
        state.branches = action.payload.branches;
        state.stats = action.payload.stats;
        state.invoices = action.payload.invoices;
        state.payments = action.payload.payments;
        state.expenses = action.payload.expenses;
        state.accounts = action.payload.accounts;
        state.selectedBranch = action.payload.selectedBranch;
        state.userRole = action.payload.userRole;
        state.userName = action.payload.userName;
        state.userEmail = action.payload.userEmail;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchFinanceData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchExpensesList
      .addCase(fetchExpensesList.pending, (state) => {
        state.expensesList.loading = true;
        state.expensesList.error = null;
      })
      .addCase(fetchExpensesList.fulfilled, (state, action) => {
        state.expensesList.data = action.payload.data || [];
        state.expensesList.pagination = action.payload.pagination || initialState.expensesList.pagination;
        state.expensesList.loading = false;
      })
      .addCase(fetchExpensesList.rejected, (state, action) => {
        state.expensesList.loading = false;
        state.expensesList.error = action.payload as string;
      })
      // fetchRoyaltiesList
      .addCase(fetchRoyaltiesList.pending, (state) => {
        state.royaltiesList.loading = true;
        state.royaltiesList.error = null;
      })
      .addCase(fetchRoyaltiesList.fulfilled, (state, action) => {
        state.royaltiesList.data = action.payload.data || [];
        state.royaltiesList.pagination = action.payload.pagination || initialState.royaltiesList.pagination;
        state.royaltiesList.loading = false;
      })
      .addCase(fetchRoyaltiesList.rejected, (state, action) => {
        state.royaltiesList.loading = false;
        state.royaltiesList.error = action.payload as string;
      })
      // fetchTeacherPayList
      .addCase(fetchTeacherPayList.pending, (state) => {
        state.teacherPayList.loading = true;
        state.teacherPayList.error = null;
      })
      .addCase(fetchTeacherPayList.fulfilled, (state, action) => {
        state.teacherPayList.data = action.payload.data || [];
        state.teacherPayList.pagination = action.payload.pagination || initialState.teacherPayList.pagination;
        state.teacherPayList.loading = false;
      })
      .addCase(fetchTeacherPayList.rejected, (state, action) => {
        state.teacherPayList.loading = false;
        state.teacherPayList.error = action.payload as string;
      })
      // fetchLedgerList
      .addCase(fetchLedgerList.pending, (state) => {
        state.ledgerList.loading = true;
        state.ledgerList.error = null;
      })
      .addCase(fetchLedgerList.fulfilled, (state, action) => {
        state.ledgerList.data = action.payload.data || [];
        state.ledgerList.pagination = action.payload.pagination || initialState.ledgerList.pagination;
        state.ledgerList.loading = false;
      })
      .addCase(fetchLedgerList.rejected, (state, action) => {
        state.ledgerList.loading = false;
        state.ledgerList.error = action.payload as string;
      });
  },
});

export const { setSelectedBranch } = financeSlice.actions;
export default financeSlice.reducer;

// Selectors
export const selectFinanceBranches = (state: any) => state.finance.branches;
export const selectFinanceStats = (state: any) => state.finance.stats;
export const selectFinanceInvoices = (state: any) => state.finance.invoices;
export const selectFinancePayments = (state: any) => state.finance.payments;
export const selectFinanceExpenses = (state: any) => state.finance.expenses;
export const selectFinanceAccounts = (state: any) => state.finance.accounts;
export const selectFinanceSelectedBranch = (state: any) => state.finance.selectedBranch;
export const selectFinanceLoading = (state: any) => state.finance.loading;
export const selectFinanceError = (state: any) => state.finance.error;
export const selectFinanceUserRole = (state: any) => state.finance.userRole;
export const selectFinanceUserName = (state: any) => state.finance.userName;
export const selectFinanceUserEmail = (state: any) => state.finance.userEmail;

export const selectExpensesList = (state: any) => state.finance.expensesList.data;
export const selectExpensesPagination = (state: any) => state.finance.expensesList.pagination;
export const selectExpensesLoading = (state: any) => state.finance.expensesList.loading;
export const selectExpensesError = (state: any) => state.finance.expensesList.error;

export const selectRoyaltiesList = (state: any) => state.finance.royaltiesList.data;
export const selectRoyaltiesPagination = (state: any) => state.finance.royaltiesList.pagination;
export const selectRoyaltiesLoading = (state: any) => state.finance.royaltiesList.loading;
export const selectRoyaltiesError = (state: any) => state.finance.royaltiesList.error;

export const selectTeacherPayList = (state: any) => state.finance.teacherPayList.data;
export const selectTeacherPayPagination = (state: any) => state.finance.teacherPayList.pagination;
export const selectTeacherPayLoading = (state: any) => state.finance.teacherPayList.loading;
export const selectTeacherPayError = (state: any) => state.finance.teacherPayList.error;

export const selectLedgerList = (state: any) => state.finance.ledgerList.data;
export const selectLedgerPagination = (state: any) => state.finance.ledgerList.pagination;
export const selectLedgerLoading = (state: any) => state.finance.ledgerList.loading;
export const selectLedgerError = (state: any) => state.finance.ledgerList.error;