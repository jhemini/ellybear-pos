'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Delete, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store';
import { pinLogin } from '../../store/slices/authSlice';
import { cn } from '../../lib/utils';

const NUMPAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'] as const;

const ROLE_COLOR: Record<string, string> = {
  OWNER:             'bg-red-100 text-red-700',
  MANAGER:           'bg-orange-100 text-orange-700',
  CASHIER:           'bg-blue-100 text-blue-700',
  WAITER:            'bg-green-100 text-green-700',
  KITCHEN_STAFF:     'bg-purple-100 text-purple-700',
  INVENTORY_MANAGER: 'bg-teal-100 text-teal-700',
};

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Props {
  employees: Employee[];
  onClose: () => void;
}

export function PinLoginModal({ employees, onClose }: Props) {
  const dispatch = useAppDispatch();
  const storeId  = useAppSelector((s) => s.auth.user?.storeId);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [pin, setPin]           = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleNumpad = (key: typeof NUMPAD[number]) => {
    if (!key) return;
    if (key === '⌫') { setPin((p) => p.slice(0, -1)); return; }
    if (pin.length >= 6) return;
    const next = pin + key;
    setPin(next);
    // Auto-submit at 4-6 digits when employee selected
    if (selected && next.length >= 4) {
      attemptLogin(selected, next);
    }
  };

  const attemptLogin = async (emp: Employee, enteredPin: string) => {
    if (!storeId || enteredPin.length < 4) return;
    setIsLoading(true);
    try {
      await dispatch(pinLogin({ employeeId: emp.id, pin: enteredPin, storeId })).unwrap();
      toast.success(`Welcome, ${emp.firstName}!`);
      onClose();
    } catch (err: any) {
      toast.error('Incorrect PIN. Try again.');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="bg-white rounded-3xl shadow-2xl w-full overflow-hidden"
        style={{ maxWidth: selected ? 360 : 460 }}
      >
        <AnimatePresence mode="wait">
          {!selected ? (
            /* ── Employee picker ── */
            <motion.div
              key="picker"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
            >
              <div className="flex items-center justify-between px-6 py-5"
                   style={{ borderBottom: '1px solid var(--color-border)' }}>
                <h2 className="font-bold text-lg text-gray-900">Who&apos;s clocking in?</h2>
                <button onClick={onClose}
                        className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                {employees.length === 0 ? (
                  <p className="col-span-2 text-center text-sm text-gray-400 py-8">No employees found</p>
                ) : employees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => { setSelected(emp); setPin(''); }}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl hover:bg-gray-50
                               transition-colors text-center group"
                    style={{ border: '1px solid var(--color-border)' }}
                  >
                    <div className={cn(
                      'w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg select-none',
                      ROLE_COLOR[emp.role] ?? 'bg-gray-100 text-gray-600',
                    )}>
                      {emp.firstName[0]}{emp.lastName?.[0] ?? ''}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 leading-tight">
                        {emp.firstName}
                      </p>
                      <p className="text-xs text-gray-400 capitalize mt-0.5">
                        {emp.role.replace('_', ' ').toLowerCase()}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            /* ── PIN entry ── */
            <motion.div
              key="pin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.18 }}
            >
              <div className="flex items-center justify-between px-6 py-5"
                   style={{ borderBottom: '1px solid var(--color-border)' }}>
                <button
                  onClick={() => { setSelected(null); setPin(''); }}
                  className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
                >
                  ← Back
                </button>
                <button onClick={onClose}
                        className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 pt-5 pb-2 text-center">
                {/* Avatar */}
                <div className={cn(
                  'w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto mb-3 select-none',
                  ROLE_COLOR[selected.role] ?? 'bg-gray-100 text-gray-600',
                )}>
                  {selected.firstName[0]}{selected.lastName?.[0] ?? ''}
                </div>
                <p className="font-bold text-gray-900">{selected.firstName} {selected.lastName}</p>
                <p className="text-sm text-gray-400 mt-0.5 capitalize">
                  {selected.role.replace('_', ' ').toLowerCase()}
                </p>

                {/* PIN dots */}
                <div className="flex items-center justify-center gap-3 mt-6 mb-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: i < pin.length ? 1.15 : 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className={cn(
                        'w-3.5 h-3.5 rounded-full transition-colors duration-150',
                        i < pin.length ? 'bg-brand-600' : 'bg-gray-200',
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400 mb-4">Enter your PIN</p>
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-2 px-6 pb-6">
                {NUMPAD.map((key, i) => (
                  <button
                    key={i}
                    onClick={() => handleNumpad(key)}
                    disabled={!key || isLoading}
                    className={cn(
                      'py-4 rounded-2xl text-xl font-bold transition-all active:scale-95',
                      !key
                        ? 'cursor-default'
                        : key === '⌫'
                          ? 'bg-red-50 text-red-500 hover:bg-red-100'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200',
                    )}
                  >
                    {isLoading && key === '⌫' ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : key === '⌫' ? (
                      <Delete className="w-5 h-5 mx-auto" />
                    ) : key}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
