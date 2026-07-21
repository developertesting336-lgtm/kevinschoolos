import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  userId: string | null;
  role: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  userId: null,
  role: null,
  loading: false,
  error: null,
};

// Async thunk to login
export const loginThunk = createAsyncThunk(
  "auth/login",
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed. Please check credentials.");
      }

      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Login failed");
    }
  }
);

// Async thunk to logout
export const logoutThunk = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Logout failed");
      }
      return null;
    } catch (error: any) {
      return rejectWithValue(error.message || "Logout failed");
    }
  }
);

// Async thunk to validate session
export const validateSessionThunk = createAsyncThunk(
  "auth/validateSession",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        throw new Error("Session validation failed");
      }
      return await res.json();
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to validate session");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<{ userId: string; role: string }>) => {
      state.userId = action.payload.userId;
      state.role = action.payload.role;
      state.loading = false;
      state.error = null;
    },
    clearSession: (state) => {
      state.userId = null;
      state.role = null;
      state.loading = false;
      state.error = null;
    },
    setAuthError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.userId = action.payload.userId || action.payload.id;
        state.role = action.payload.role || "staff";
        state.loading = false;
        state.error = null;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logoutThunk.fulfilled, (state) => {
        state.userId = null;
        state.role = null;
        state.loading = false;
        state.error = null;
      })
      // Validate session
      .addCase(validateSessionThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(validateSessionThunk.fulfilled, (state, action) => {
        state.userId = action.payload.userId;
        state.role = action.payload.role;
        state.loading = false;
        state.error = null;
      })
      .addCase(validateSessionThunk.rejected, (state, action) => {
        state.userId = null;
        state.role = null;
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSession, clearSession, setAuthError } = authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectAuthUserId = (state: { auth: AuthState }) => state.auth.userId;
export const selectAuthRole = (state: { auth: AuthState }) => state.auth.role;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.loading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
