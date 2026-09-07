import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getCsrfHeaders, ensureCsrfToken } from "@/lib/csrf-client";

export interface User {
  id: string;
  fullName: string;
  email?: string | null;
  role?: string | null;
}

export interface LockedUser {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  phone?: string | null;
  loginAttempts: number;
  lockoutUntil: string | null;
  updatedAt?: string | null;
}

interface UsersState {
  users: User[];
  loading: boolean;
  error: string | null;
  lockedAccounts: LockedUser[];
  loadingLocked: boolean;
  unlockingUserId: string | null;
  lockedError: string | null;
}

const initialState: UsersState = {
  users: [],
  loading: false,
  error: null,
  lockedAccounts: [],
  loadingLocked: false,
  unlockingUserId: null,
  lockedError: null,
};

export const fetchUsers = createAsyncThunk(
  "users/fetchUsers",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/data/user");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch users");
    }
  }
);

export const fetchLockedAccountsThunk = createAsyncThunk(
  "users/fetchLockedAccounts",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/admin/users/locked");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      return data.lockedAccounts || [];
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch locked accounts");
    }
  }
);

export const unlockUserAccountThunk = createAsyncThunk(
  "users/unlockUserAccount",
  async (userId: string, { rejectWithValue }) => {
    try {
      await ensureCsrfToken();
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/unlock`, {
        method: "POST",
        headers: getCsrfHeaders({ "Content-Type": "application/json" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to unlock user account.");
      }
      return { userId, message: data.message };
    } catch (error: any) {
      return rejectWithValue(error.message || "Error unlocking user account.");
    }
  }
);

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    clearUsers: (state) => {
      state.users = [];
      state.error = null;
    },
    clearLockedError: (state) => {
      state.lockedError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.users = Array.isArray(action.payload) ? action.payload : [];
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch Locked Accounts
      .addCase(fetchLockedAccountsThunk.pending, (state) => {
        state.loadingLocked = true;
        state.lockedError = null;
      })
      .addCase(fetchLockedAccountsThunk.fulfilled, (state, action) => {
        state.lockedAccounts = action.payload;
        state.loadingLocked = false;
        state.lockedError = null;
      })
      .addCase(fetchLockedAccountsThunk.rejected, (state, action) => {
        state.loadingLocked = false;
        state.lockedError = action.payload as string;
      })

      // Unlock Account
      .addCase(unlockUserAccountThunk.pending, (state, action) => {
        state.unlockingUserId = action.meta.arg;
        state.lockedError = null;
      })
      .addCase(unlockUserAccountThunk.fulfilled, (state, action) => {
        state.unlockingUserId = null;
        state.lockedAccounts = state.lockedAccounts.filter(
          (acc) => acc.userId !== action.payload.userId
        );
      })
      .addCase(unlockUserAccountThunk.rejected, (state, action) => {
        state.unlockingUserId = null;
        state.lockedError = action.payload as string;
      });
  },
});

export const { clearUsers, clearLockedError } = usersSlice.actions;
export default usersSlice.reducer;

export const selectUsers = (state: { users: UsersState }) => state.users.users;
export const selectUsersLoading = (state: { users: UsersState }) => state.users.loading;
export const selectUsersError = (state: { users: UsersState }) => state.users.error;

export const selectLockedAccounts = (state: { users: UsersState }) => state.users.lockedAccounts;
export const selectLockedLoading = (state: { users: UsersState }) => state.users.loadingLocked;
export const selectUnlockingUserId = (state: { users: UsersState }) => state.users.unlockingUserId;
export const selectLockedError = (state: { users: UsersState }) => state.users.lockedError;