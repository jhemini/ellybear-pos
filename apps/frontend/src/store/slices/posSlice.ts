import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type POSView = 'grid' | 'list';
type PaymentStep = 'cart' | 'payment' | 'receipt';

interface PosState {
  selectedCategoryId: string | null;
  searchQuery: string;
  view: POSView;
  paymentStep: PaymentStep;
  isProcessing: boolean;
  lastOrderId: string | null;
  activeScan: boolean;
}

const initialState: PosState = {
  selectedCategoryId: null,
  searchQuery: '',
  view: 'grid',
  paymentStep: 'cart',
  isProcessing: false,
  lastOrderId: null,
  activeScan: false,
};

const posSlice = createSlice({
  name: 'pos',
  initialState,
  reducers: {
    setCategory(state, action: PayloadAction<string | null>) {
      state.selectedCategoryId = action.payload;
      state.searchQuery = '';
    },
    setSearch(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
      state.selectedCategoryId = null;
    },
    setView(state, action: PayloadAction<POSView>) {
      state.view = action.payload;
    },
    setPaymentStep(state, action: PayloadAction<PaymentStep>) {
      state.paymentStep = action.payload;
    },
    setProcessing(state, action: PayloadAction<boolean>) {
      state.isProcessing = action.payload;
    },
    setLastOrderId(state, action: PayloadAction<string | null>) {
      state.lastOrderId = action.payload;
    },
    toggleScan(state) {
      state.activeScan = !state.activeScan;
    },
    resetPOS(state) {
      state.paymentStep = 'cart';
      state.isProcessing = false;
      state.lastOrderId = null;
      state.searchQuery = '';
    },
  },
});

export const {
  setCategory, setSearch, setView, setPaymentStep,
  setProcessing, setLastOrderId, toggleScan, resetPOS,
} = posSlice.actions;

export default posSlice.reducer;
