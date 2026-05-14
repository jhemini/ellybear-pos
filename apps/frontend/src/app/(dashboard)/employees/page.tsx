'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Pencil, Trash2, RefreshCw, X,
  UserCog, Phone, Mail, Store, Key,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { useAppSelector } from '../../../store';
import { cn } from '../../../lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface StoreRef { id: string; name: string; }
interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: EmployeeRole;
  isActive: boolean;
  hourlyWage?: number;
  createdAt: string;
  storeEmployees: { store: StoreRef }[];
}

type EmployeeRole =
  | 'OWNER' | 'MANAGER' | 'CASHIER'
  | 'WAITER' | 'KITCHEN_STAFF' | 'INVENTORY_MANAGER';

const ALL_ROLES: EmployeeRole[] = [
  'OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN_STAFF', 'INVENTORY_MANAGER',
];

const roleMeta: Record<EmployeeRole, { label: string; color: string }> = {
  OWNER:             { label: 'Owner',             color: 'bg-red-100 text-red-700 border-red-200'         },
  MANAGER:           { label: 'Manager',           color: 'bg-orange-100 text-orange-700 border-orange-200' },
  CASHIER:           { label: 'Cashier',           color: 'bg-blue-100 text-blue-700 border-blue-200'       },
  WAITER:            { label: 'Waiter',            color: 'bg-green-100 text-green-700 border-green-200'    },
  KITCHEN_STAFF:     { label: 'Kitchen Staff',     color: 'bg-purple-100 text-purple-700 border-purple-200' },
  INVENTORY_MANAGER: { label: 'Inv. Manager',      color: 'bg-teal-100 text-teal-700 border-teal-200'       },
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const user = useAppSelector((s) => s.auth.user);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores]       = useState<StoreRef[]>([]);
  const [search, setSearch]       = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editEmp, setEditEmp]     = useState<Employee | 'new' | null>(null);
  const [deleteId, setDeleteId]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [empRes, storeRes] = await Promise.all([
        api.get('/employees', { params: { limit: 100, search } }),
        api.get('/stores'),
      ]);
      setEmployees(empRes.data.data || []);
      setStores(storeRes.data.data || []);
    } catch {
      toast.error('Failed to load employees');
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/employees/${id}`);
      toast.success('Employee removed');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleteId(null);
    }
  };

  const canEdit   = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const canDelete = user?.role === 'OWNER';

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--color-surface-muted)' }}>
      {/* Header */}
      <div className="bg-white px-6 py-5" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Employees</h1>
            <p className="text-sm text-gray-400 mt-0.5">{employees.length} team members</p>
          </div>
          {canEdit && (
            <button onClick={() => setEditEmp('new')} className="btn btn-primary gap-2">
              <Plus className="w-4 h-4" /> Add Employee
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>
          <button onClick={load} className="btn btn-ghost p-2.5" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Employee cards grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 animate-pulse space-y-3"
                   style={{ border: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <UserCog className="w-12 h-12 mb-3 text-gray-200" />
            <p className="font-medium text-gray-500">No employees yet</p>
            <p className="text-sm mt-1">Add your first team member to get started</p>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {employees.map((emp) => (
              <motion.div
                key={emp.id}
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }}
              >
                <EmployeeCard
                  emp={emp}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onEdit={() => setEditEmp(emp)}
                  onDelete={() => setDeleteId(emp.id)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {editEmp !== null && (
          <EmployeeModal
            key="emp-modal"
            employee={editEmp === 'new' ? null : editEmp}
            stores={stores}
            defaultStoreId={user?.storeId}
            onClose={() => setEditEmp(null)}
            onSuccess={() => { setEditEmp(null); load(); }}
          />
        )}
        {deleteId && (
          <ConfirmModal
            key="del-modal"
            message="Remove this employee? They will lose access to the system."
            onConfirm={() => handleDelete(deleteId)}
            onCancel={() => setDeleteId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Employee card
// ─────────────────────────────────────────────────────────────────────────────
function EmployeeCard({ emp, canEdit, canDelete, onEdit, onDelete }: {
  emp: Employee;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = roleMeta[emp.role];
  const initials = `${emp.firstName[0]}${emp.lastName?.[0] ?? ''}`;
  const avatarColors: Record<EmployeeRole, string> = {
    OWNER:             'bg-red-100 text-red-700',
    MANAGER:           'bg-orange-100 text-orange-700',
    CASHIER:           'bg-blue-100 text-blue-700',
    WAITER:            'bg-green-100 text-green-700',
    KITCHEN_STAFF:     'bg-purple-100 text-purple-700',
    INVENTORY_MANAGER: 'bg-teal-100 text-teal-700',
  };

  return (
    <div
      className={cn(
        'bg-white rounded-2xl p-5 flex flex-col gap-4 transition-shadow hover:shadow-md',
        !emp.isActive && 'opacity-60',
      )}
      style={{ border: '1px solid var(--color-border)' }}
    >
      {/* Top: avatar + name + role badge */}
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg select-none flex-shrink-0',
          avatarColors[emp.role],
        )}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{emp.firstName} {emp.lastName}</p>
          <span className={cn('inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold border', meta.color)}>
            {meta.label}
          </span>
          {!emp.isActive && (
            <span className="ml-1.5 inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
              Inactive
            </span>
          )}
        </div>
        {/* Actions */}
        {(canEdit || canDelete) && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {canEdit && (
              <button
                onClick={onEdit}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={onDelete}
                className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                title="Remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Contact info */}
      <div className="space-y-1.5 text-sm text-gray-500">
        <div className="flex items-center gap-2 truncate">
          <Mail className="w-3.5 h-3.5 flex-shrink-0 text-gray-300" />
          <span className="truncate">{emp.email}</span>
        </div>
        {emp.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 flex-shrink-0 text-gray-300" />
            <span>{emp.phone}</span>
          </div>
        )}
      </div>

      {/* Assigned stores */}
      {emp.storeEmployees.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Store className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
          {emp.storeEmployees.map((se) => (
            <span key={se.store.id} className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">
              {se.store.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Employee modal (create / edit)
// ─────────────────────────────────────────────────────────────────────────────
function EmployeeModal({ employee, stores, defaultStoreId, onClose, onSuccess }: {
  employee: Employee | null;
  stores: StoreRef[];
  defaultStoreId?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!employee;
  const [form, setForm] = useState({
    firstName: employee?.firstName ?? '',
    lastName:  employee?.lastName  ?? '',
    email:     employee?.email     ?? '',
    phone:     employee?.phone     ?? '',
    role:      (employee?.role ?? 'CASHIER') as EmployeeRole,
    password:  '',
    pin:       '',
    hourlyWage: employee?.hourlyWage != null ? String(employee.hourlyWage) : '',
    storeIds:  employee?.storeEmployees.map((se) => se.store.id) ?? (defaultStoreId ? [defaultStoreId] : []),
  });
  const [isLoading, setIsLoading] = useState(false);

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleStore = (id: string) =>
    setForm((f) => ({
      ...f,
      storeIds: f.storeIds.includes(id)
        ? f.storeIds.filter((s) => s !== id)
        : [...f.storeIds, id],
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEdit && !form.password) { toast.error('Password is required'); return; }
    setIsLoading(true);
    try {
      const payload: any = {
        firstName:  form.firstName,
        lastName:   form.lastName,
        phone:      form.phone || undefined,
        role:       form.role,
        storeIds:   form.storeIds,
        hourlyWage: form.hourlyWage ? parseFloat(form.hourlyWage) : undefined,
      };
      if (!isEdit) { payload.email = form.email; payload.password = form.password; }
      if (form.pin)  payload.pin  = form.pin;

      if (isEdit) {
        await api.patch(`/employees/${employee!.id}`, payload);
        toast.success('Employee updated');
      } else {
        await api.post('/employees', payload);
        toast.success('Employee created');
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setIsLoading(false);
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
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
             style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="font-bold text-lg text-gray-900">
            {isEdit ? 'Edit Employee' : 'Add Employee'}
          </h2>
          <button onClick={onClose}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                First name <span className="text-red-500">*</span>
              </label>
              <input value={form.firstName} onChange={set('firstName')} placeholder="Jane" className="input" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name</label>
              <input value={form.lastName} onChange={set('lastName')} placeholder="Doe" className="input" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <input type="email" value={form.email} onChange={set('email')}
                   placeholder="jane@cafe.com" className="input" required disabled={isEdit} />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
            <input value={form.phone} onChange={set('phone')} placeholder="+1 555 000 0000" className="input" />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Role <span className="text-red-500">*</span>
            </label>
            <select value={form.role} onChange={set('role')} className="input">
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>{roleMeta[r].label}</option>
              ))}
            </select>
          </div>

          {/* Password (create only) + PIN */}
          <div className="grid grid-cols-2 gap-3">
            {!isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <input type="password" value={form.password} onChange={set('password')}
                       placeholder="Min 8 chars" className="input" required minLength={8} />
              </div>
            )}
            <div className={isEdit ? 'col-span-2' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Key className="inline w-3.5 h-3.5 mr-1 text-gray-400" />
                POS PIN <span className="text-xs font-normal text-gray-400">(4–6 digits)</span>
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={form.pin}
                onChange={set('pin')}
                placeholder={isEdit ? 'Leave blank to keep current' : '1234'}
                className="input tracking-widest"
              />
            </div>
          </div>

          {/* Hourly wage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Hourly wage (optional)</label>
            <input type="number" min="0" step="0.01" value={form.hourlyWage} onChange={set('hourlyWage')}
                   placeholder="0.00" className="input" />
          </div>

          {/* Store assignment */}
          {stores.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assigned stores <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {stores.map((s) => (
                  <label key={s.id} className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.storeIds.includes(s.id)}
                      onChange={() => toggleStore(s.id)}
                      className="w-4 h-4 accent-brand-600 rounded"
                    />
                    <span className="text-sm text-gray-700">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isLoading} className="btn btn-primary flex-1">
              {isLoading ? 'Saving…' : isEdit ? 'Save changes' : 'Create employee'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Confirm modal
// ─────────────────────────────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }: {
  message: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4"
      >
        <p className="text-sm text-gray-700">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn btn-secondary flex-1">Cancel</button>
          <button onClick={onConfirm} className="btn btn-danger flex-1">Remove</button>
        </div>
      </motion.div>
    </div>
  );
}
