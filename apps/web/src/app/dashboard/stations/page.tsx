'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { cn, formatPrice, priceBand } from '@/lib/utils';
import { StationLogo } from '@/components/features/StationLogo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import toast from 'react-hot-toast';
import type { Station, StationAdvice } from '@gaswiser/api-client';
import {
  HiOutlineMapPin, HiOutlineSparkles, HiOutlineArrowPath,
  HiOutlineCheckCircle, HiOutlineXMark, HiOutlineClock,
  HiOutlineBanknotes, HiOutlineInformationCircle,
} from 'react-icons/hi2';

// ── Timing badge ─────────────────────────────────────────────────────────────

const TIMING_CONFIG = {
  now:   { label: 'Fill Now',   bg: 'bg-red-100 text-red-700 border-red-200' },
  today: { label: 'Fill Today', bg: 'bg-amber-100 text-amber-700 border-amber-200' },
  soon:  { label: 'Fill Soon',  bg: 'bg-blue-100 text-blue-700 border-blue-200' },
  wait:  { label: 'Wait',       bg: 'bg-green-100 text-green-700 border-green-200' },
};

function TimingBadge({ timing }: { timing: StationAdvice['fill_timing'] }) {
  const cfg = TIMING_CONFIG[timing] ?? TIMING_CONFIG.today;
  return (
    <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border', cfg.bg)}>
      {cfg.label}
    </span>
  );
}

// ── Location bar ─────────────────────────────────────────────────────────────

interface LocationBarProps {
  address: string | null;
  lat: number | null;
  lng: number | null;
  onSave: (address: string, lat: number, lng: number) => void;
}

function LocationBar({ address, lat, lng, onSave }: LocationBarProps) {
  const [editing, setEditing] = useState(!lat);
  const [q, setQ] = useState(address ?? '');
  const [suggestions, setSuggestions] = useState<Array<{ id: string; label: string; short: string; lat: number; lng: number }>>([]);
  const [loading, setLoading] = useState(false);

  const handleInput = useCallback(async (val: string) => {
    setQ(val);
    if (val.length < 3) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const { suggestions: s } = await apiClient.geocodeAutocomplete(val);
      setSuggestions(s);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelect = useCallback((s: { label: string; lat: number; lng: number }) => {
    setQ(s.label);
    setSuggestions([]);
    setEditing(false);
    onSave(s.label, s.lat, s.lng);
  }, [onSave]);

  if (!editing && lat && address) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 border border-border">
        <HiOutlineMapPin className="h-4 w-4 text-primary shrink-0" />
        <span className="flex-1 text-sm font-medium truncate">{address}</span>
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/50 border border-border focus-within:border-primary transition-colors">
        <HiOutlineMapPin className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
          placeholder="Enter your home address…"
          value={q}
          onChange={e => handleInput(e.target.value)}
          autoFocus
        />
        {loading && <div className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />}
        {q && !loading && (
          <button onClick={() => { setQ(''); setSuggestions([]); }} className="text-muted-foreground hover:text-foreground shrink-0">
            <HiOutlineXMark className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {suggestions.map(s => (
            <button
              key={s.id}
              onMouseDown={e => e.preventDefault()}
              onClick={() => handleSelect(s)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary transition-colors border-b border-border last:border-0"
            >
              <div className="font-medium">{s.short}</div>
              <div className="text-xs text-muted-foreground truncate">{s.label}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Station card ─────────────────────────────────────────────────────────────

function StationCard({ station, avgPrice, isRecommended }: { station: Station; avgPrice: number; isRecommended: boolean }) {
  const price = station.regular_price != null ? Number(station.regular_price) : null;
  const band = price != null ? priceBand(price, avgPrice) : 'mid';
  const bandColors = { cheap: 'text-green-600', mid: 'text-amber-600', high: 'text-red-600' };

  return (
    <div className={cn(
      'flex items-center gap-3 p-3.5 rounded-xl border transition-all',
      isRecommended
        ? 'border-primary bg-primary/5 shadow-sm'
        : 'border-border bg-card hover:bg-secondary/30',
    )}>
      <StationLogo name={station.store_name} size={40} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold truncate">{station.store_name}</p>
          {isRecommended && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full">
              <HiOutlineSparkles className="h-2.5 w-2.5" /> Best
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{station.street_address}</p>
        {station.distance_miles != null && (
          <p className="text-xs text-muted-foreground">{Number(station.distance_miles).toFixed(1)} mi away</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className={cn('text-base font-bold', bandColors[band])}>{formatPrice(price)}</p>
        <p className="text-[10px] text-muted-foreground">regular</p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StationsPage() {
  const qc = useQueryClient();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoState, setGeoState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  // Profile for home location
  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiClient.getProfile(),
    staleTime: 60_000,
  });
  const profile = profileData?.profile;

  // On mount: use home location if saved, else request geolocation
  useEffect(() => {
    if (profile?.home_lat && profile?.home_lng) {
      setCoords({ lat: Number(profile.home_lat), lng: Number(profile.home_lng) });
      setGeoState('done');
    } else if (geoState === 'idle' && !profile?.home_lat) {
      setGeoState('loading');
      navigator.geolocation.getCurrentPosition(
        pos => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGeoState('done');
        },
        () => setGeoState('error'),
        { timeout: 8000 },
      );
    }
  }, [profile, geoState]);

  // Save home location mutation
  const saveMutation = useMutation({
    mutationFn: (data: { home_address: string; home_lat: number; home_lng: number }) =>
      apiClient.updateProfile(data),
    onSuccess: (res) => {
      qc.setQueryData(['profile'], res);
      toast.success('Home location saved!');
    },
    onError: () => toast.error('Failed to save location'),
  });

  const handleLocationSave = useCallback((address: string, lat: number, lng: number) => {
    setCoords({ lat, lng });
    setGeoState('done');
    saveMutation.mutate({ home_address: address, home_lat: lat, home_lng: lng });
  }, [saveMutation]);

  // Station analysis query — runs once coords are available
  const { data: analysisData, isLoading: analysisLoading, refetch, isError } = useQuery({
    queryKey: ['station-analysis', coords?.lat, coords?.lng],
    queryFn: () => apiClient.getStationAnalysis(coords!.lat, coords!.lng, 25),
    enabled: !!coords,
    staleTime: 5 * 60_000,
  });

  const stations = analysisData?.stations ?? [];
  const advice = analysisData?.advice ?? null;
  const avgPrice = analysisData?.state_avg ?? (stations.length > 0
    ? stations.reduce((s, x) => s + Number(x.regular_price ?? 0), 0) / stations.filter(x => x.regular_price != null).length
    : 0);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Stations</h1>
        <p className="text-sm text-muted-foreground mt-1">Nearby gas stations and AI-powered fill-up advice.</p>
      </div>

      {/* Location picker */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HiOutlineMapPin className="h-4 w-4 text-primary" /> Home Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LocationBar
            address={profile?.home_address ?? null}
            lat={profile?.home_lat ? Number(profile.home_lat) : null}
            lng={profile?.home_lng ? Number(profile.home_lng) : null}
            onSave={handleLocationSave}
          />
          {geoState === 'error' && !profile?.home_lat && (
            <p className="text-xs text-muted-foreground mt-2">Could not detect location — enter your address above.</p>
          )}
          {geoState === 'loading' && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Detecting your location…
            </p>
          )}
        </CardContent>
      </Card>

      {/* AI Analysis card */}
      {(analysisLoading || advice) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <HiOutlineSparkles className="h-4 w-4 text-primary" /> AI Fill-Up Advice
              </CardTitle>
              {!analysisLoading && (
                <button
                  onClick={() => refetch()}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Refresh"
                >
                  <HiOutlineArrowPath className="h-4 w-4" />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysisLoading ? (
              <div className="space-y-3">
                <div className="h-6 w-32 bg-muted animate-pulse rounded-full" />
                <div className="h-4 w-full bg-muted animate-pulse rounded" />
                <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
              </div>
            ) : advice ? (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  <TimingBadge timing={advice.fill_timing} />
                  {advice.potential_savings != null && advice.potential_savings > 0 && (
                    <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium">
                      <HiOutlineBanknotes className="h-4 w-4" />
                      Save ~${advice.potential_savings.toFixed(2)} vs. area avg
                    </span>
                  )}
                </div>

                <p className="text-sm text-foreground/90 leading-relaxed">{advice.summary}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="flex gap-2.5 p-3 rounded-lg bg-muted/50 border border-border">
                    <HiOutlineClock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Timing</p>
                      <p className="text-sm">{advice.timing_reason}</p>
                    </div>
                  </div>
                  <div className="flex gap-2.5 p-3 rounded-lg bg-muted/50 border border-border">
                    <HiOutlineMapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Station</p>
                      <p className="text-sm">{advice.station_reason}</p>
                    </div>
                  </div>
                </div>

                {advice.recommended_station_name && (
                  <div className="flex items-center gap-2 pt-1 text-sm">
                    <HiOutlineCheckCircle className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      Recommended: <span className="font-semibold">{advice.recommended_station_name}</span>
                      {advice.recommended_price != null && (
                        <span className="text-muted-foreground"> — {formatPrice(advice.recommended_price)}/gal</span>
                      )}
                    </span>
                  </div>
                )}
              </>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {isError && !analysisLoading && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <HiOutlineInformationCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No stations with price data found near this location.</p>
            <p className="text-xs mt-1">Try a different address or check back later.</p>
          </CardContent>
        </Card>
      )}

      {/* Nearby stations list */}
      {stations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Nearby Stations</span>
              <span className="text-sm font-normal text-muted-foreground">{stations.length} found</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stations.map(s => (
              <StationCard
                key={s.id}
                station={s}
                avgPrice={avgPrice}
                isRecommended={s.id === advice?.recommended_station_id}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty + waiting state */}
      {!coords && geoState !== 'loading' && (
        <div className="text-center py-12 text-muted-foreground">
          <HiOutlineMapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Enter your address above to see nearby stations.</p>
        </div>
      )}
    </div>
  );
}
