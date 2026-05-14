'use client';
import { ProductGrid } from '../../../components/pos/ProductGrid';
import { Cart } from '../../../components/pos/Cart';
import { CategoryBar } from '../../../components/pos/CategoryBar';
import { POSHeader } from '../../../components/pos/POSHeader';
import { PaymentModal } from '../../../components/pos/PaymentModal';
import { useAppSelector } from '../../../store';

export default function POSPage() {
  const paymentStep = useAppSelector((s) => s.pos.paymentStep);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--color-surface-muted)' }}>
      <POSHeader />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Product browsing ── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <CategoryBar />
          <ProductGrid />
        </div>

        {/* ── Right: Cart ── */}
        <Cart />
      </div>

      {/* Payment modal overlay */}
      {paymentStep === 'payment' && <PaymentModal />}
    </div>
  );
}
