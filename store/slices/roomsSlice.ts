import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export interface Room {
  id: string;
  roomName: string;
}

interface RoomsState {
  rooms: Room[];
  loading: boolean;
  error: string | null;
}

const initialState: RoomsState = {
  rooms: [],
  loading: false,
  error: null,
};

export const fetchRooms = createAsyncThunk(
  "rooms/fetchRooms",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/data/room");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch rooms");
    }
  }
);

const roomsSlice = createSlice({
  name: "rooms",
  initialState,
  reducers: {
    clearRooms: (state) => {
      state.rooms = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRooms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRooms.fulfilled, (state, action) => {
        state.rooms = Array.isArray(action.payload) ? action.payload : [];
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchRooms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearRooms } = roomsSlice.actions;
export default roomsSlice.reducer;

export const selectRooms = (state: { rooms: RoomsState }) => state.rooms.rooms;
export const selectRoomsLoading = (state: { rooms: RoomsState }) => state.rooms.loading;
export const selectRoomsError = (state: { rooms: RoomsState }) => state.rooms.error;