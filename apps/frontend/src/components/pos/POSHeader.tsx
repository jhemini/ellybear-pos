'use client';
import { useState, useRef, useEffect } from 'react';
import { Search, ScanLine, Wifi, WifiOff, ChevronDown, LogOut, Users } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../store';
import { setSearch, toggleScan } from '../../store/slices/posSlice';
import { logout } from '../../store/slices/authSlice';
import { BarcodeScanner } from './BarcodeScanner';
import { PinLoginModal } from './PinLoginModal';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export function POSHeader() {
  const dispatch = useAppDispatch();
  const { searchQuery, activeScan } = useAppSelector((s) => s.pos);
  const { isOnline } = useAppSelector((s) => s.offline);
  const employee = useAppSelector((s) => s.auth.user);
  const storeId  = useAppSelector((s) => s.auth.user?.storeId);

  const [profileOpen, setProfleOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfleOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpenPinModal = async () => {
    setProfleOpen(false);
    if (employees.length === 0 && storeId) {
      try {
        const { data } = await api.get('/employees', { params: { limit: 100 } });
        setEmployees(data.data || []);
      } catch {
        // silently fall through — modal will show empty state
      }
    }
    setPinModalOpen(true);
  };

  const initials = `${employee?.firstName[0] ?? ''}${employee?.lastName?.[0] ?? ''}`;

  return (
    <>
      <header
        className="flex items-center gap-4 px-5 bg-white flex-shrink-0 z-10"
        style={{
          height: 'var(--header-height)',
          borderBottom: '1px solid var(--color-border)',
          boxShadow: '0 1px 0 0 rgb(0 0 0 / 0.04)',
        }}
      >
        {/* Search bar */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          <input
            type="search"
            placeholder="Search menu…"
            value={searchQuery}
            onChange={(e) => dispatch(setSearch(e.target.value))}
            className="w-full pl-10 pr-4 py-2.5 rounded-full text-sm
                       bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400
                       focus:bg-white transition-all"
          />
        </div>

        {/* Barcode scanner toggle */}
        <button
          onClick={() => dispatch(toggleScan())}
          title="Toggle barcode scanner"
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0',
            activeScan
              ? 'bg-brand-100 text-brand-600'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
          )}
        >
          <ScanLine className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        {/* Online status */}
        <div className={cn(
          'hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full flex-shrink-0',
          isOnline ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700',
        )}>
          {isOnline
            ? <><Wifi className="w-3.5 h-3.5" />Online</>
            : <><WifiOff className="w-3.5 h-3.5" />Offline</>
          }
        </div>

        {/* Profile dropdown */}
        <div className="relative flex-shrink-0" ref={profileRef}>
          <button
            onClick={() => setProfleOpen((o) => !o)}
            className={cn(
              'flex items-center gap-2.5 pl-1 pr-2.5 py-1.5 rounded-2xl transition-colors',
              profileOpen ? 'bg-gray-100' : 'hover:bg-gray-50',
            )}
          >
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center
                            text-brand-700 font-semibold text-sm select-none flex-shrink-0">
              {initials}
            </div>
            <div className="hidden md:block text-left leading-tight">
              <p className="text-sm font-semibold text-gray-900">
                {employee?.firstName} {employee?.lastName}
              </p>
              <p className="text-xs text-gray-400 capitalize">
                {employee?.role?.toLowerCase().replace('_', ' ')}
              </p>
            </div>
            <ChevronDown className={cn(
              'w-3.5 h-3.5 text-gray-400 transition-transform duration-150',
              profileOpen && 'rotate-180',
            )} />
          </button>

          {/* Dropdown */}
          {profileOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-gray-100 z-50 overflow-hidden animate-fade-in"
              style={{ boxShadow: 'var(--shadow-panel)' }}
            >
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center
                                  text-brand-700 font-semibold text-sm select-none flex-shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {employee?.firstName} {employee?.lastName}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {employee?.role?.toLowerCase().replace('_', ' ')}
                    </p>
                    {employee?.email && (
                      <p className="text-xs text-gray-400 truncate">{employee.email}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-1.5 space-y-0.5">
                <button
                  onClick={handleOpenPinModal}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  <Users className="w-4 h-4 text-gray-400" />
                  Switch cashier
                </button>
                <button
                  onClick={() => { dispatch(logout()); setProfleOpen(false); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>

        {activeScan && <BarcodeScanner />}
      </header>

      <AnimatePresence>
        {pinModalOpen && (
          <PinLoginModal
            employees={employees}
            onClose={() => setPinModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
