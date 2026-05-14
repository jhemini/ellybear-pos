'use client';
import { useState } from 'react';
import { Trash2, Plus, Minus, ChevronRight, UserCircle, Tag,
         Receipt, Banknote, CreditCard, Smartphone, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  removeItem, updateQuantity, clearCart,
  selectCartSubtotal, selectCartTax, selectCartTotal, selectOrderDiscountTotal,
} from '../../store/slices/cartSlice';
import { setPaymentStep } from '../../store/slices/posSlice';
import { formatCurrency } from '../../lib/utils';
import { cn } from '../../lib/utils';

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash',   icon: Banknote   },
  { key: 'card', label: 'Card',   icon: CreditCard },
  { key: 'qr',   label: 'QR Pay', icon: Smartphone },
] as const;

export function Cart() {
  const dispatch      = useAppDispatch();
  const items         = useAppSelector((s) => s.cart.items);
  const customerName  = useAppSelector((s) => s.cart.customerName);
  const tableName     = useAppSelector((s) => s.cart.tableName);
  const subtotal      = useAppSelector(selectCartSubtotal);
  const tax           = useAppSelector(selectCartTax);
  const discounts     = useAppSelector(selectOrderDiscountTotal);
  const total         = useAppSelector(selectCartTotal);

  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'qr'>('cash');

  const isEmpty = items.length === 0;

  return (
    <aside
      className="flex flex-col bg-white flex-shrink-0"
      style={{
        width: '400px',
        borderLeft: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-panel)',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
            <ShoppingBag className="w-4.5 h-4.5 text-brand-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-base leading-tight">Current Order</h2>
            <p className="text-xs text-gray-400 leading-tight">
              {isEmpty ? 'Empty' : `${items.length} item${items.length > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center
                       text-gray-400 hover:text-gray-700 transition-colors"
            title="Attach customer"
          >
            <UserCircle className="w-4 h-4" />
          </button>
          <button
            className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center
                       text-gray-400 hover:text-gray-700 transition-colors"
            title="Apply discount"
          >
            <Tag className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {!isEmpty && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => dispatch(clearCart())}
                className="w-8 h-8 rounded-xl hover:bg-red-50 flex items-center justify-center
                           text-gray-400 hover:text-red-500 transition-colors"
                title="Clear order"
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Customer / table badge */}
      <AnimatePresence>
        {(customerName || tableName) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-50 flex-shrink-0 overflow-hidden"
            style={{ borderBottom: '1px solid #ffe4e2' }}
          >
            {customerName && (
              <span className="badge badge-blue text-xs">{customerName}</span>
            )}
            {tableName && (
              <span className="badge badge-gray text-xs">Table: {tableName}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Item list ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gray-50 flex items-center justify-center"
                 style={{ border: '2px dashed var(--color-border)' }}>
              <Receipt className="w-8 h-8 text-gray-200" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">No items yet</p>
              <p className="text-xs text-gray-400 mt-1">Tap a product on the left to add it here</p>
            </div>
          </div>
        ) : (
          <motion.ul layout className="px-3 py-3 space-y-1.5">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <CartLineItem key={item.id} item={item} />
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>

      {/* ── Footer: totals + payment ─────────────────────────────────────── */}
      <AnimatePresence>
        {!isEmpty && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0,  opacity: 1 }}
            className="flex-shrink-0 px-5 pt-4 pb-5 space-y-4"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discounts > 0 && (
                <div className="flex justify-between text-sm text-green-600 font-medium">
                  <span>Discount</span>
                  <span>-{formatCurrency(discounts)}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Tax</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
              )}
              <div
                className="flex justify-between text-lg font-bold text-gray-900 pt-3"
                style={{ borderTop: '2px dashed var(--color-border)' }}
              >
                <span>Total</span>
                <span className="text-brand-700">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Payment method
              </p>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setPayMethod(key)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 text-xs font-semibold transition-all',
                      payMethod === key
                        ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                        : 'border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100',
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Charge button */}
            <button
              onClick={() => dispatch(setPaymentStep('payment'))}
              className="w-full flex items-center justify-between btn btn-primary btn-xl font-bold text-base px-5"
            >
              <span>Charge</span>
              <span className="flex items-center gap-1">
                {formatCurrency(total)}
                <ChevronRight className="w-5 h-5" />
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}

// ─── Cart line item ───────────────────────────────────────────────────────────
function CartLineItem({ item }: { item: any }) {
  const dispatch = useAppDispatch();
  const lineTotal = item.price * item.quantity;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: 20, height: 0 }}
      animate={{ opacity: 1, x: 0,  height: 'auto' }}
      exit={{    opacity: 0, x: 20, height: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3 p-3 rounded-2xl hover:bg-gray-50 group transition-colors"
    >
      {/* Thumbnail */}
      <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {item.imageUrl
          ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
          : <span className="text-base select-none">🍽️</span>
        }
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{item.name}</p>
        {item.modifiers?.map((m: any) => (
          <p key={m.modifierId} className="text-xs text-gray-400 truncate leading-tight">
            + {m.name}{m.priceAdjustment > 0 && ` (${formatCurrency(m.priceAdjustment)})`}
          </p>
        ))}
        <p className="text-sm font-bold text-brand-600 mt-1">{formatCurrency(lineTotal)}</p>
      </div>

      {/* Quantity controls + delete */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <button
          onClick={() => dispatch(removeItem(item.id))}
          className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-md flex items-center justify-center
                     text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
        >
          <Trash2 className="w-3 h-3" />
        </button>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity - 1 }))}
            className="w-7 h-7 rounded-xl border-2 border-gray-200 flex items-center justify-center
                       text-gray-500 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-sm font-bold text-gray-900 w-5 text-center tabular-nums select-none">
            {item.quantity}
          </span>
          <button
            onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity + 1 }))}
            className="w-7 h-7 rounded-xl bg-brand-600 text-white flex items-center justify-center
                       hover:bg-brand-700 transition-colors shadow-sm"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.li>
  );
}
