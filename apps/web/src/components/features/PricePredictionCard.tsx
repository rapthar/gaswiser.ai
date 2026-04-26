'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { HiOutlineArrowTrendingUp, HiOutlineArrowTrendingDown, HiOutlineMinus, HiOutlineClock } from 'react-icons/hi2';

interface Props { state: string; }

export function PricePredictionCard({ state }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['price-prediction', state],
    queryFn: () => apiClient.getPricePrediction(state),
    enabled: !!state,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl card-shadow p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-4 w-4 bg-secondary rounded animate-pulse" />
          <div className="h-4 w-24 bg-secondary rounded animate-pulse" />
        </div>
        <div className="h-10 bg-secondary rounded-lg animate-pulse" />
      </div>
    );
  }

  const prediction = data?.prediction;
  if (!prediction) return null;

  const { direction, confidence, hours_ahead, predicted_delta, reasoning } = prediction;
  const deltaCents = Math.abs(predicted_delta * 100);
  const Icon = direction === 'rising' ? HiOutlineArrowTrendingUp : direction === 'falling' ? HiOutlineArrowTrendingDown : HiOutlineMinus;
  const color = direction === 'rising' ? '#dc2626' : direction === 'falling' ? '#16a34a' : '#6b7280';
  const bgColor = direction === 'rising' ? '#fef2f2' : direction === 'falling' ? '#f0fdf4' : '#f9fafb';

  return (
    <div className="bg-white rounded-2xl card-shadow p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color }} />
          <span className="text-sm font-semibold">Price Outlook</span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
          style={{ background: color }}>
          {(confidence * 100).toFixed(0)}% conf.
        </span>
      </div>

      <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: bgColor }}>
        <Icon className="h-7 w-7 shrink-0" style={{ color }} />
        <div>
          <p className="text-2xl font-bold leading-none" style={{ color }}>
            {direction === 'stable' ? 'Stable' : `${direction === 'rising' ? '+' : '-'}${deltaCents.toFixed(1)}¢`}
          </p>
          <p className="text-xs mt-1 capitalize font-medium" style={{ color }}>
            {direction} prices
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
        <HiOutlineClock className="h-3.5 w-3.5" />
        Over next {hours_ahead}h in {state}
      </div>

      {reasoning && (
        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border leading-relaxed">
          {reasoning}
        </p>
      )}
    </div>
  );
}
