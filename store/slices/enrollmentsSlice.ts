import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export interface Enrollment {
  id: string;
  enrollmentId: string;
  status: string | null;
  studentIds: string[];
  branchIds: string[];
  tuitionPlanIds: string[];
  enrollDate: string | Date | null;
  onboardingStatus: string | null;
  ownerIds: string[];
  notes: string | null;
}

interface EnrollmentsState {
  enrollments: Enrollment[];
  loading: boolean;
  error: string | null;
}

const initialState: EnrollmentsState = {
  enrollments: [],
  loading: false,
  error: null,
};

export const fetchEnrollments = createAsyncThunk(
  "enrollments/fetchEnrollments",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/data/enrollment");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch enrollments");
    }
  }
);

const enrollmentsSlice = createSlice({
  name: "enrollments",
  initialState,
  reducers: {
    clearEnrollments: (state) => {
      state.enrollments = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEnrollments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEnrollments.fulfilled, (state, action) => {
        state.enrollments = Array.isArray(action.payload) ? action.payload : [];
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchEnrollments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearEnrollments } = enrollmentsSlice.actions;
export default enrollmentsSlice.reducer;

export const selectEnrollments = (state: { enrollments: EnrollmentsState }) => state.enrollments.enrollments;
export const selectEnrollmentsLoading = (state: { enrollments: EnrollmentsState }) => state.enrollments.loading;
export const selectEnrollmentsError = (state: { enrollments: EnrollmentsState }) => state.enrollments.error;