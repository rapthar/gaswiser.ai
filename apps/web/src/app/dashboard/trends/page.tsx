'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { formatPrice } from '@/lib/utils';
import {
  HiOutlineArrowTrendingUp, HiOutlineArrowTrendingDown, HiOutlineMinus,
  HiOutlineClock, HiOutlineBolt,
} from 'react-icons/hi2';
import Link from 'next/link';

const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

export default function TrendsPage() {
  const [state, setState] = useState('CA');

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['price-history', state],
    queryFn: () => apiClient.getPriceHistory(state),
  });

  const { data: predData, isLoading: predLoading } = useQuery({
    queryKey: ['price-prediction', state],
    queryFn: () => apiClient.getPricePrediction(state),
  });

  const { data: adviceData, isLoading: adviceLoading } = useQuery({
    queryKey: ['commute-advice', state],
    queryFn: () => apiClient.getCommuteAdvice(state),
  });

  const history = historyData?.history ?? [];
  const pred = predData?.prediction;
  const advice = adviceData?.advice;

  const chartData = history.map(h => ({
    time: new Date(h.recorded_at).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
    Regular: h.regular,
    Midgrade: h.midgrade,
    Premium: h.premium,
    Diesel: h.diesel,
  }));

  const PredIcon = pred?.direction === 'rising' ? HiOutlineArrowTrendingUp : pred?.direction === 'falling' ? HiOutlineArrowTrendingDown : HiOutlineMinus;
  const predColor = pred?.direction === 'rising' ? '#dc2626' : pred?.direction === 'falling' ? '#16a34a' : '#6b7280';
  const delta = pred ? Math.abs((pred.predicted_delta ?? 0) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6 max-w-[900px]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Price Trends</h2>
          <p className="text-sm text-muted-foreground mt-0.5">72-hour statewide averages with AI price prediction.</p>
        </div>
        <div className="w-32">
          <Select value={state} onValueChange={setState}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATES.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* AI Prediction + Commute Advice */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Price Prediction */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {predLoading ? (
                <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              ) : (
                <PredIcon className="h-4 w-4" style={{ color: predColor }} />
              )}
              AI Price Prediction
              {pred && (
                <span
                  className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                  style={{ background: predColor }}
                >
                  {(pred.confidence * 100).toFixed(0)}% confidence
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {predLoading && <div className="h-24 bg-secondary animate-pulse rounded-lg" />}
            {!predLoading && !pred && (
              <p className="text-sm text-muted-foreground">No prediction available for {state}.</p>
            )}
            {pred && (
              <div className="space-y-3">
                <div>
                  <p className="text-3xl font-bold" style={{ color: predColor }}>
                    {pred.direction === 'stable'
                      ? 'Stable'
                      : `${pred.direction === 'rising' ? '+' : '−'}${delta}¢`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Projected over next {pred.hours_ahead}h in {state}
                  </p>
                </div>
                {pred.reasoning && (
                  <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-3">
                    {pred.reasoning}
                  </p>
                )}
                <Link
                  href="/dashboard/plans/new"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mt-1"
                >
                  <HiOutlineBolt className="h-3 w-3" />
                  {pred.direction === 'rising' ? 'Generate a plan now' : 'Plan your next fill-up'}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commute Advice */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <HiOutlineClock className="h-4 w-4 text-primary" />
              Best Time to Fill Up
            </CardTitle>
          </CardHeader>
          <CardContent>
            {adviceLoading && <div className="h-24 bg-secondary animate-pulse rounded-lg" />}
            {!adviceLoading && !advice && (
              <p className="text-sm text-muted-foreground">No commute data available for {state}.</p>
            )}
            {advice && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Best Day</p>
                    <p className="text-sm font-bold">{advice.best_day}</p>
                  </div>
                  <div className="bg-secondary rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Best Time</p>
                    <p className="text-sm font-bold">{advice.best_time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                  <HiOutlineArrowTrendingDown className="h-4 w-4 text-green-600 shrink-0" />
                  <p className="text-sm font-semibold text-green-700">
                    Save ~${Number(advice.expected_savings_per_gallon).toFixed(2)}/gal vs. peak times
                  </p>
                </div>
                {advice.reasoning && (
                  <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-3">
                    {advice.reasoning}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Price History Chart */}
      <Card>
        <CardHeader>
          <CardTitle>72-Hour Price History — {state}</CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="h-64 bg-secondary animate-pulse rounded-lg" />
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              No price data available for {state}.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={v => `$${Number(v).toFixed(2)}`}
                  tick={{ fontSize: 11 }}
                  domain={['auto', 'auto']}
                />
                <Tooltip formatter={(v: number) => formatPrice(v)} />
                <Legend />
                <Line type="monotone" dataKey="Regular" stroke="#0060A9" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="Midgrade" stroke="#ca8a04" dot={false} strokeWidth={1.5} />
                <Line type="monotone" dataKey="Premium" stroke="#E31837" dot={false} strokeWidth={1.5} />
                <Line type="monotone" dataKey="Diesel" stroke="#6b7280" dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
