'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import {
  HiOutlineBell, HiOutlineArrowTrendingUp, HiOutlineArrowTrendingDown,
  HiOutlineMinus, HiOutlineClock, HiOutlineXMark, HiOutlineBolt,
} from 'react-icons/hi2';
import Link from 'next/link';

const STATE = 'CA';

type NotifItem = {
  id: string;
  Icon: React.ElementType;
  iconColor: string;
  title: string;
  body: string;
  href: string;
  urgent?: boolean;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: predData } = useQuery({
    queryKey: ['price-prediction', STATE],
    queryFn: () => apiClient.getPricePrediction(STATE),
    staleTime: 5 * 60_000,
  });

  const { data: adviceData } = useQuery({
    queryKey: ['commute-advice', STATE],
    queryFn: () => apiClient.getCommuteAdvice(STATE),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pred = predData?.prediction;
  const advice = adviceData?.advice;

  const notifications: NotifItem[] = [];

  if (pred) {
    const rising = pred.direction === 'rising';
    const falling = pred.direction === 'falling';
    const delta = Math.abs((pred.predicted_delta ?? 0) * 100).toFixed(1);
    notifications.push({
      id: 'price',
      Icon: rising ? HiOutlineArrowTrendingUp : falling ? HiOutlineArrowTrendingDown : HiOutlineMinus,
      iconColor: rising ? '#dc2626' : falling ? '#16a34a' : '#6b7280',
      title: rising ? 'Fill Up Soon — Prices Rising' : falling ? 'Prices Dropping — Wait to Fill' : 'Prices Stable',
      body: rising
        ? `Prices in ${STATE} projected up ${delta}¢ over the next ${pred.hours_ahead}h. Generate a plan now.`
        : falling
        ? `Prices in ${STATE} projected down ${delta}¢ over the next ${pred.hours_ahead}h. Good time to wait.`
        : `Prices in ${STATE} are stable for the next ${pred.hours_ahead}h.`,
      href: '/dashboard/trends',
      urgent: rising,
    });
  }

  if (advice) {
    notifications.push({
      id: 'commute',
      Icon: HiOutlineClock,
      iconColor: '#0060A9',
      title: 'Best Time to Fill Up',
      body: `${advice.best_day}s ${advice.best_time} — save ~$${Number(advice.expected_savings_per_gallon).toFixed(2)}/gal vs. peak times.`,
      href: '/dashboard/trends',
    });
  }

  const urgentCount = notifications.filter(n => n.urgent).length;
  const badgeCount = notifications.length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        title="Notifications"
      >
        <HiOutlineBell className="h-4 w-4" />
        {badgeCount > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${urgentCount > 0 ? 'bg-red-500' : 'bg-[#0060A9]'}`}>
            {badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-9 w-76 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden" style={{ width: 300 }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <HiOutlineBell className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-sm font-semibold">Price Alerts</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <HiOutlineXMark className="h-3.5 w-3.5" />
            </button>
          </div>

          {notifications.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No alerts right now</p>
          )}

          <div className="divide-y divide-border">
            {notifications.map(n => (
              <Link
                key={n.id}
                href={n.href}
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 px-4 py-3.5 hover:bg-secondary transition-colors"
              >
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: `${n.iconColor}18` }}
                >
                  <n.Icon className="h-4 w-4" style={{ color: n.iconColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-tight">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-border bg-secondary/50">
            <Link
              href="/dashboard/plans/new"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-primary hover:underline"
            >
              <HiOutlineBolt className="h-3 w-3" />
              Generate a fuel plan now
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
