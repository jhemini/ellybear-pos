'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChefHat, Clock, CheckCircle2, RefreshCw, Wifi, WifiOff,
  AlarmClock, Bell,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { useAppSelector } from '../../../store';
import { cn } from '../../../lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type KdsStatus = 'NEW' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'READY' | 'DELIVERED';

interface KdsItem {
  name: string;
  quantity: number;
  notes?: string;
  modifiers?: { name: string }[];
}

interface KdsTicket {
  id: string;
  orderId: string;
  station: string;
  status: KdsStatus;
  items: KdsItem[];
  startedAt?: string;
  readyAt?: string;
  createdAt: string;
  order?: { orderNumber: string; type: string; tableName?: string };
}

const STATUS_META: Record<KdsStatus, { label: string; color: string; bg: string; border: string; next: KdsStatus | null }> = {
  NEW:          { label: 'New',         color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',  next: 'ACKNOWLEDGED' },
  ACKNOWLEDGED: { label: 'Acknowledged',color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200', next: 'IN_PROGRESS'  },
  IN_PROGRESS:  { label: 'Cooking',     color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200',next: 'READY'        },
  READY:        { label: 'Ready',       color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200', next: 'DELIVERED'    },
  DELIVERED:    { label: 'Delivered',   color: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-200',  next: null           },
};

const STATIONS = ['ALL', 'KITCHEN', 'BAR', 'EXPO'];

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
export default function KDSPage() {
  const user = useAppSelector((s) => s.auth.user);
  const { isOnline } = useAppSelector((s) => s.offline);
  const [tickets, setTickets]     = useState<KdsTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [station, setStation]     = useState('ALL');
  const [now, setNow]             = useState(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!user?.storeId) return;
    try {
      const params: Record<string, string> = {};
      if (station !== 'ALL') params.station = station;
      const { data } = await api.get(`/kds/stores/${user.storeId}/tickets`, { params });
      const incoming: KdsTicket[] = data.data || [];
      // Play a sound cue if there are new tickets
      setTickets((prev) => {
        const prevIds = new Set(prev.map((t) => t.id));
        const hasNew  = incoming.some((t) => !prevIds.has(t.id) && t.status === 'NEW');
        if (hasNew && prev.length > 0) toast('🔔 New order ticket!', { icon: '🍳' });
        return incoming;
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.storeId, station]);

  // Auto-refresh every 8s
  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 8000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [load]);

  // Clock tick every second (for elapsed times)
  useEffect(() => {
    tickIntervalRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => { if (tickIntervalRef.current) clearInterval(tickIntervalRef.current); };
  }, []);

  const handleAdvance = async (ticket: KdsTicket) => {
    const next = STATUS_META[ticket.status].next;
    if (!next) return;
    try {
      await api.patch(`/kds/tickets/${ticket.id}/status`, { status: next });
      setTickets((prev) =>
        prev.map((t) => t.id === ticket.id ? { ...t, status: next } : t),
      );
      if (next === 'READY') toast.success(`Order ${ticket.order?.orderNumber ?? ''} is ready!`);
    } catch {
      toast.error('Failed to update ticket');
    }
  };

  // Group active tickets by status (exclude DELIVERED for the board view)
  const active = tickets.filter((t) => t.status !== 'DELIVERED');
  const columns: KdsStatus[] = ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'READY'];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-900">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-800 flex-shrink-0"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base leading-tight">Kitchen Display</h1>
            <p className="text-xs text-gray-400 leading-tight">
              {active.length} active ticket{active.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Station filter */}
          <div className="flex items-center gap-1 bg-gray-700 rounded-xl p-1">
            {STATIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStation(s)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  station === s
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white',
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Online status */}
          <div className={cn(
            'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl',
            isOnline ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400',
          )}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isOnline ? 'Live' : 'Offline'}
          </div>

          <button
            onClick={load}
            className="w-8 h-8 rounded-xl bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Kanban board ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <p className="text-sm">Loading tickets…</p>
          </div>
        </div>
      ) : active.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-gray-800 flex items-center justify-center">
            <ChefHat className="w-10 h-10 text-gray-600" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-400">All caught up!</p>
            <p className="text-sm text-gray-600 mt-1">No active tickets right now.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex gap-3 p-4">
          {columns.map((col) => {
            const colTickets = active.filter((t) => t.status === col);
            const meta = STATUS_META[col];
            return (
              <div key={col} className="flex flex-col flex-1 min-w-0 gap-3">
                {/* Column header */}
                <div className={cn(
                  'flex items-center justify-between px-4 py-2.5 rounded-2xl flex-shrink-0',
                  meta.bg,
                )} style={{ border: `1px solid` }}>
                  <span className={cn('text-sm font-bold', meta.color)}>{meta.label}</span>
                  <span className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                    colTickets.length > 0 ? `${meta.bg} ${meta.color}` : 'bg-gray-100 text-gray-400',
                  )}>
                    {colTickets.length}
                  </span>
                </div>

                {/* Tickets */}
                <div className="flex-1 overflow-y-auto space-y-3 pb-2">
                  <AnimatePresence>
                    {colTickets.map((ticket) => (
                      <KdsTicketCard
                        key={ticket.id}
                        ticket={ticket}
                        now={now}
                        onAdvance={() => handleAdvance(ticket)}
                      />
                    ))}
                  </AnimatePresence>
                  {colTickets.length === 0 && (
                    <div className="flex items-center justify-center h-24 rounded-2xl border-2 border-dashed border-gray-700">
                      <p className="text-xs text-gray-600">No tickets</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ticket card
// ─────────────────────────────────────────────────────────────────────────────
function KdsTicketCard({ ticket, now, onAdvance }: {
  ticket: KdsTicket;
  now: number;
  onAdvance: () => void;
}) {
  const meta = STATUS_META[ticket.status];
  const nextMeta = ticket.status !== 'DELIVERED' ? STATUS_META[STATUS_META[ticket.status].next!] : null;

  const elapsedSec = Math.floor((now - new Date(ticket.createdAt).getTime()) / 1000);
  const elapsedMin = Math.floor(elapsedSec / 60);
  const elapsedLabel = elapsedMin >= 1
    ? `${elapsedMin}m ${elapsedSec % 60}s`
    : `${elapsedSec}s`;

  const isUrgent = elapsedMin >= 8;
  const isWarning = elapsedMin >= 5 && elapsedMin < 8;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'rounded-2xl overflow-hidden',
        isUrgent ? 'ring-2 ring-red-500/60' : '',
      )}
      style={{ background: '#1e2130', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Ticket header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">
            #{ticket.order?.orderNumber ?? ticket.id.slice(-4)}
          </span>
          {ticket.order?.type === 'DINE_IN' && ticket.order.tableName && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-300">
              {ticket.order.tableName}
            </span>
          )}
          {ticket.order?.type === 'TAKEAWAY' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-300">
              Take Away
            </span>
          )}
        </div>

        {/* Elapsed timer */}
        <div className={cn(
          'flex items-center gap-1 text-xs font-semibold tabular-nums px-2 py-1 rounded-xl',
          isUrgent  ? 'bg-red-900/50 text-red-400 animate-pulse' :
          isWarning ? 'bg-amber-900/50 text-amber-400' :
                      'bg-gray-700/50 text-gray-400',
        )}>
          {isUrgent ? <Bell className="w-3 h-3" /> : <AlarmClock className="w-3 h-3" />}
          {elapsedLabel}
        </div>
      </div>

      {/* Items */}
      <div className="px-4 py-3 space-y-2">
        {ticket.items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 text-xs font-bold
                             flex items-center justify-center flex-shrink-0 mt-0.5">
              {item.quantity}×
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-tight">{item.name}</p>
              {item.modifiers?.map((m, mi) => (
                <p key={mi} className="text-xs text-gray-500">+ {m.name}</p>
              ))}
              {item.notes && (
                <p className="text-xs text-amber-400 mt-0.5 italic">⚠ {item.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Advance button */}
      {nextMeta && (
        <div className="px-3 pb-3">
          <button
            onClick={onAdvance}
            className={cn(
              'w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2',
              ticket.status === 'READY'
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : 'bg-orange-600 hover:bg-orange-500 text-white',
            )}
          >
            {ticket.status === 'IN_PROGRESS' && <CheckCircle2 className="w-4 h-4" />}
            {ticket.status === 'READY'        && <CheckCircle2 className="w-4 h-4" />}
            {ticket.status === 'NEW'          && <Clock className="w-4 h-4" />}
            {ticket.status === 'ACKNOWLEDGED' && <ChefHat className="w-4 h-4" />}
            Mark {nextMeta.label}
          </button>
        </div>
      )}
    </motion.div>
  );
}
