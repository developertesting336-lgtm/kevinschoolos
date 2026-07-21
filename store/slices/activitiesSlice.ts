import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export interface Activity {
  id: string;
  activityId: string;
  dateTime: string | Date | null;
  type: string | null;
  direction: string | null;
  outcome: string | null;
  notes: string | null;
  nextFollowUpDate: string | Date | null;
  leadIds: string[];
  ownerIds: string[];
}

interface ActivitiesState {
  activities: Activity[];
  loading: boolean;
  error: string | null;
}

const initialState: ActivitiesState = {
  activities: [],
  loading: false,
  error: null,
};

export const fetchActivities = createAsyncThunk(
  "activities/fetchActivities",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/data/activity");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch activities");
    }
  }
);

const activitiesSlice = createSlice({
  name: "activities",
  initialState,
  reducers: {
    clearActivities: (state) => {
      state.activities = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActivities.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActivities.fulfilled, (state, action) => {
        state.activities = Array.isArray(action.payload) ? action.payload : [];
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchActivities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearActivities } = activitiesSlice.actions;
export default activitiesSlice.reducer;

export const selectActivities = (state: { activities: ActivitiesState }) => state.activities.activities;
export const selectActivitiesLoading = (state: { activities: ActivitiesState }) => state.activities.loading;
export const selectActivitiesError = (state: { activities: ActivitiesState }) => state.activities.error;