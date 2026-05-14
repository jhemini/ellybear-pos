'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShoppingCart, Package, BarChart3, Users, UserCog,
  Settings, Store, LogOut, ChefHat, LayoutDashboard,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { cn } from '../../lib/utils';

const navItems = [
  { href: '/home',      label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pos',       label: 'POS',       icon: ShoppingCart    },
  { href: '/inventory', label: 'Inventory',  icon: Package         },
  { href: '/customers', label: 'Customers',  icon: Users           },
  { href: '/employees', label: 'Employees',  icon: UserCog         },
  { href: '/analytics', label: 'Analytics',  icon: BarChart3       },
  { href: '/kds',       label: 'Kitchen',    icon: ChefHat         },
  { href: '/settings',  label: 'Settings',   icon: Settings        },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const user     = useAppSelector((s) => s.auth.user);
  const { pendingCount } = useAppSelector((s) => s.offline);

  const [mounted, setMounted] = useState(false);

  useOnlineStatus();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !user) router.replace('/login');
  }, [mounted, user, router]);

  if (!mounted || !user) return null;

  const initials = `${user.firstName[0]}${user.lastName?.[0] ?? ''}`;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* ── Sidebar: narrow, icon-only ───────────────────────────────────── */}
      <nav
        className="flex flex-col items-center flex-shrink-0 bg-white"
        style={{
          width: 'var(--sidebar-width)',
          borderRight: '1px solid var(--color-sidebar-border)',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center justify-center w-full flex-shrink-0"
          style={{ height: 'var(--header-height)', borderBottom: '1px solid var(--color-sidebar-border)' }}
        >
          <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center shadow-sm">
            <Store className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Nav items */}
        <ul className="flex-1 flex flex-col items-center w-full py-3 px-2.5 list-none gap-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.href} className="w-full relative">
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-brand-50 rounded-2xl"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Link
                  href={item.href}
                  title={item.label}
                  className={cn(
                    'relative flex items-center justify-center w-full py-3 rounded-2xl transition-colors duration-150',
                    isActive
                      ? 'text-brand-600'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50',
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.href === '/pos' && pendingCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* User avatar + logout */}
        <div
          className="flex flex-col items-center gap-1.5 w-full px-2.5 pb-4 flex-shrink-0"
          style={{ borderTop: '1px solid var(--color-sidebar-border)', paddingTop: '0.75rem' }}
        >
          <div
            className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center
                       text-brand-700 font-semibold text-xs select-none"
            title={`${user.firstName} ${user.lastName ?? ''} · ${user.role}`}
          >
            {initials}
          </div>
          <button
            onClick={() => dispatch(logout())}
            title="Sign out"
            className="flex items-center justify-center w-full py-2 rounded-xl
                       text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-150"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
