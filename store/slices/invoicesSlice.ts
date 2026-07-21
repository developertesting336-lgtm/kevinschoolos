import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

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

interface InvoicesState {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
}

const initialState: InvoicesState = {
  invoices: [],
  loading: false,
  error: null,
};

export const fetchInvoices = createAsyncThunk(
  "invoices/fetchInvoices",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/data/invoice");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch invoices");
    }
  }
);

const invoicesSlice = createSlice({
  name: "invoices",
  initialState,
  reducers: {
    clearInvoices: (state) => {
      state.invoices = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvoices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.invoices = Array.isArray(action.payload) ? action.payload : [];
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearInvoices } = invoicesSlice.actions;
export default invoicesSlice.reducer;

export const selectInvoices = (state: { invoices: InvoicesState }) => state.invoices.invoices;
export const selectInvoicesLoading = (state: { invoices: InvoicesState }) => state.invoices.loading;
export const selectInvoicesError = (state: { invoices: InvoicesState }) => state.invoices.error;