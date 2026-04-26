'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { formatCost, formatMiles } from '@/lib/utils';
import { HiOutlineArrowTrendingDown, HiOutlineChevronRight, HiOutlinePlus, HiOutlineBolt, HiOutlineTrash } from 'react-icons/hi2';
import { RiGasStationLine, RiRouteLine } from 'react-icons/ri';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function PlansPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => apiClient.getPlans(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deletePlan(id),
    onSuccess: () => {
      toast.success('Plan deleted');
      qc.invalidateQueries({ queryKey: ['plans'] });
    },
    onError: () => toast.error('Failed to delete plan'),
  });

  const plans = data?.plans ?? [];
  const totalSaved = plans.reduce((s, p) => s + Number(p.projected_savings ?? 0), 0);

  return (
    <div className="space-y-6 max-w-[900px]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fuel Plans</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-optimized routes and fuel stop history.</p>
        </div>
        <Link
          href="/dashboard/plans/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
        >
          <HiOutlinePlus className="h-4 w-4" />
          New Plan
        </Link>
      </div>

      {/* Summary stat */}
      {plans.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl card-shadow p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Plans</p>
            <p className="text-2xl font-bold">{plans.length}</p>
          </div>
          <div className="bg-white rounded-2xl card-shadow p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Saved</p>
            <p className="text-2xl font-bold text-green-600">{formatCost(totalSaved)}</p>
          </div>
          <div className="bg-white rounded-2xl card-shadow p-4">
            <p className="text-xs text-muted-foreground mb-1">Avg Saving/Plan</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCost(totalSaved / plans.length)}
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-white rounded-2xl card-shadow animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && plans.length === 0 && (
        <div className="bg-white rounded-2xl card-shadow p-16 text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <RiGasStationLine className="h-7 w-7 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-1">No plans yet</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Generate your first AI fuel plan to start saving.
          </p>
          <Link
            href="/dashboard/plans/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg gradient-primary text-white text-sm font-semibold"
          >
            <HiOutlineBolt className="h-4 w-4" />
            Generate First Plan
          </Link>
        </div>
      )}

      {/* Plan list */}
      <div className="flex flex-col gap-4">
        {plans.map(plan => (
          <div
            key={plan.id}
            onClick={() => router.push(`/dashboard/plans/${plan.id}`)}
            className="bg-white rounded-2xl card-shadow hover:card-shadow-md transition-all border border-transparent hover:border-primary/20 cursor-pointer group p-5"
          >
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                <RiGasStationLine className="h-5 w-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {plan.ai_summary ?? 'Fuel plan'}
                </p>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span>
                    {new Date(plan.generated_at ?? '').toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </span>
                  {plan.total_distance_miles != null && (
                    <span className="flex items-center gap-1">
                      <RiRouteLine className="h-3 w-3" />
                      {formatMiles(plan.total_distance_miles)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                {Number(plan.projected_savings ?? 0) > 0 && (
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-green-600 flex items-center gap-1">
                      <HiOutlineArrowTrendingDown className="h-3.5 w-3.5" />
                      {formatCost(plan.projected_savings!)} saved
                    </p>
                  </div>
                )}
                <div className="text-right">
                  <p className="text-base font-bold">{formatCost(plan.total_fuel_cost ?? 0)}</p>
                  <p className="text-[10px] text-muted-foreground">total cost</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteMutation.mutate(plan.id); }}
                  disabled={deleteMutation.isPending}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                  title="Delete plan"
                >
                  <HiOutlineTrash className="h-4 w-4" />
                </button>
                <HiOutlineChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
