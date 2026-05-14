'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Store, Percent, Tag, Plus, Pencil, Trash2, X, RefreshCw, Save,
  Globe, Phone, Mail, MapPin, Clock, DollarSign,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { useAppSelector } from '../../../store';
import { cn } from '../../../lib/utils';
import { AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface StoreInfo {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  postalCode?: string;
  timezone: string;
  phone?: string;
  email?: string;
  currency: string;
}

interface TaxRate {
  id: string;
  name: string;
  rate: number;
  isDefault: boolean;
  isActive: boolean;
}

interface Category {
  id: string;
  name: string;
  color?: string;
  description?: string;
  sortOrder: number;
}

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Manila', 'Asia/Singapore', 'Asia/Tokyo',
  'Europe/London', 'Europe/Paris', 'Australia/Sydney',
];

const CURRENCIES = ['USD', 'PHP', 'EUR', 'GBP', 'SGD', 'AUD', 'JPY', 'CAD'];

const CATEGORY_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
  '#64748b', '#a16207',
];

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<'store' | 'taxes' | 'categories'>('store');

  const sections = [
    { key: 'store'      as const, label: 'Store Info',   icon: Store   },
    { key: 'taxes'      as const, label: 'Tax Rates',    icon: Percent  },
    { key: 'categories' as const, label: 'Categories',   icon: Tag      },
  ];

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--color-surface-muted)' }}>
      {/* ── Left nav ─────────────────────────────────────────────────────── */}
      <div className="w-48 bg-white flex-shrink-0 py-4" style={{ borderRight: '1px solid var(--color-border)' }}>
        <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Settings</p>
        <ul className="space-y-0.5 px-2">
          {sections.map((s) => (
            <li key={s.key}>
              <button
                onClick={() => setActiveSection(s.key)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                  activeSection === s.key
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
                )}
              >
                <s.icon className="w-4 h-4 flex-shrink-0" />
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {activeSection === 'store'      && <StoreInfoSection />}
        {activeSection === 'taxes'      && <TaxRatesSection />}
        {activeSection === 'categories' && <CategoriesSection />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Store info section
// ─────────────────────────────────────────────────────────────────────────────
function StoreInfoSection() {
  const user = useAppSelector((s) => s.auth.user);
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [form, setForm]   = useState<Partial<StoreInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving]   = useState(false);

  useEffect(() => {
    if (!user?.storeId) return;
    (async () => {
      try {
        const { data } = await api.get(`/stores/${user.storeId}`);
        setStore(data.data);
        setForm(data.data);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user?.storeId]);

  const set = (key: keyof StoreInfo) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.storeId) return;
    setIsSaving(true);
    try {
      await api.patch(`/stores/${user.storeId}`, form);
      toast.success('Store settings saved');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-4 max-w-xl">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-8">
      <div className="max-w-xl">
        <div className="flex items-center gap-2 mb-6">
          <Store className="w-5 h-5 text-brand-600" />
          <h2 className="text-lg font-bold text-gray-900">Store Information</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Store name" required icon={Store}>
            <input value={form.name ?? ''} onChange={set('name')} className="input" required placeholder="My Cafe" />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Phone" icon={Phone}>
              <input value={form.phone ?? ''} onChange={set('phone')} className="input" placeholder="+1 555 000 0000" />
            </FormField>
            <FormField label="Email" icon={Mail}>
              <input type="email" value={form.email ?? ''} onChange={set('email')} className="input" placeholder="store@cafe.com" />
            </FormField>
          </div>

          <FormField label="Address" icon={MapPin}>
            <input value={form.address ?? ''} onChange={set('address')} className="input" placeholder="123 Main Street" />
          </FormField>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="City">
              <input value={form.city ?? ''} onChange={set('city')} className="input" placeholder="New York" />
            </FormField>
            <FormField label="State">
              <input value={form.state ?? ''} onChange={set('state')} className="input" placeholder="NY" />
            </FormField>
            <FormField label="Postal code">
              <input value={form.postalCode ?? ''} onChange={set('postalCode')} className="input" placeholder="10001" />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Currency" icon={DollarSign}>
              <select value={form.currency ?? 'USD'} onChange={set('currency')} className="input">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="Timezone" icon={Clock}>
              <select value={form.timezone ?? 'UTC'} onChange={set('timezone')} className="input">
                {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormField>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={isSaving} className="btn btn-primary gap-2">
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tax rates section
// ─────────────────────────────────────────────────────────────────────────────
function TaxRatesSection() {
  const [rates, setRates]     = useState<TaxRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editRate, setEditRate]   = useState<TaxRate | 'new' | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/products/tax-rates');
      setRates(data.data || []);
    } catch {
      setRates([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/products/tax-rates/${id}`);
      toast.success('Tax rate deleted');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-8">
      <div className="max-w-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-bold text-gray-900">Tax Rates</h2>
          </div>
          <button onClick={() => setEditRate('new')} className="btn btn-primary gap-2 text-sm">
            <Plus className="w-4 h-4" /> Add rate
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : rates.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Percent className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p>No tax rates configured</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rates.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl"
                style={{ border: '1px solid var(--color-border)' }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{r.name}</p>
                    {r.isDefault && <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">Default</span>}
                    {!r.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>}
                  </div>
                  <p className="text-sm text-gray-500">{(Number(r.rate) * 100).toFixed(2)}%</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditRate(r)}
                          className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(r.id)}
                          className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {editRate !== null && (
            <TaxRateModal
              rate={editRate === 'new' ? null : editRate}
              onClose={() => setEditRate(null)}
              onSuccess={() => { setEditRate(null); load(); }}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function TaxRateModal({ rate, onClose, onSuccess }: {
  rate: TaxRate | null; onClose: () => void; onSuccess: () => void;
}) {
  const [name, setName]         = useState(rate?.name ?? '');
  const [rateVal, setRateVal]   = useState(rate ? String(Number(rate.rate) * 100) : '');
  const [isDefault, setIsDefault] = useState(rate?.isDefault ?? false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = { name, rate: parseFloat(rateVal) / 100, isDefault };
      if (rate) {
        await api.patch(`/products/tax-rates/${rate.id}`, payload);
        toast.success('Tax rate updated');
      } else {
        await api.post('/products/tax-rates', payload);
        toast.success('Tax rate created');
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
          <h3 className="font-bold text-gray-900">{rate ? 'Edit Tax Rate' : 'New Tax Rate'}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. VAT" className="input" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Rate (%)</label>
            <input type="number" min="0" max="100" step="0.01" value={rateVal}
                   onChange={(e) => setRateVal(e.target.value)} placeholder="e.g. 12" className="input" required />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)}
                   className="w-4 h-4 accent-brand-600 rounded" />
            <span className="text-sm text-gray-700">Set as default</span>
          </label>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSaving} className="btn btn-primary flex-1">
              {isSaving ? 'Saving…' : rate ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Categories section
// ─────────────────────────────────────────────────────────────────────────────
function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [editCat, setEditCat]       = useState<Category | 'new' | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/products/categories');
      setCategories(data.data || []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/products/categories/${id}`);
      toast.success('Category deleted');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-8">
      <div className="max-w-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-bold text-gray-900">Product Categories</h2>
          </div>
          <button onClick={() => setEditCat('new')} className="btn btn-primary gap-2 text-sm">
            <Plus className="w-4 h-4" /> Add category
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Tag className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p>No categories yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl"
                style={{ border: '1px solid var(--color-border)' }}
              >
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ background: cat.color ?? '#94a3b8' }}
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{cat.name}</p>
                  {cat.description && <p className="text-xs text-gray-400 truncate">{cat.description}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditCat(cat)}
                          className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(cat.id)}
                          className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {editCat !== null && (
            <CategoryModal
              category={editCat === 'new' ? null : editCat}
              onClose={() => setEditCat(null)}
              onSuccess={() => { setEditCat(null); load(); }}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function CategoryModal({ category, onClose, onSuccess }: {
  category: Category | null; onClose: () => void; onSuccess: () => void;
}) {
  const [name, setName]           = useState(category?.name ?? '');
  const [description, setDesc]    = useState(category?.description ?? '');
  const [color, setColor]         = useState(category?.color ?? CATEGORY_COLORS[0]);
  const [isSaving, setIsSaving]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = { name, description: description || undefined, color };
      if (category) {
        await api.patch(`/products/categories/${category.id}`, payload);
        toast.success('Category updated');
      } else {
        await api.post('/products/categories', payload);
        toast.success('Category created');
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
          <h3 className="font-bold text-gray-900">{category ? 'Edit Category' : 'New Category'}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Beverages" className="input" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <input value={description} onChange={(e) => setDesc(e.target.value)} placeholder="Optional" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn('w-7 h-7 rounded-full transition-transform', color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105')}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSaving} className="btn btn-primary flex-1">
              {isSaving ? 'Saving…' : category ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable form field wrapper
// ─────────────────────────────────────────────────────────────────────────────
function FormField({ label, required, icon: Icon, children }: {
  label: string; required?: boolean; icon?: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {Icon && <Icon className="inline w-3.5 h-3.5 mr-1 text-gray-400" />}
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
