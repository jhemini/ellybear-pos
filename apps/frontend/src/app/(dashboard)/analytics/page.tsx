'use client';
import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingUp, ShoppingBag, Users, DollarSign, Download } from 'lucide-react';
import { api } from '../../../lib/api';
import { formatCurrency } from '../../../lib/utils';
import { useAppSelector } from '../../../store';

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

interface Summary {
  totalRevenue: number;
  netRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalRefunds: number;
}

interface PeriodData { date: string; revenue: number; }
interface TopProduct { productId: string; product: { name: string }; _sum: { quantity: number; total: number }; }
interface PaymentBreakdown { method: string; amount: number; count: number; }

export default function AnalyticsPage() {
  const user = useAppSelector((s) => s.auth.user);
  const today = new Date();
  const [from, setFrom] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  const [summary, setSummary] = useState<Summary | null>(null);
  const [periodData, setPeriodData] = useState<PeriodData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params = { from, to, storeId: user?.storeId };
    setIsLoading(true);

    Promise.all([
      api.get('/analytics/revenue', { params }),
      api.get('/analytics/revenue/by-period', { params: { ...params, groupBy } }),
      api.get('/analytics/products/top', { params }),
      api.get('/analytics/payments', { params }),
    ])
      .then(([s, p, tp, pay]) => {
        setSummary(s.data.data);
        setPeriodData(p.data.data);
        setTopProducts(tp.data.data);
        // Flatten Prisma groupBy shape for Recharts
        setPaymentBreakdown(
          (pay.data.data ?? []).map((row: any) => ({
            method: row.method,
            amount: Number(row._sum?.amount ?? 0),
            count:  row._count ?? 0,
          })),
        );
      })
      .finally(() => setIsLoading(false));
  }, [from, to, groupBy, user?.storeId]);

  const statCards = summary
    ? [
        { label: 'Net Revenue', value: formatCurrency(Number(summary.netRevenue)), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Total Orders', value: summary.totalOrders.toLocaleString(), icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Avg. Order Value', value: formatCurrency(Number(summary.averageOrderValue)), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Refunds', value: formatCurrency(Number(summary.totalRefunds)), icon: Users, color: 'text-red-600', bg: 'bg-red-50' },
      ]
    : [];

  return (
    <div className="h-full overflow-y-auto">
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Revenue insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input py-1.5 text-sm" />
          <span className="text-gray-400">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input py-1.5 text-sm" />
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)} className="input py-1.5 text-sm w-auto">
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
          <button className="btn btn-secondary gap-2 py-1.5">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="card p-5">
            <div className={`inline-flex p-2 rounded-lg ${card.bg} mb-3`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-sm text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Revenue over time</h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={periodData}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Area type="monotone" dataKey="revenue" stroke="#ef4444" strokeWidth={2} fill="url(#revenueGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top products */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Top products</h2>
          <div className="space-y-3">
            {topProducts.slice(0, 8).map((item, i) => (
              <div key={item.productId} className="flex items-center gap-3">
                <span className="w-6 text-xs text-gray-400 font-mono">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.product?.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full"
                        style={{ width: `${(Number(item._sum.quantity) / (topProducts[0]?._sum?.quantity ?? 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{Number(item._sum.quantity).toFixed(0)} sold</span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                  {formatCurrency(Number(item._sum.total))}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment breakdown */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Payment methods</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={paymentBreakdown}
                dataKey="amount"
                nameKey="method"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ method, percent }) => `${method} ${(percent * 100).toFixed(0)}%`}
              >
                {paymentBreakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
    </div>
  );
}
