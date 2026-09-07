import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { getCsrfHeaders } from "@/lib/csrf-client";

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

interface Option {
  id: string;
  name: string;
}

interface ExpenseFormState {
  vendors: Option[];
  accounts: Option[];
  userBranchId: string;
  userBranchName: string;
  loading: boolean;
  error: string | null;
}

interface JournalEntryFormState {
  userRole: string;
  nextEntryNo: string;
  userBranchId: string;
  userBranchName: string;
  branches: Option[];
  activeAccounts: any[];
  sourcesData: {
    payments: { id: string; label: string }[];
    invoices: { id: string; label: string }[];
    teacherPays: { id: string; label: string }[];
    expenses: { id: string; label: string }[];
    royalties: { id: string; label: string }[];
  };
  loading: boolean;
  error: string | null;
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
  journalEntriesList: {
    data: any[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
    loading: boolean;
    error: string | null;
  };

  // Expense form state (Office Admin)
  expenseForm: ExpenseFormState;

  // Journal Entry form state (Finance & Owner)
  journalEntryForm: JournalEntryFormState;
  createJournalEntryLoading: boolean;
  createJournalEntryError: string | null;
  reverseJournalEntryLoading: boolean;
  reverseJournalEntryError: string | null;
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
  journalEntriesList: {
    data: [],
    pagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
    loading: true,
    error: null,
  },

  expenseForm: {
    vendors: [],
    accounts: [],
    userBranchId: "",
    userBranchName: "",
    loading: false,
    error: null,
  },

  journalEntryForm: {
    userRole: "",
    nextEntryNo: "JE-0001",
    userBranchId: "",
    userBranchName: "",
    branches: [],
    activeAccounts: [],
    sourcesData: {
      payments: [],
      invoices: [],
      teacherPays: [],
      expenses: [],
      royalties: [],
    },
    loading: false,
    error: null,
  },
  createJournalEntryLoading: false,
  createJournalEntryError: null,
  reverseJournalEntryLoading: false,
  reverseJournalEntryError: null,
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
  async (params: { page?: number; branchId?: string; search?: string }, { rejectWithValue }) => {
    try {
      const page = params.page || 1;
      let url = `/api/dashboard/finance/expenses?page=${page}&limit=10`;
      if (params.branchId) {
        url += `&branchId=${encodeURIComponent(params.branchId)}`;
      }
      if (params.search && params.search.trim()) {
        url += `&search=${encodeURIComponent(params.search.trim())}`;
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

export const createExpense = createAsyncThunk(
  "finance/createExpense",
  async (expenseData: {
    date: string;
    description: string;
    amount: number;
    paymentMethod: string;
    vendorId: string;
    expenseAccountId: string;
    branchId: string;
    paid: boolean;
    notes?: string;
  }, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/dashboard/office-admin/expenses", {
        method: "POST",
        headers: getCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(expenseData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create expense");
      }
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to create expense");
    }
  }
);

export const updateExpenseApprovalStatus = createAsyncThunk(
  "finance/updateExpenseApprovalStatus",
  async (payload: { expenseId: string; status: "Approved" | "Rejected"; rejectionReason?: string }, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/dashboard/finance/expenses", {
        method: "POST",
        headers: getCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update expense approval status");
      }
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to update expense approval status");
    }
  }
);

export const fetchOfficeAdminExpensesList = createAsyncThunk(
  "finance/fetchOfficeAdminExpensesList",
  async (params: { page?: number; search?: string }, { rejectWithValue }) => {
    try {
      const page = params.page || 1;
      let url = `/api/dashboard/office-admin/expenses?page=${page}&limit=10`;
      if (params.search && params.search.trim()) {
        url += `&search=${encodeURIComponent(params.search.trim())}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch office admin expenses");
    }
  }
);

// Thunk to fetch expense form initialization data
export const fetchExpenseFormData = createAsyncThunk(
  "finance/fetchExpenseFormData",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/dashboard/office-admin/expenses?action=form-data");
      if (!res.ok) throw new Error("Failed to load expense form data");
      const json = await res.json();

      return {
        userBranchId: json.userBranchId || "",
        userBranchName: json.userBranchName || "Main Branch",
        vendors: json.vendors || [],
        accounts: json.accounts || [],
      };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to load expense form data");
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

// --- Journal Entries Thunks ---

export const fetchJournalEntriesList = createAsyncThunk(
  "finance/fetchJournalEntriesList",
  async (params: { page?: number; search?: string; posted?: string; branchId?: string }, { rejectWithValue }) => {
    try {
      const page = params.page || 1;
      let url = `/api/dashboard/finance/journal-entries?page=${page}&limit=10`;
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
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch journal entries");
    }
  }
);

export const fetchJournalEntryFormData = createAsyncThunk(
  "finance/fetchJournalEntryFormData",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/dashboard/finance/journal-entries?action=form-data");
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to load journal entry form data");
      }
      return await res.json();
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to load journal entry form data");
    }
  }
);

export const createJournalEntry = createAsyncThunk(
  "finance/createJournalEntry",
  async (payload: any, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/dashboard/finance/journal-entries", {
        method: "POST",
        headers: getCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create journal entry");
      }
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to create journal entry");
    }
  }
);

export const reverseJournalEntry = createAsyncThunk(
  "finance/reverseJournalEntry",
  async (payload: { journalEntryId: string; reversalMemo?: string }, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/dashboard/finance/journal-entries/reverse", {
        method: "POST",
        headers: getCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reverse journal entry");
      }
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to reverse journal entry");
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
    resetExpenseForm: (state) => {
      state.expenseForm = initialState.expenseForm;
    },
    clearJournalEntryErrors: (state) => {
      state.createJournalEntryError = null;
      state.reverseJournalEntryError = null;
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
      // updateExpenseApprovalStatus
      .addCase(updateExpenseApprovalStatus.fulfilled, (state, action) => {
        const { expenseId, status } = action.payload;
        const item = state.expensesList.data.find((e: any) => e.id === expenseId);
        if (item) {
          item.approvalStatus = status;
          item.paid = status === "Approved";
        }
      })
      // fetchOfficeAdminExpensesList
      .addCase(fetchOfficeAdminExpensesList.pending, (state) => {
        state.expensesList.loading = true;
        state.expensesList.error = null;
      })
      .addCase(fetchOfficeAdminExpensesList.fulfilled, (state, action) => {
        state.expensesList.data = action.payload.data || [];
        state.expensesList.pagination = action.payload.pagination || initialState.expensesList.pagination;
        state.expensesList.loading = false;
      })
      .addCase(fetchOfficeAdminExpensesList.rejected, (state, action) => {
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
      // fetchExpenseFormData
      .addCase(fetchExpenseFormData.pending, (state) => {
        state.expenseForm.loading = true;
        state.expenseForm.error = null;
      })
      .addCase(fetchExpenseFormData.fulfilled, (state, action) => {
        state.expenseForm.vendors = action.payload.vendors;
        state.expenseForm.accounts = action.payload.accounts;
        state.expenseForm.userBranchId = action.payload.userBranchId;
        state.expenseForm.userBranchName = action.payload.userBranchName;
        state.expenseForm.loading = false;
        state.expenseForm.error = null;
      })
      .addCase(fetchExpenseFormData.rejected, (state, action) => {
        state.expenseForm.loading = false;
        state.expenseForm.error = action.payload as string;
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
      })
      // fetchJournalEntriesList
      .addCase(fetchJournalEntriesList.pending, (state) => {
        state.journalEntriesList.loading = true;
        state.journalEntriesList.error = null;
      })
      .addCase(fetchJournalEntriesList.fulfilled, (state, action) => {
        state.journalEntriesList.data = action.payload.data || [];
        state.journalEntriesList.pagination = action.payload.pagination || initialState.journalEntriesList.pagination;
        state.journalEntriesList.loading = false;
      })
      .addCase(fetchJournalEntriesList.rejected, (state, action) => {
        state.journalEntriesList.loading = false;
        state.journalEntriesList.error = action.payload as string;
      })
      // fetchJournalEntryFormData
      .addCase(fetchJournalEntryFormData.pending, (state) => {
        state.journalEntryForm.loading = true;
        state.journalEntryForm.error = null;
      })
      .addCase(fetchJournalEntryFormData.fulfilled, (state, action) => {
        state.journalEntryForm.userRole = action.payload.userRole || "";
        state.journalEntryForm.nextEntryNo = action.payload.nextEntryNo || "JE-0001";
        state.journalEntryForm.userBranchId = action.payload.userBranchId || "";
        state.journalEntryForm.userBranchName = action.payload.userBranchName || "";
        state.journalEntryForm.branches = action.payload.branches || [];
        state.journalEntryForm.activeAccounts = action.payload.activeAccounts || [];
        state.journalEntryForm.sourcesData = action.payload.sourcesData || initialState.journalEntryForm.sourcesData;
        state.journalEntryForm.loading = false;
      })
      .addCase(fetchJournalEntryFormData.rejected, (state, action) => {
        state.journalEntryForm.loading = false;
        state.journalEntryForm.error = action.payload as string;
      })
      // createJournalEntry
      .addCase(createJournalEntry.pending, (state) => {
        state.createJournalEntryLoading = true;
        state.createJournalEntryError = null;
      })
      .addCase(createJournalEntry.fulfilled, (state, action) => {
        state.createJournalEntryLoading = false;
        state.createJournalEntryError = null;
        // Unshift newly created journal entry into the list if present
        if (action.payload && action.payload.id) {
          state.journalEntriesList.data.unshift(action.payload);
        }
      })
      .addCase(createJournalEntry.rejected, (state, action) => {
        state.createJournalEntryLoading = false;
        state.createJournalEntryError = action.payload as string;
      })
      // reverseJournalEntry
      .addCase(reverseJournalEntry.pending, (state) => {
        state.reverseJournalEntryLoading = true;
        state.reverseJournalEntryError = null;
      })
      .addCase(reverseJournalEntry.fulfilled, (state, action) => {
        state.reverseJournalEntryLoading = false;
        state.reverseJournalEntryError = null;
        if (action.payload && action.payload.id) {
          state.journalEntriesList.data.unshift(action.payload);
        }
      })
      .addCase(reverseJournalEntry.rejected, (state, action) => {
        state.reverseJournalEntryLoading = false;
        state.reverseJournalEntryError = action.payload as string;
      });
  },
});

export const { setSelectedBranch, resetExpenseForm, clearJournalEntryErrors } = financeSlice.actions;
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

// Expense form selectors
export const selectExpenseFormVendors = (state: any) => state.finance.expenseForm.vendors;
export const selectExpenseFormAccounts = (state: any) => state.finance.expenseForm.accounts;
export const selectExpenseFormBranchId = (state: any) => state.finance.expenseForm.userBranchId;
export const selectExpenseFormBranchName = (state: any) => state.finance.expenseForm.userBranchName;
export const selectExpenseFormLoading = (state: any) => state.finance.expenseForm.loading;

// Journal Entries selectors
export const selectJournalEntriesList = (state: any) => state.finance.journalEntriesList.data;
export const selectJournalEntriesPagination = (state: any) => state.finance.journalEntriesList.pagination;
export const selectJournalEntriesLoading = (state: any) => state.finance.journalEntriesList.loading;
export const selectJournalEntriesError = (state: any) => state.finance.journalEntriesList.error;

export const selectJournalEntryFormData = (state: any) => state.finance.journalEntryForm;
export const selectJournalEntryFormLoading = (state: any) => state.finance.journalEntryForm.loading;
export const selectCreateJournalEntryLoading = (state: any) => state.finance.createJournalEntryLoading;
export const selectCreateJournalEntryError = (state: any) => state.finance.createJournalEntryError;
export const selectReverseJournalEntryLoading = (state: any) => state.finance.reverseJournalEntryLoading;
export const selectReverseJournalEntryError = (state: any) => state.finance.reverseJournalEntryError;
