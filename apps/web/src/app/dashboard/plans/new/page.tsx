'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PlanForm } from '@/components/features/PlanForm';
import type { FuelPlan } from '@gaswiser/api-client';
import { HiOutlineBolt } from 'react-icons/hi2';

function NewPlanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeId = searchParams.get('route');

  const { data: routesData } = useQuery({
    queryKey: ['routes'],
    queryFn: () => apiClient.getRoutes(),
    enabled: !!routeId,
  });

  const preloadedRoute = routeId
    ? (routesData?.routes ?? []).find(r => r.id === routeId)
    : undefined;

  const initialWaypoints = (preloadedRoute?.waypoints?.length ?? 0) >= 2
    ? preloadedRoute!.waypoints.map(w => ({ address: w.address ?? w.label ?? '' }))
    : undefined;

  const handlePlanGenerated = (p: FuelPlan) => {
    router.push(`/dashboard/plans/${p.id}`);
  };

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">New Fuel Plan</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {preloadedRoute
            ? `Using route: ${preloadedRoute.name || "Today's Route"}`
            : "Enter your route and we'll find the optimal fuel stops."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HiOutlineBolt className="h-4 w-4" />
            Plan Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PlanForm onPlanGenerated={handlePlanGenerated} initialWaypoints={initialWaypoints} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewPlanPage() {
  return (
    <Suspense>
      <NewPlanContent />
    </Suspense>
  );
}
