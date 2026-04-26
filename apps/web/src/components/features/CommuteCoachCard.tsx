'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { HiOutlineCalendarDays, HiOutlineClock, HiOutlineCurrencyDollar } from 'react-icons/hi2';

interface Props { state: string; }

export function CommuteCoachCard({ state }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['commute-advice', state],
    queryFn: () => apiClient.getCommuteAdvice(state),
    enabled: !!state,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl card-shadow p-5">
        <div className="h-4 w-28 bg-secondary rounded animate-pulse mb-4" />
        <div className="grid grid-cols-3 gap-2">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-secondary rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const advice = data?.advice;
  if (!advice) return null;

  const { best_day, best_time, expected_savings_per_gallon, reasoning } = advice;

  return (
    <div className="bg-white rounded-2xl card-shadow p-5">
      <div className="flex items-center gap-2 mb-4">
        <HiOutlineCalendarDays className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Commute Coach</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: HiOutlineCalendarDays, label: 'Best Day',  value: best_day,  color: 'text-primary',   bg: 'bg-blue-50' },
          { icon: HiOutlineClock,    label: 'Best Time', value: best_time, color: 'text-amber-600', bg: 'bg-amber-50' },
          {
            icon: HiOutlineCurrencyDollar,
            label: 'Save/gal',
            value: expected_savings_per_gallon != null ? `$${expected_savings_per_gallon.toFixed(2)}` : '—',
            color: 'text-green-600',
            bg: 'bg-green-50',
          },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className={`flex flex-col items-center text-center p-3 rounded-xl ${bg}`}>
            <Icon className={`h-4 w-4 mb-1.5 ${color}`} />
            <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
            <p className={`text-xs font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {reasoning && (
        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border leading-relaxed">
          {reasoning}
        </p>
      )}
    </div>
  );
}
