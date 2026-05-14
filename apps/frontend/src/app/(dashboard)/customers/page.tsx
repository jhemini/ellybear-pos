'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, RefreshCw, Users, Phone, Mail,
  ShoppingBag, Star, X, Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { formatCurrency } from '../../../lib/utils';
import { cn } from '../../../lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Customer {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  totalSpent: number;
  totalOrders: number;
  isActive: boolean;
  createdAt: string;
  loyaltyAccount?: { points: number; tier: string };
}

const tierColors: Record<string, string> = {
  BRONZE:   'bg-amber-100 text-amber-700',
  SILVER:   'bg-slate-100 text-slate-600',
  GOLD:     'bg-yellow-100 text-yellow-700',
  PLATINUM: 'bg-purple-100 text-purple-700',
};

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch]       = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editCustomer, setEditCustomer] = useState<Customer | 'new' | null>(null);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/customers', {
        params: { search, page, limit: LIMIT },
      });
      setCustomers(data.data || []);
      setTotalPages(Math.ceil((data.meta?.total ?? 0) / LIMIT) || 1);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--color-surface-muted)' }}>
      {/* Header */}
      <div className="bg-white px-6 py-5" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Customers</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage your customer base and loyalty</p>
          </div>
          <button onClick={() => setEditCustomer('new')} className="btn btn-primary gap-2">
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              placeholder="Search name, email, phone…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input pl-9"
            />
          </div>
          <button onClick={load} className="btn btn-ghost p-2.5" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--color-surface-muted)' }}>
                <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Contact</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3 text-right">Total spent</th>
                  <th className="px-4 py-3 text-center">Loyalty</th>
                  <th className="px-4 py-3 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((__, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 bg-gray-100 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : customers.map((c) => (
                      <motion.tr
                        key={c.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm flex-shrink-0 select-none">
                              {c.firstName[0]}{c.lastName?.[0] ?? ''}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{c.firstName} {c.lastName ?? ''}</p>
                              {!c.isActive && <span className="text-xs text-gray-400">Inactive</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            {c.email && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Mail className="w-3 h-3 text-gray-300" />
                                <span className="truncate max-w-[180px]">{c.email}</span>
                              </div>
                            )}
                            {c.phone && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Phone className="w-3 h-3 text-gray-300" />
                                {c.phone}
                              </div>
                            )}
                            {!c.email && !c.phone && <span className="text-gray-300 text-xs">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 text-gray-700">
                            <ShoppingBag className="w-3.5 h-3.5 text-gray-300" />
                            <span className="font-medium">{c.totalOrders}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {formatCurrency(Number(c.totalSpent))}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {c.loyaltyAccount ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', tierColors[c.loyaltyAccount.tier] ?? 'bg-gray-100 text-gray-500')}>
                                {c.loyaltyAccount.tier}
                              </span>
                              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                                <Star className="w-3 h-3 text-yellow-400" />
                                {c.loyaltyAccount.points.toLocaleString()} pts
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setEditCustomer(c)}
                            className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
              </tbody>
            </table>

            {!isLoading && customers.length === 0 && (
              <div className="py-16 text-center text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                <p className="font-medium text-gray-500">No customers found</p>
                <p className="text-sm mt-1">Add your first customer or they appear when they place an order</p>
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="btn btn-ghost text-sm disabled:opacity-40"
            >← Prev</button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="btn btn-ghost text-sm disabled:opacity-40"
            >Next →</button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {editCustomer !== null && (
          <CustomerModal
            key="cust-modal"
            customer={editCustomer === 'new' ? null : editCustomer}
            onClose={() => setEditCustomer(null)}
            onSuccess={() => { setEditCustomer(null); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Customer modal
// ─────────────────────────────────────────────────────────────────────────────
function CustomerModal({ customer, onClose, onSuccess }: {
  customer: Customer | null; onClose: () => void; onSuccess: () => void;
}) {
  const isEdit = !!customer;
  const [form, setForm] = useState({
    firstName: customer?.firstName ?? '',
    lastName:  customer?.lastName  ?? '',
    email:     customer?.email     ?? '',
    phone:     customer?.phone     ?? '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        firstName: form.firstName,
        lastName:  form.lastName  || undefined,
        email:     form.email     || undefined,
        phone:     form.phone     || undefined,
      };
      if (isEdit) {
        await api.patch(`/customers/${customer!.id}`, payload);
        toast.success('Customer updated');
      } else {
        await api.post('/customers', payload);
        toast.success('Customer created');
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="font-bold text-gray-900">{isEdit ? 'Edit Customer' : 'New Customer'}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">First name <span className="text-red-500">*</span></label>
              <input value={form.firstName} onChange={set('firstName')} placeholder="Jane" className="input" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name</label>
              <input value={form.lastName} onChange={set('lastName')} placeholder="Doe" className="input" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="jane@email.com" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
            <input value={form.phone} onChange={set('phone')} placeholder="+1 555 000 0000" className="input" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSaving} className="btn btn-primary flex-1">
              {isSaving ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
