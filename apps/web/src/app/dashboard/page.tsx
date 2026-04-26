'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { formatPrice, formatCost } from '@/lib/utils';
import {
  HiOutlineMapPin, HiOutlineArrowTrendingDown, HiOutlineBolt, HiOutlineArrowRight,
  HiOutlineArrowTrendingUp, HiOutlineMinus, HiOutlineCurrencyDollar,
} from 'react-icons/hi2';
import { RiGasStationLine, RiCarLine, RiDropLine } from 'react-icons/ri';
import Link from 'next/link';
import { TodaysRoute } from '@/components/features/TodaysRoute';
import { StationLogo, getLogoPath } from '@/components/features/StationLogo';

const NearbyMap = dynamic(
  () => import('@/components/features/NearbyMap').then(m => ({ default: m.NearbyMap })),
  { ssr: false, loading: () => <div className="w-full h-full bg-secondary animate-pulse rounded-xl" /> },
);

const DEFAULT_COORDS: [number, number] = [34.052, -118.244];
const DEFAULT_STATE = 'CA';

export default function DashboardPage() {
  const { user } = useAuth();
  const [coords, setCoords] = useState<[number, number]>(DEFAULT_COORDS);
  const [state] = useState(DEFAULT_STATE);

  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiClient.getProfile(),
    staleTime: 60_000,
  });

  const name = profileData?.profile?.username
    || profileData?.profile?.full_name
    || user?.email?.split('@')[0]
    || 'there';

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(pos => {
      setCoords([pos.coords.latitude, pos.coords.longitude]);
    });
  }, []);

  const { data: nearbyData } = useQuery({
    queryKey: ['nearby', ...coords, state],
    queryFn: () => apiClient.getNearbyStations(coords[0], coords[1], 50, 'regular', state),
  });

  const { data: vehicleData } = useQuery({
    queryKey: ['user-vehicle'],
    queryFn: () => apiClient.getUserVehicle(),
  });

  const { data: plansData } = useQuery({
    queryKey: ['plans'],
    queryFn: () => apiClient.getPlans(),
  });

  const { data: predData } = useQuery({
    queryKey: ['price-prediction', state],
    queryFn: () => apiClient.getPricePrediction(state),
    enabled: !!state,
  });

  const stations = nearbyData?.stations ?? [];
  const priced = stations.filter(s => s.regular_price != null);
  const avgPrice = priced.length
    ? priced.reduce((s, x) => s + Number(x.regular_price ?? 0), 0) / priced.length : 0;
  const cheapest = [...priced].sort((a, b) => Number(a.regular_price ?? 0) - Number(b.regular_price ?? 0))[0];

  const vehicle = vehicleData?.vehicle;
  const userVehicle = vehicleData?.userVehicle;
  const recentPlans = (plansData?.plans ?? []).slice(0, 3);
  const totalSaved = (plansData?.plans ?? []).reduce((s, p) => s + Number(p.projected_savings ?? 0), 0);

  const pred = predData?.prediction;
  const PredIcon = pred?.direction === 'rising' ? HiOutlineArrowTrendingUp : pred?.direction === 'falling' ? HiOutlineArrowTrendingDown : HiOutlineMinus;
  const predColor = pred?.direction === 'rising' ? '#dc2626' : pred?.direction === 'falling' ? '#16a34a' : '#6b7280';

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">

      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Good {getTimeOfDay()}, {name} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here's your fuel intelligence overview for today.
          </p>
        </div>
        <Link
          href="/dashboard/plans/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
        >
          <HiOutlineBolt className="h-4 w-4" />
          New Plan
        </Link>
      </div>

      {/* ── Today's Route ────────────────────────────────────────── */}
      <TodaysRoute />

      {/* ── Stat cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Nearby Stations"
          value={stations.length.toString()}
          icon={<HiOutlineMapPin className="h-5 w-5" />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          sub={priced.length > 0 ? `${priced.length} with prices` : 'Loading…'}
        />
        <StatCard
          label="Cheapest Nearby"
          value={cheapest ? formatPrice(cheapest.regular_price) : '—'}
          icon={<HiOutlineArrowTrendingDown className="h-5 w-5" />}
          iconBg="bg-green-50"
          iconColor="text-green-600"
          sub={cheapest?.store_name ?? 'No data'}
          valueColor="text-green-600"
          logoSlot={cheapest?.store_name && getLogoPath(cheapest.store_name)
            ? <StationLogo name={cheapest.store_name} size={36} />
            : undefined}
        />
        <StatCard
          label="Area Average"
          value={avgPrice > 0 ? formatPrice(avgPrice) : '—'}
          icon={<RiGasStationLine className="h-5 w-5" />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          sub="Regular unleaded"
        />
        <StatCard
          label="Total Saved"
          value={totalSaved > 0 ? formatCost(totalSaved) : '—'}
          icon={<HiOutlineCurrencyDollar className="h-5 w-5" />}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          sub={`across ${plansData?.plans?.length ?? 0} plans`}
          valueColor="text-purple-600"
        />
      </div>

      {/* ── Map + sidebar ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Map */}
        <div className="lg:col-span-2 bg-white rounded-2xl overflow-hidden card-shadow-md" style={{ height: 420 }}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <div className="flex items-center gap-2">
              <HiOutlineMapPin className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Nearby Gas Stations</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-green-500" />Cheap</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-500" />Average</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500" />High</span>
            </div>
          </div>
          <div style={{ height: 'calc(100% - 53px)' }}>
            <NearbyMap stations={stations} avgPrice={avgPrice} center={coords} />
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Vehicle card */}
          <div className="bg-white rounded-2xl card-shadow p-5 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <RiCarLine className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">My Vehicle</span>
            </div>
            {vehicle ? (
              <>
                <p className="font-bold text-foreground">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{vehicle.trim}</p>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <RiDropLine className="h-3 w-3" />
                      Tank level
                    </span>
                    <span className="font-semibold" style={{ color: tankColor(userVehicle?.tank_level_percent ?? 0) }}>
                      {userVehicle?.tank_level_percent ?? 0}%
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${userVehicle?.tank_level_percent ?? 0}%`,
                        background: tankColor(userVehicle?.tank_level_percent ?? 0),
                      }}
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {vehicle.mpg_combined != null && (
                    <div className="bg-secondary rounded-lg px-3 py-2 text-center">
                      <p className="text-lg font-bold text-foreground">{vehicle.mpg_combined}</p>
                      <p className="text-[10px] text-muted-foreground">mpg combined</p>
                    </div>
                  )}
                  {vehicle.tank_size_gallons != null && (
                    <div className="bg-secondary rounded-lg px-3 py-2 text-center">
                      <p className="text-lg font-bold text-foreground">{vehicle.tank_size_gallons}</p>
                      <p className="text-[10px] text-muted-foreground">gal tank</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center gap-2">
                <p className="text-sm text-muted-foreground">No vehicle set</p>
                <Link href="/dashboard/vehicle" className="text-xs text-primary font-medium hover:underline">
                  Add vehicle →
                </Link>
              </div>
            )}
          </div>

          {/* Price prediction chip */}
          {pred && (
            <div className="bg-white rounded-2xl card-shadow p-5">
              <div className="flex items-center gap-2 mb-3">
                <PredIcon className="h-4 w-4" style={{ color: predColor }} />
                <span className="text-sm font-semibold">Price Outlook</span>
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                  style={{ background: predColor }}>
                  {(pred.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-2xl font-bold" style={{ color: predColor }}>
                {pred.direction === 'stable'
                  ? 'Stable'
                  : `${pred.direction === 'rising' ? '+' : '-'}${Math.abs(pred.predicted_delta * 100).toFixed(1)}¢`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Over next {pred.hours_ahead}h in {state}
              </p>
              {pred.reasoning && (
                <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border leading-relaxed">
                  {pred.reasoning}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent plans ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Recent Fuel Plans</h2>
          <Link href="/dashboard/plans" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
            View all <HiOutlineArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {recentPlans.length === 0 ? (
          <div className="bg-white rounded-2xl card-shadow p-10 text-center">
            <RiGasStationLine className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground">No plans yet.</p>
            <Link href="/dashboard/plans/new"
              className="inline-flex items-center gap-1.5 mt-3 text-sm text-primary font-medium hover:underline">
              <HiOutlineBolt className="h-3.5 w-3.5" /> Generate your first plan
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {recentPlans.map(plan => (
              <Link key={plan.id} href={`/dashboard/plans/${plan.id}`}>
                <div className="bg-white rounded-2xl card-shadow p-5 hover:card-shadow-hover transition-all duration-200 cursor-pointer group border border-transparent hover:border-primary/20">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <RiGasStationLine className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(plan.generated_at ?? '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground line-clamp-2 mb-3">
                    {plan.ai_summary ?? 'Fuel plan'}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div>
                      <p className="text-lg font-bold text-foreground">{formatCost(plan.total_fuel_cost ?? 0)}</p>
                      <p className="text-[10px] text-muted-foreground">total cost</p>
                    </div>
                    {Number(plan.projected_savings ?? 0) > 0 && (
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">+{formatCost(plan.projected_savings!)}</p>
                        <p className="text-[10px] text-muted-foreground">saved</p>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon, iconBg, iconColor, sub, valueColor, logoSlot,
}: {
  label: string; value: string; icon: React.ReactNode;
  iconBg: string; iconColor: string; sub: string; valueColor?: string;
  logoSlot?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl card-shadow p-5">
      <div className="flex items-center gap-3 mb-3">
        {logoSlot ?? (
          <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', iconBg, iconColor)}>
            {icon}
          </div>
        )}
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <p className={cn('text-2xl font-bold', valueColor ?? 'text-foreground')}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}

function tankColor(pct: number) {
  if (pct <= 20) return '#dc2626';
  if (pct <= 40) return '#d97706';
  return '#16a34a';
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
