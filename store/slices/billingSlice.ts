import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface InvoiceData {
  id: string;
  invoiceNo: string;
  issueDate: string | null;
  dueDate: string | null;
  amount: number | null;
  status: string | null;
  branchIds: string[];
}

export interface PaymentData {
  id: string;
  paymentRef: string;
  date: string | null;
  amount: number | null;
  method: string | null;
  branchIds: string[];
  possibleDuplicate: boolean;
  paymentType: string | null;
}

export interface BranchData {
  id: string;
  name: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface BillingState {
  activeTab: "invoices" | "payments";
  invoices: InvoiceData[];
  payments: PaymentData[];
  branches: BranchData[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  loading: boolean;
  error: string | null;
  search: string;
}

const initialState: BillingState = {
  activeTab: "invoices",
  invoices: [],
  payments: [],
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
};

export const fetchBillingData = createAsyncThunk(
  "billing/fetchBillingData",
  async (params: { tab?: string; page?: string; search?: string }, { rejectWithValue }) => {
    try {
      const tab = params.tab || "invoices";
      const page = params.page || "1";
      const search = params.search || "";

      // Always fetch branches for mapping
      const branchesRes = await fetch("/api/data/branch").then((r) => r.json()).catch(() => [] as BranchData[]);
      const branches = Array.isArray(branchesRes) ? branchesRes : [];

      let data: any[] = [];
      let pagination = { total: 0, page: 1, limit: 10, totalPages: 1 };

      if (tab === "invoices") {
        const res = await fetch(`/api/data/invoice?page=${page}&search=${encodeURIComponent(search)}`).then((r) => r.json()).catch(() => ({ data: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 1 } }));
        data = (res as PaginatedResponse<InvoiceData>).data || [];
        pagination = (res as PaginatedResponse<InvoiceData>).pagination || pagination;
      } else {
        const res = await fetch(`/api/data/payment?page=${page}&search=${encodeURIComponent(search)}`).then((r) => r.json()).catch(() => ({ data: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 1 } }));
        data = (res as PaginatedResponse<PaymentData>).data || [];
        pagination = (res as PaginatedResponse<PaymentData>).pagination || pagination;
      }

      return {
        activeTab: tab as "invoices" | "payments",
        branches,
        invoices: tab === "invoices" ? data as InvoiceData[] : [],
        payments: tab === "payments" ? data as PaymentData[] : [],
        pagination,
        search,
        page,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to load billing data");
    }
  }
);

const billingSlice = createSlice({
  name: "billing",
  initialState,
  reducers: {
    setTab: (state, action: PayloadAction<"invoices" | "payments">) => {
      state.activeTab = action.payload;
    },
    setSearch: (state, action: PayloadAction<string>) => {
      state.search = action.payload;
    },
    clearBilling: (state) => {
      state.invoices = [];
      state.payments = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBillingData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBillingData.fulfilled, (state, action) => {
        state.activeTab = action.payload.activeTab;
        state.branches = action.payload.branches;
        state.invoices = action.payload.invoices;
        state.payments = action.payload.payments;
        state.pagination = action.payload.pagination;
        state.search = action.payload.search;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchBillingData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setTab, setSearch, clearBilling } = billingSlice.actions;
export default billingSlice.reducer;

// Selectors
export const selectBillingActiveTab = (state: any) => state.billing.activeTab;
export const selectBillingInvoices = (state: any) => state.billing.invoices;
export const selectBillingPayments = (state: any) => state.billing.payments;
export const selectBillingBranches = (state: any) => state.billing.branches;
export const selectBillingPagination = (state: any) => state.billing.pagination;
export const selectBillingLoading = (state: any) => state.billing.loading;
export const selectBillingError = (state: any) => state.billing.error;
export const selectBillingSearch = (state: any) => state.billing.search;