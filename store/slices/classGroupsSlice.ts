import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export interface ClassGroup {
  id: string;
  groupName: string;
  roomIds: string[];
}

interface ClassGroupsState {
  classGroups: ClassGroup[];
  loading: boolean;
  error: string | null;
}

const initialState: ClassGroupsState = {
  classGroups: [],
  loading: false,
  error: null,
};

export const fetchClassGroups = createAsyncThunk(
  "classGroups/fetchClassGroups",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/data/classgroup");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch class groups");
    }
  }
);

const classGroupsSlice = createSlice({
  name: "classGroups",
  initialState,
  reducers: {
    clearClassGroups: (state) => {
      state.classGroups = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClassGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClassGroups.fulfilled, (state, action) => {
        state.classGroups = Array.isArray(action.payload) ? action.payload : [];
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchClassGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearClassGroups } = classGroupsSlice.actions;
export default classGroupsSlice.reducer;

export const selectClassGroups = (state: { classGroups: ClassGroupsState }) => state.classGroups.classGroups;
export const selectClassGroupsLoading = (state: { classGroups: ClassGroupsState }) => state.classGroups.loading;
export const selectClassGroupsError = (state: { classGroups: ClassGroupsState }) => state.classGroups.error;