import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface OfflineState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncAt: string | null;
}

const initialState: OfflineState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingCount: 0,
  isSyncing: false,
  lastSyncAt: null,
};

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setOnline(state, action: PayloadAction<boolean>) {
      state.isOnline = action.payload;
    },
    setPendingCount(state, action: PayloadAction<number>) {
      state.pendingCount = action.payload;
    },
    setSyncing(state, action: PayloadAction<boolean>) {
      state.isSyncing = action.payload;
    },
    setSyncedAt(state) {
      state.lastSyncAt = new Date().toISOString();
      state.isSyncing = false;
      state.pendingCount = 0;
    },
  },
});

export const { setOnline, setPendingCount, setSyncing, setSyncedAt } = offlineSlice.actions;
export default offlineSlice.reducer;
