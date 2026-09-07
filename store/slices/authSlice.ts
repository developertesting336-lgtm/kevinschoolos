import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { getCsrfHeaders } from "@/lib/csrf-client";

interface AuthState {
  userId: string | null;
  role: string | null;
  loading: boolean;
  error: string | null;
  // Password reset state
  forgotPasswordLoading: boolean;
  forgotPasswordSuccess: boolean;
  forgotPasswordMessage: string | null;
  forgotPasswordError: string | null;
  resetPasswordLoading: boolean;
  resetPasswordSuccess: boolean;
  resetPasswordError: string | null;
  resetPasswordValidationErrors: string[];
  verifyTokenLoading: boolean;
  verifyTokenValid: boolean | null;
  verifyTokenError: string | null;
}

const initialState: AuthState = {
  userId: null,
  role: null,
  loading: false,
  error: null,
  forgotPasswordLoading: false,
  forgotPasswordSuccess: false,
  forgotPasswordMessage: null,
  forgotPasswordError: null,
  resetPasswordLoading: false,
  resetPasswordSuccess: false,
  resetPasswordError: null,
  resetPasswordValidationErrors: [],
  verifyTokenLoading: false,
  verifyTokenValid: null,
  verifyTokenError: null,
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
        if (data && data.isLocked) {
          return rejectWithValue(data);
        }
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
        headers: getCsrfHeaders(),
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

// Async thunk to touch session (keep active session alive)
export const touchSessionThunk = createAsyncThunk(
  "auth/touchSession",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/auth/touch", {
        method: "POST",
        headers: getCsrfHeaders(),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Session touch failed");
      }
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to touch session");
    }
  }
);

// Async thunk to request password reset email
export const forgotPasswordThunk = createAsyncThunk(
  "auth/forgotPassword",
  async ({ email }: { email: string }, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send reset link.");
      }

      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to request password reset.");
    }
  }
);

// Async thunk to verify reset token
export const verifyResetTokenThunk = createAsyncThunk(
  "auth/verifyResetToken",
  async (token: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
      const data = await response.json();

      if (!response.ok || !data.valid) {
        return rejectWithValue(data.error || "Invalid or expired reset link.");
      }

      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to verify reset token.");
    }
  }
);

// Async thunk to set new password using reset token
export const resetPasswordThunk = createAsyncThunk(
  "auth/resetPassword",
  async (
    { token, newPassword }: { token: string; newPassword: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue({
          error: data.error || "Failed to reset password.",
          errors: data.errors || [],
        });
      }

      return data;
    } catch (error: any) {
      return rejectWithValue({
        error: error.message || "Failed to reset password.",
        errors: [],
      });
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
    resetForgotPasswordState: (state) => {
      state.forgotPasswordLoading = false;
      state.forgotPasswordSuccess = false;
      state.forgotPasswordMessage = null;
      state.forgotPasswordError = null;
    },
    resetResetPasswordState: (state) => {
      state.resetPasswordLoading = false;
      state.resetPasswordSuccess = false;
      state.resetPasswordError = null;
      state.resetPasswordValidationErrors = [];
      state.verifyTokenLoading = false;
      state.verifyTokenValid = null;
      state.verifyTokenError = null;
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
      })
      // Touch session
      .addCase(touchSessionThunk.rejected, (state) => {
        state.userId = null;
        state.role = null;
      })
      // Forgot password
      .addCase(forgotPasswordThunk.pending, (state) => {
        state.forgotPasswordLoading = true;
        state.forgotPasswordError = null;
        state.forgotPasswordSuccess = false;
        state.forgotPasswordMessage = null;
      })
      .addCase(forgotPasswordThunk.fulfilled, (state, action) => {
        state.forgotPasswordLoading = false;
        state.forgotPasswordSuccess = true;
        state.forgotPasswordMessage = action.payload.message || "If that email exists, a reset link has been sent.";
        state.forgotPasswordError = null;
      })
      .addCase(forgotPasswordThunk.rejected, (state, action) => {
        state.forgotPasswordLoading = false;
        state.forgotPasswordSuccess = false;
        state.forgotPasswordError = action.payload as string;
      })
      // Verify reset token
      .addCase(verifyResetTokenThunk.pending, (state) => {
        state.verifyTokenLoading = true;
        state.verifyTokenError = null;
        state.verifyTokenValid = null;
      })
      .addCase(verifyResetTokenThunk.fulfilled, (state) => {
        state.verifyTokenLoading = false;
        state.verifyTokenValid = true;
        state.verifyTokenError = null;
      })
      .addCase(verifyResetTokenThunk.rejected, (state, action) => {
        state.verifyTokenLoading = false;
        state.verifyTokenValid = false;
        state.verifyTokenError = action.payload as string;
      })
      // Reset password
      .addCase(resetPasswordThunk.pending, (state) => {
        state.resetPasswordLoading = true;
        state.resetPasswordError = null;
        state.resetPasswordValidationErrors = [];
        state.resetPasswordSuccess = false;
      })
      .addCase(resetPasswordThunk.fulfilled, (state) => {
        state.resetPasswordLoading = false;
        state.resetPasswordSuccess = true;
        state.resetPasswordError = null;
        state.resetPasswordValidationErrors = [];
      })
      .addCase(resetPasswordThunk.rejected, (state, action) => {
        state.resetPasswordLoading = false;
        state.resetPasswordSuccess = false;
        const payload = action.payload as { error?: string; errors?: string[] } | undefined;
        state.resetPasswordError = payload?.error || "Failed to reset password.";
        state.resetPasswordValidationErrors = payload?.errors || [];
      });
  },
});

export const {
  setSession,
  clearSession,
  setAuthError,
  resetForgotPasswordState,
  resetResetPasswordState,
} = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectAuthUserId = (state: { auth: AuthState }) => state.auth.userId;
export const selectAuthRole = (state: { auth: AuthState }) => state.auth.role;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.loading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;

export const selectForgotPasswordLoading = (state: { auth: AuthState }) => state.auth.forgotPasswordLoading;
export const selectForgotPasswordSuccess = (state: { auth: AuthState }) => state.auth.forgotPasswordSuccess;
export const selectForgotPasswordMessage = (state: { auth: AuthState }) => state.auth.forgotPasswordMessage;
export const selectForgotPasswordError = (state: { auth: AuthState }) => state.auth.forgotPasswordError;

export const selectResetPasswordLoading = (state: { auth: AuthState }) => state.auth.resetPasswordLoading;
export const selectResetPasswordSuccess = (state: { auth: AuthState }) => state.auth.resetPasswordSuccess;
export const selectResetPasswordError = (state: { auth: AuthState }) => state.auth.resetPasswordError;
export const selectResetPasswordValidationErrors = (state: { auth: AuthState }) => state.auth.resetPasswordValidationErrors;

export const selectVerifyTokenLoading = (state: { auth: AuthState }) => state.auth.verifyTokenLoading;
export const selectVerifyTokenValid = (state: { auth: AuthState }) => state.auth.verifyTokenValid;
export const selectVerifyTokenError = (state: { auth: AuthState }) => state.auth.verifyTokenError;
