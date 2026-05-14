'use client';
import { useState } from 'react';
import { X, CreditCard, Banknote, Smartphone, Check, Loader2,
         Delete, ChevronLeft, Printer, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store';
import { clearCart, selectCartTotal } from '../../store/slices/cartSlice';
import { setPaymentStep, setProcessing, setLastOrderId, resetPOS } from '../../store/slices/posSlice';
import { api } from '../../lib/api';
import { offlineQueue } from '../../lib/offlineQueue';
import { formatCurrency, generateId } from '../../lib/utils';
import { cn } from '../../lib/utils';

type PaymentMethod = 'CASH' | 'CARD' | 'MOBILE_PAYMENT';

interface PaymentEntry { method: PaymentMethod; amount: number; }

const METHOD_CONFIG = [
  { id: 'CASH'           as PaymentMethod, label: 'Cash',   icon: Banknote    },
  { id: 'CARD'           as PaymentMethod, label: 'Card',   icon: CreditCard  },
  { id: 'MOBILE_PAYMENT' as PaymentMethod, label: 'Mobile', icon: Smartphone  },
];

const NUMPAD = ['1','2','3','4','5','6','7','8','9','.','0','⌫'] as const;

const modalVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 16 },
  show:   { opacity: 1, scale: 1,    y: 0,
             transition: { type: 'spring' as const, stiffness: 320, damping: 28 } },
  exit:   { opacity: 0, scale: 0.96, y: 16,
             transition: { duration: 0.18 } },
};

export function PaymentModal() {
  const dispatch     = useAppDispatch();
  const total        = useAppSelector(selectCartTotal);
  const cart         = useAppSelector((s) => s.cart);
  const { isProcessing } = useAppSelector((s) => s.pos);
  const { isOnline } = useAppSelector((s) => s.offline);
  const employee     = useAppSelector((s) => s.auth.user);

  const [screen, setScreen]           = useState<'payment' | 'receipt'>('payment');
  const [selectedMethod, setMethod]   = useState<PaymentMethod>('CASH');
  const [numpadInput, setNumpadInput] = useState('');
  const [payments, setPayments]       = useState<PaymentEntry[]>([]);
  const [receiptOrderNum, setReceiptOrderNum] = useState('');
  const [changeAmount, setChangeAmount] = useState(0);

  const paidAmount = payments.reduce((s, p) => s + p.amount, 0);
  const remaining  = Math.max(0, total - paidAmount);
  const change     = Math.max(0, paidAmount - total);

  // Effective cash display: what's been typed or remaining
  const displayedCash = numpadInput ? parseFloat(numpadInput) || 0 : remaining;

  // Quick amounts for cash
  const quickAmounts = [
    Math.ceil(total),
    Math.ceil(total / 5) * 5,
    Math.ceil(total / 10) * 10,
    Math.ceil(total / 50) * 50,
  ].filter((v, i, a) => v > 0 && a.indexOf(v) === i).slice(0, 4);

  const handleNumpad = (key: typeof NUMPAD[number]) => {
    if (key === '⌫') {
      setNumpadInput((s) => s.slice(0, -1));
    } else if (key === '.') {
      if (!numpadInput.includes('.')) setNumpadInput((s) => s + '.');
    } else {
      // Prevent more than 2 decimal places
      const parts = numpadInput.split('.');
      if (parts[1]?.length >= 2) return;
      setNumpadInput((s) => s + key);
    }
  };

  const addPayment = () => {
    const amount = parseFloat(numpadInput) || remaining;
    if (amount <= 0) return;
    setPayments((p) => [...p, { method: selectedMethod, amount }]);
    setNumpadInput('');
  };

  const handleCharge = async () => {
    // Auto-add remaining if nothing manually entered
    const finalPayments = payments.length === 0
      ? [{ method: selectedMethod, amount: displayedCash }]
      : payments;

    const finalPaid = finalPayments.reduce((s, p) => s + p.amount, 0);
    if (finalPaid < total) {
      toast.error('Payment amount is insufficient');
      return;
    }

    const storeId = employee?.storeId;
    if (!storeId) {
      toast.error('No store assigned to your account. Please sign out and sign back in.');
      return;
    }

    dispatch(setProcessing(true));
    try {
      const orderPayload = {
        storeId,
        type:        cart.tableId ? 'DINE_IN' : 'TAKEAWAY',
        customerId:  cart.customerId,
        tableId:     cart.tableId,
        notes:       cart.notes,
        discountIds: cart.discounts.filter((d) => d.id).map((d) => d.id!),
        items:       cart.items.map((i) => ({
          productId:      i.productId,
          variantId:      i.variantId,
          quantity:       i.quantity,
          modifiers:      i.modifiers,
          notes:          i.notes,
          discountAmount: i.discountAmount,
        })),
      };

      let orderId: string;
      let orderNumber = '#' + Math.floor(Math.random() * 9000 + 1000);

      if (isOnline) {
        const { data: orderData } = await api.post('/orders', orderPayload);
        orderId     = orderData.data.id;
        orderNumber = '#' + (orderData.data.orderNumber ?? orderId.slice(-4));

        for (const payment of finalPayments) {
          await api.post(`/orders/${orderId}/payment`, {
            method: payment.method,
            amount: payment.amount,
          });
        }
      } else {
        const offlineId = generateId();
        orderId         = offlineId;
        await offlineQueue.enqueue({
          offlineId,
          ...orderPayload,
          payments: finalPayments,
          isOffline: true,
          createdAt: new Date().toISOString(),
        });
      }

      setChangeAmount(Math.max(0, finalPaid - total));
      setReceiptOrderNum(orderNumber);
      dispatch(setLastOrderId(orderId));
      dispatch(clearCart());
      setScreen('receipt');
      toast.success(isOnline ? 'Payment complete!' : 'Order saved offline');
    } catch (err: any) {
      const raw = err.response?.data?.message;
      const msg = Array.isArray(raw) ? raw.join(', ') : raw || err.message || 'Payment failed. Please try again.';
      console.error('Checkout error:', err.response?.data ?? err);
      toast.error(msg);
    } finally {
      dispatch(setProcessing(false));
    }
  };

  const handleNewOrder = () => {
    dispatch(resetPOS());
    dispatch(setPaymentStep('cart'));
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {screen === 'receipt' ? (
          <ReceiptScreen
            key="receipt"
            orderNumber={receiptOrderNum}
            total={total}
            change={changeAmount}
            isOnline={isOnline}
            onNewOrder={handleNewOrder}
          />
        ) : (
          <motion.div
            key="payment"
            variants={modalVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5"
                 style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => dispatch(setPaymentStep('cart'))}
                  className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="text-lg font-bold text-gray-900">Payment</h2>
              </div>
              <button
                onClick={() => dispatch(setPaymentStep('cart'))}
                className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Total due */}
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total due</p>
                <p className="text-4xl font-bold text-gray-900 mt-1 tabular-nums">
                  {formatCurrency(total)}
                </p>
              </div>

              {/* Method selector */}
              <div className="grid grid-cols-3 gap-2">
                {METHOD_CONFIG.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => { setMethod(id); setNumpadInput(''); setPayments([]); }}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 text-sm font-semibold transition-all',
                      selectedMethod === id
                        ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                        : 'border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100',
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Cash numpad */}
              {selectedMethod === 'CASH' && (
                <div className="space-y-3">
                  {/* Display */}
                  <div
                    className="flex items-center justify-between px-4 py-3 rounded-2xl bg-gray-50"
                    style={{ border: '2px solid var(--color-border)' }}
                  >
                    <span className="text-sm text-gray-400">Cash received</span>
                    <span className="text-2xl font-bold text-gray-900 tabular-nums">
                      {numpadInput ? formatCurrency(parseFloat(numpadInput) || 0) : formatCurrency(remaining)}
                    </span>
                  </div>

                  {/* Quick amounts */}
                  <div className="grid grid-cols-4 gap-2">
                    {quickAmounts.map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setNumpadInput(String(amt))}
                        className="py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold
                                   text-gray-700 transition-colors tabular-nums"
                      >
                        {formatCurrency(amt)}
                      </button>
                    ))}
                  </div>

                  {/* Numpad */}
                  <div className="grid grid-cols-3 gap-2">
                    {NUMPAD.map((key) => (
                      <button
                        key={key}
                        onClick={() => handleNumpad(key)}
                        className={cn(
                          'py-3.5 rounded-2xl text-lg font-semibold transition-all active:scale-95',
                          key === '⌫'
                            ? 'bg-red-50 text-red-500 hover:bg-red-100'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200',
                        )}
                      >
                        {key === '⌫' ? <Delete className="w-5 h-5 mx-auto" /> : key}
                      </button>
                    ))}
                  </div>

                  {/* Change preview */}
                  <AnimatePresence>
                    {(parseFloat(numpadInput) || 0) > total && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center justify-between px-4 py-3 rounded-2xl bg-green-50"
                        style={{ border: '1px solid #bbf7d0' }}
                      >
                        <span className="text-sm font-medium text-green-700">Change due</span>
                        <span className="text-xl font-bold text-green-700 tabular-nums">
                          {formatCurrency((parseFloat(numpadInput) || 0) - total)}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Card / Mobile — no numpad needed */}
              {selectedMethod !== 'CASH' && (
                <div className="flex items-center justify-center py-6 text-gray-400">
                  <div className="text-center">
                    {selectedMethod === 'CARD'
                      ? <CreditCard className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                      : <Smartphone className="w-10 h-10 mx-auto mb-2 text-gray-200" />}
                    <p className="text-sm">Process payment on terminal</p>
                  </div>
                </div>
              )}

              {/* Split payment list */}
              <AnimatePresence>
                {payments.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    {payments.map((p, i) => (
                      <div key={i} className="flex justify-between text-sm px-4 py-2.5 rounded-xl bg-green-50">
                        <span className="text-green-700 font-medium">{p.method}</span>
                        <span className="font-bold text-green-800 tabular-nums">{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                    {remaining > 0 && (
                      <div className="flex justify-between text-sm font-semibold pt-1.5"
                           style={{ borderTop: '1px solid var(--color-border)' }}>
                        <span className="text-gray-600">Remaining</span>
                        <span className="text-red-600 tabular-nums">{formatCurrency(remaining)}</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action buttons */}
            <div className="px-6 pb-6 flex gap-3">
              {payments.length > 0 && remaining > 0 ? (
                <button onClick={addPayment} className="btn btn-secondary flex-1">
                  + Add payment
                </button>
              ) : null}
              <button
                onClick={handleCharge}
                disabled={isProcessing}
                className="btn btn-primary btn-lg flex-1 font-bold"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    {payments.length > 0 && remaining <= 0 ? 'Complete sale' : `Charge ${formatCurrency(total)}`}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Receipt / success screen ─────────────────────────────────────────────────
function ReceiptScreen({ orderNumber, total, change, isOnline, onNewOrder }: {
  orderNumber: string;
  total: number;
  change: number;
  isOnline: boolean;
  onNewOrder: () => void;
}) {
  return (
    <motion.div
      key="receipt"
      variants={modalVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden text-center"
    >
      {/* Success icon */}
      <div className="pt-10 pb-6 px-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
          className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5"
        >
          <Check className="w-10 h-10 text-green-600 stroke-[2.5]" />
        </motion.div>

        <h2 className="text-2xl font-bold text-gray-900">Payment complete</h2>
        <p className="text-gray-400 text-sm mt-1">{isOnline ? 'Order confirmed' : 'Saved offline'}</p>

        {/* Order number */}
        <div className="mt-6 px-5 py-4 rounded-2xl bg-gray-50">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Order</p>
          <p className="text-3xl font-bold text-gray-900 tabular-nums">{orderNumber}</p>
        </div>

        {/* Total + change */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="px-4 py-3 rounded-2xl bg-gray-50">
            <p className="text-xs text-gray-400 mb-0.5">Charged</p>
            <p className="text-lg font-bold text-gray-900 tabular-nums">{formatCurrency(total)}</p>
          </div>
          {change > 0 && (
            <div className="px-4 py-3 rounded-2xl bg-green-50">
              <p className="text-xs text-green-600 mb-0.5">Change</p>
              <p className="text-lg font-bold text-green-700 tabular-nums">{formatCurrency(change)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-8 pb-8 flex flex-col gap-3">
        <button className="btn btn-secondary gap-2 w-full">
          <Printer className="w-4 h-4" />
          Print receipt
        </button>
        <button
          onClick={onNewOrder}
          className="btn btn-primary btn-lg w-full font-bold gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          New order
        </button>
      </div>
    </motion.div>
  );
}
