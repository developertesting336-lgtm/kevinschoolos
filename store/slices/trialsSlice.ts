import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export interface Trial {
  id: string;
  trialId: string;
  dateTime: string | Date | null;
  outcome: string | null;
  notes: string | null;
  leadIds: string[];
  teacherIds: string[];
  classGroupIds: string[];
}

interface TrialsState {
  trials: Trial[];
  loading: boolean;
  error: string | null;
}

const initialState: TrialsState = {
  trials: [],
  loading: false,
  error: null,
};

export const fetchTrials = createAsyncThunk(
  "trials/fetchTrials",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/data/trial");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch trials");
    }
  }
);

const trialsSlice = createSlice({
  name: "trials",
  initialState,
  reducers: {
    clearTrials: (state) => {
      state.trials = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTrials.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTrials.fulfilled, (state, action) => {
        state.trials = Array.isArray(action.payload) ? action.payload : [];
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchTrials.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearTrials } = trialsSlice.actions;
export default trialsSlice.reducer;

export const selectTrials = (state: { trials: TrialsState }) => state.trials.trials;
export const selectTrialsLoading = (state: { trials: TrialsState }) => state.trials.loading;
export const selectTrialsError = (state: { trials: TrialsState }) => state.trials.error;