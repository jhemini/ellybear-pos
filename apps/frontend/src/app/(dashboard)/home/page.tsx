'use client';
import { useState, useEffect } from 'react';
import { motion, type Variants } from 'framer-motion';
import {
  ShoppingCart, Package, Users, UserCog, BarChart3, ChefHat,
  Settings, TrendingUp, AlertTriangle, DollarSign, ArrowRight,
  Clock, CheckCircle2, Store,
} from 'lucide-react';
import Link from 'next/link';
import { useAppSelector } from '../../../store';
import { api } from '../../../lib/api';
import { formatCurrency } from '../../../lib/utils';
import { cn } from '../../../lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  weekRevenue: number;
  weekOrders: number;
  lowStockCount: number;
  totalProducts: number;
  totalCustomers: number;
  totalEmployees: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  customer?: { firstName: string; lastName?: string };
}

const roleColors: Record<string, string> = {
  OWNER: 'bg-red-100 text-red-700',
  MANAGER: 'bg-orange-100 text-orange-700',
  CASHIER: 'bg-blue-100 text-blue-700',
  WAITER: 'bg-green-100 text-green-700',
  KITCHEN_STAFF: 'bg-purple-100 text-purple-700',
  INVENTORY_MANAGER: 'bg-teal-100 text-teal-700',
};

const moduleCards = [
  { href: '/pos',       icon: ShoppingCart, label: 'Point of Sale',  desc: 'Process orders & payments',   color: 'bg-brand-50 text-brand-600'   },
  { href: '/inventory', icon: Package,      label: 'Inventory',      desc: 'Products, stock & recipes',   color: 'bg-purple-50 text-purple-600' },
  { href: '/employees', icon: UserCog,      label: 'Employees',      desc: 'Team roles & access',         color: 'bg-orange-50 text-orange-600' },
  { href: '/customers', icon: Users,        label: 'Customers',      desc: 'Loyalty & purchase history',  color: 'bg-green-50 text-green-600'   },
  { href: '/analytics', icon: BarChart3,    label: 'Analytics',      desc: 'Sales reports & trends',      color: 'bg-blue-50 text-blue-600'     },
  { href: '/kds',       icon: ChefHat,      label: 'Kitchen Display',desc: 'Live order tickets',           color: 'bg-amber-50 text-amber-600'   },
  { href: '/settings',  icon: Settings,     label: 'Settings',       desc: 'Store & tax configuration',   color: 'bg-gray-100 text-gray-600'    },
];

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ─────────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const user = useAppSelector((s) => s.auth.user);
  const [stats, setStats]     = useState<DashboardStats | null>(null);
  const [orders, setOrders]   = useState<RecentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const storeId = user?.storeId;

  useEffect(() => {
    if (!storeId) return;
    (async () => {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const weekAgo  = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      try {
        const [todayRevRes, weekRevRes, productsRes, customersRes, employeesRes, ordersRes, inventoryRes] =
          await Promise.allSettled([
            api.get('/analytics/revenue', { params: { storeId, from: todayStr, to: todayStr } }),
            api.get('/analytics/revenue', { params: { storeId, from: weekAgo,  to: todayStr } }),
            api.get('/products',          { params: { limit: 1 } }),
            api.get('/customers',         { params: { limit: 1 } }),
            api.get('/employees',         { params: { limit: 1 } }),
            api.get('/orders',            { params: { storeId, limit: 5 } }),
            api.get(`/inventory/stores/${storeId}`, { params: { limit: 200 } }),
          ]);

        const todaySummary = todayRevRes.status === 'fulfilled' ? todayRevRes.value.data.data : null;
        const weekSummary  = weekRevRes.status  === 'fulfilled' ? weekRevRes.value.data.data  : null;
        const invItems     = inventoryRes.status === 'fulfilled' ? inventoryRes.value.data.data : [];
        const recentOrds   = ordersRes.status    === 'fulfilled' ? ordersRes.value.data.data   : [];

        setStats({
          todayRevenue:   Number(todaySummary?.netRevenue   ?? 0),
          todayOrders:    Number(todaySummary?.totalOrders  ?? 0),
          weekRevenue:    Number(weekSummary?.netRevenue    ?? 0),
          weekOrders:     Number(weekSummary?.totalOrders   ?? 0),
          lowStockCount:  Array.isArray(invItems) ? invItems.filter((i: any) => i.isLowStock).length : 0,
          totalProducts:  productsRes.status   === 'fulfilled' ? (productsRes.value.data.meta?.total ?? 0) : 0,
          totalCustomers: customersRes.status  === 'fulfilled' ? (customersRes.value.data.meta?.total ?? 0) : 0,
          totalEmployees: employeesRes.status  === 'fulfilled' ? (employeesRes.value.data.meta?.total ?? 0) : 0,
        });
        setOrders(Array.isArray(recentOrds) ? recentOrds.slice(0, 5) : []);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [storeId]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: 'var(--color-surface-muted)' }}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="bg-white px-6 py-5" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {greeting()}, {user?.firstName} 👋
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Here&apos;s what&apos;s happening at your store today
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', roleColors[user?.role ?? ''] ?? 'bg-gray-100 text-gray-600')}>
              {user?.role?.replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* ── KPI Cards ────────────────────────────────────────────────────── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <KpiCard
            icon={DollarSign}
            label="Today's Revenue"
            value={isLoading ? '—' : formatCurrency(stats?.todayRevenue ?? 0)}
            sub={`${stats?.todayOrders ?? 0} orders`}
            color="text-brand-600"
            bg="bg-brand-50"
          />
          <KpiCard
            icon={TrendingUp}
            label="This Week"
            value={isLoading ? '—' : formatCurrency(stats?.weekRevenue ?? 0)}
            sub={`${stats?.weekOrders ?? 0} orders`}
            color="text-blue-600"
            bg="bg-blue-50"
          />
          <KpiCard
            icon={Package}
            label="Total Products"
            value={isLoading ? '—' : String(stats?.totalProducts ?? 0)}
            sub={stats?.lowStockCount ? `${stats.lowStockCount} low stock` : 'All levels OK'}
            color="text-purple-600"
            bg="bg-purple-50"
            alert={!!stats?.lowStockCount}
          />
          <KpiCard
            icon={Users}
            label="Customers"
            value={isLoading ? '—' : String(stats?.totalCustomers ?? 0)}
            sub={`${stats?.totalEmployees ?? 0} employees`}
            color="text-green-600"
            bg="bg-green-50"
          />
        </motion.div>

        {/* ── Module Quick Links ────────────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Modules</h2>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
          >
            {moduleCards.map((m) => (
              <motion.div key={m.href} variants={itemVariants}>
                <Link
                  href={m.href}
                  className="flex flex-col gap-3 p-4 bg-white rounded-2xl hover:shadow-md transition-all duration-200 group"
                  style={{ border: '1px solid var(--color-border)' }}
                >
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', m.color)}>
                    <m.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm leading-tight">{m.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight">{m.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all self-end" />
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* ── Recent Orders + Low Stock ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent orders */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.35 }}
            className="bg-white rounded-2xl overflow-hidden"
            style={{ border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h2 className="font-semibold text-gray-900">Recent Orders</h2>
              <Link href="/analytics" className="text-xs text-brand-600 hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-8 h-8 rounded-xl bg-gray-100 animate-pulse" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-gray-100 rounded animate-pulse w-24" />
                        <div className="h-3 bg-gray-100 rounded animate-pulse w-16" />
                      </div>
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-16" />
                    </div>
                  ))
                : orders.length === 0
                  ? (
                    <div className="py-10 text-center text-gray-400">
                      <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                      <p className="text-sm">No orders today yet</p>
                    </div>
                  )
                  : orders.map((o) => (
                    <div key={o.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
                        o.status === 'COMPLETED' ? 'bg-green-50' : 'bg-amber-50')}>
                        {o.status === 'COMPLETED'
                          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                          : <Clock className="w-4 h-4 text-amber-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          #{o.orderNumber}
                          {o.customer && <span className="text-gray-400 font-normal"> · {o.customer.firstName}</span>}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">{formatCurrency(Number(o.total))}</p>
                    </div>
                  ))}
            </div>
          </motion.div>

          {/* Store info / quick profile */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.35 }}
            className="bg-white rounded-2xl overflow-hidden"
            style={{ border: '1px solid var(--color-border)' }}
          >
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h2 className="font-semibold text-gray-900">Your Profile</h2>
            </div>
            <div className="p-5 space-y-4">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xl select-none">
                  {user?.firstName?.[0]}{user?.lastName?.[0] ?? ''}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                  <span className={cn('inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold', roleColors[user?.role ?? ''] ?? 'bg-gray-100 text-gray-600')}>
                    {user?.role?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                <div className="flex items-center gap-2 text-gray-600">
                  <Store className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>Store ID: <span className="font-mono text-xs text-gray-400">{user?.storeId?.slice(0, 12)}…</span></span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Link href="/employees"
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700">
                  Manage Team
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </Link>
                <Link href="/settings"
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700">
                  Store Settings
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Low stock alert strip */}
        {!isLoading && (stats?.lowStockCount ?? 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 px-5 py-4 bg-amber-50 rounded-2xl"
            style={{ border: '1px solid #fcd34d' }}
          >
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm font-medium text-amber-800 flex-1">
              {stats!.lowStockCount} product{stats!.lowStockCount > 1 ? 's are' : ' is'} running low on stock.
            </p>
            <Link href="/inventory" className="text-sm font-semibold text-amber-700 hover:underline flex-shrink-0">
              Review →
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI card
// ─────────────────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color, bg, alert }: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  color: string;
  bg: string;
  alert?: boolean;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="bg-white rounded-2xl p-4 flex items-start gap-3"
      style={{ border: '1px solid var(--color-border)' }}
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', bg)}>
        <Icon className={cn('w-5 h-5', color)} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-400 truncate">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5 leading-tight">{value}</p>
        <p className={cn('text-xs mt-0.5', alert ? 'text-amber-600 font-medium' : 'text-gray-400')}>
          {alert && <AlertTriangle className="inline w-3 h-3 mr-0.5 -mt-0.5" />}
          {sub}
        </p>
      </div>
    </motion.div>
  );
}
