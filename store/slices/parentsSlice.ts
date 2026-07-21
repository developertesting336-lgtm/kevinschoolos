import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export interface Parent {
  id: string;
  parentName: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

interface ParentsState {
  parents: Parent[];
  loading: boolean;
  error: string | null;
}

const initialState: ParentsState = {
  parents: [],
  loading: false,
  error: null,
};

export const fetchParents = createAsyncThunk(
  "parents/fetchParents",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/data/parent");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch parents");
    }
  }
);

const parentsSlice = createSlice({
  name: "parents",
  initialState,
  reducers: {
    clearParents: (state) => {
      state.parents = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchParents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchParents.fulfilled, (state, action) => {
        state.parents = Array.isArray(action.payload) ? action.payload : [];
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchParents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearParents } = parentsSlice.actions;
export default parentsSlice.reducer;

export const selectParents = (state: { parents: ParentsState }) => state.parents.parents;
export const selectParentsLoading = (state: { parents: ParentsState }) => state.parents.loading;
export const selectParentsError = (state: { parents: ParentsState }) => state.parents.error;