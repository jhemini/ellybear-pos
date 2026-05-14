import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CartModifier {
  modifierId: string;
  name: string;
  priceAdjustment: number;
}

export interface CartItem {
  id: string;           // unique cart line ID (uuid)
  productId: string;
  variantId?: string;
  name: string;
  price: number;        // unit price including modifiers
  cost?: number;
  quantity: number;
  taxRate?: number;
  discountAmount: number;
  modifiers: CartModifier[];
  notes?: string;
  imageUrl?: string;
}

export interface AppliedDiscount {
  id?: string;
  name: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: number;
  amount: number;       // computed dollar off
}

interface CartState {
  items: CartItem[];
  customerId?: string;
  customerName?: string;
  tableId?: string;
  tableName?: string;
  orderId?: string;     // if editing an existing open order
  discounts: AppliedDiscount[];
  notes?: string;
}

const initialState: CartState = {
  items: [],
  discounts: [],
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<Omit<CartItem, 'id' | 'discountAmount'>>) {
      const { productId, variantId, modifiers } = action.payload;

      // Find existing matching line
      const existing = state.items.find(
        (i) =>
          i.productId === productId &&
          i.variantId === variantId &&
          JSON.stringify(i.modifiers) === JSON.stringify(modifiers),
      );

      if (existing) {
        existing.quantity += action.payload.quantity;
      } else {
        const { v4: uuidv4 } = require('crypto');
        state.items.push({
          ...action.payload,
          id: Math.random().toString(36).slice(2),
          discountAmount: 0,
        });
      }
    },

    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.id !== action.payload);
    },

    updateQuantity(state, action: PayloadAction<{ id: string; quantity: number }>) {
      const item = state.items.find((i) => i.id === action.payload.id);
      if (!item) return;
      if (action.payload.quantity <= 0) {
        state.items = state.items.filter((i) => i.id !== action.payload.id);
      } else {
        item.quantity = action.payload.quantity;
      }
    },

    applyItemDiscount(
      state,
      action: PayloadAction<{ id: string; discountAmount: number }>,
    ) {
      const item = state.items.find((i) => i.id === action.payload.id);
      if (item) item.discountAmount = action.payload.discountAmount;
    },

    addDiscount(state, action: PayloadAction<AppliedDiscount>) {
      const exists = state.discounts.find((d) => d.id === action.payload.id);
      if (!exists) state.discounts.push(action.payload);
    },

    removeDiscount(state, action: PayloadAction<string>) {
      state.discounts = state.discounts.filter((d) => d.id !== action.payload);
    },

    setCustomer(state, action: PayloadAction<{ id: string; name: string } | undefined>) {
      state.customerId = action.payload?.id;
      state.customerName = action.payload?.name;
    },

    setTable(state, action: PayloadAction<{ id: string; name: string } | undefined>) {
      state.tableId = action.payload?.id;
      state.tableName = action.payload?.name;
    },

    setOrderId(state, action: PayloadAction<string | undefined>) {
      state.orderId = action.payload;
    },

    setNotes(state, action: PayloadAction<string>) {
      state.notes = action.payload;
    },

    clearCart(state) {
      state.items = [];
      state.discounts = [];
      state.customerId = undefined;
      state.customerName = undefined;
      state.tableId = undefined;
      state.tableName = undefined;
      state.orderId = undefined;
      state.notes = undefined;
    },
  },
});

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectCartSubtotal = (state: { cart: CartState }) =>
  state.cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity - item.discountAmount,
    0,
  );

export const selectCartTax = (state: { cart: CartState }) =>
  state.cart.items.reduce((sum, item) => {
    const taxable = item.price * item.quantity - item.discountAmount;
    return sum + taxable * (item.taxRate ?? 0);
  }, 0);

export const selectOrderDiscountTotal = (state: { cart: CartState }) =>
  state.cart.discounts.reduce((sum, d) => sum + d.amount, 0);

export const selectCartTotal = (state: { cart: CartState }) => {
  const subtotal = selectCartSubtotal(state);
  const tax = selectCartTax(state);
  const discounts = selectOrderDiscountTotal(state);
  return Math.max(0, subtotal + tax - discounts);
};

export const {
  addItem, removeItem, updateQuantity, applyItemDiscount,
  addDiscount, removeDiscount, setCustomer, setTable,
  setOrderId, setNotes, clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;
