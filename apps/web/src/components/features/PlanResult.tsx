'use client';

import type { FuelPlan } from '@gaswiser/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatMiles, formatCost } from '@/lib/utils';
import { HiOutlineMapPin, HiOutlineCurrencyDollar, HiOutlineArrowTrendingDown } from 'react-icons/hi2';
import { RiRouteLine } from 'react-icons/ri';
import { StationLogo, getLogoPath } from './StationLogo';

interface Props {
  plan: FuelPlan;
}

export function PlanResult({ plan }: Props) {
  const stops = plan.stops ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <CardContent className="pt-4">
            <HiOutlineCurrencyDollar className="h-5 w-5 text-primary mx-auto mb-1" />
            <div className="text-xl font-bold">{formatCost(plan.total_fuel_cost ?? 0)}</div>
            <div className="text-xs text-muted-foreground">Total cost</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4">
            <HiOutlineArrowTrendingDown className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <div className="text-xl font-bold text-green-600">{formatCost(plan.projected_savings ?? 0)}</div>
            <div className="text-xs text-muted-foreground">Savings</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4">
            <RiRouteLine className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
            <div className="text-xl font-bold">{formatMiles(plan.total_distance_miles ?? 0)}</div>
            <div className="text-xs text-muted-foreground">Route</div>
          </CardContent>
        </Card>
      </div>

      {plan.ai_summary && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm">{plan.ai_summary}</p>
          </CardContent>
        </Card>
      )}

      {stops.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Fuel Stops</h3>
          {stops.map((stop, i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 min-w-0">
                    {getLogoPath(stop.station?.name ?? '') ? (
                      <StationLogo name={stop.station?.name ?? ''} size={36} />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {stop.sequence ?? i + 1}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{stop.station?.name ?? 'Station'}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <HiOutlineMapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{stop.station?.address ?? ''}</span>
                      </div>
                      {stop.detour_miles != null && stop.detour_miles > 0.1 && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          +{stop.detour_miles.toFixed(1)} mi detour
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm">{formatPrice(stop.price_per_gallon)}</div>
                    <div className="text-xs text-muted-foreground">{stop.gallons_to_fill?.toFixed(1)} gal</div>
                    <div className="text-xs font-medium text-primary">{formatCost(stop.estimated_cost)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {plan.ai_reasoning && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground/70">AI reasoning</summary>
          <p className="mt-2 whitespace-pre-wrap">{plan.ai_reasoning}</p>
        </details>
      )}
    </div>
  );
}
