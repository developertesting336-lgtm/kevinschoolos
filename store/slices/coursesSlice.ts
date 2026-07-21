import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export interface Course {
  id: string;
  courseName: string;
  courseCode?: string | null;
  duration?: string | null;
}

interface CoursesState {
  courses: Course[];
  loading: boolean;
  error: string | null;
}

const initialState: CoursesState = {
  courses: [],
  loading: false,
  error: null,
};

export const fetchCourses = createAsyncThunk(
  "courses/fetchCourses",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/data/course");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch courses");
    }
  }
);

const coursesSlice = createSlice({
  name: "courses",
  initialState,
  reducers: {
    clearCourses: (state) => {
      state.courses = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCourses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCourses.fulfilled, (state, action) => {
        state.courses = Array.isArray(action.payload) ? action.payload : [];
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCourses } = coursesSlice.actions;
export default coursesSlice.reducer;

export const selectCourses = (state: { courses: CoursesState }) => state.courses.courses;
export const selectCoursesLoading = (state: { courses: CoursesState }) => state.courses.loading;
export const selectCoursesError = (state: { courses: CoursesState }) => state.courses.error;