'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { AddressAutocomplete } from './AddressAutocomplete';
import { HiOutlinePencil, HiOutlineBolt, HiOutlineCheck, HiOutlineXMark, HiOutlinePlus } from 'react-icons/hi2';
import { RiRouteLine } from 'react-icons/ri';
import toast from 'react-hot-toast';
import Link from 'next/link';

export function TodaysRoute() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['routes'],
    queryFn: () => apiClient.getRoutes(),
  });

  const todaysRoute = data?.routes?.find(r => r.route_type === 'today') ?? null;

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!start.trim() || !end.trim()) throw new Error('Enter both start and destination');
      const wp = [{ address: start }, { address: end }] as never;
      if (todaysRoute) {
        return apiClient.updateRoute(todaysRoute.id, {
          name: "Today's Route",
          route_type: 'today',
          waypoints: wp,
        });
      }
      return apiClient.createRoute({ name: "Today's Route", route_type: 'today', waypoints: wp });
    },
    onSuccess: () => {
      toast.success("Today's route saved!");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ['routes'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const startEditing = () => {
    if (todaysRoute?.waypoints?.length) {
      setStart(todaysRoute.waypoints[0]?.address ?? todaysRoute.waypoints[0]?.label ?? '');
      const last = todaysRoute.waypoints[todaysRoute.waypoints.length - 1];
      setEnd(last?.address ?? last?.label ?? '');
    } else {
      setStart('');
      setEnd('');
    }
    setEditing(true);
  };

  if (isLoading) return null;

  return (
    <div className="bg-white rounded-2xl card-shadow p-5">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <RiRouteLine className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Today&apos;s Route</p>
          {!editing && todaysRoute && (
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
              <span className="truncate max-w-[160px]">
                {todaysRoute.waypoints[0]?.address ?? todaysRoute.waypoints[0]?.label}
              </span>
              <span className="shrink-0">→</span>
              <span className="truncate max-w-[160px]">
                {todaysRoute.waypoints[todaysRoute.waypoints.length - 1]?.address
                  ?? todaysRoute.waypoints[todaysRoute.waypoints.length - 1]?.label}
              </span>
            </div>
          )}
          {!editing && !todaysRoute && (
            <p className="text-xs text-muted-foreground mt-0.5">No route set for today</p>
          )}
        </div>

        {!editing && (
          <div className="flex items-center gap-2 shrink-0">
            {todaysRoute && (
              <Link
                href={`/dashboard/plans/new?route=${todaysRoute.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                <HiOutlineBolt className="h-3.5 w-3.5" />
                Generate Plan
              </Link>
            )}
            <button
              onClick={startEditing}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title={todaysRoute ? 'Edit route' : 'Set today\'s route'}
            >
              {todaysRoute ? <HiOutlinePencil className="h-3.5 w-3.5" /> : <HiOutlinePlus className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
      </div>

      {editing && (
        <div className="mt-4 space-y-2.5">
          <AddressAutocomplete value={start} onChange={setStart} placeholder="Starting from…" />
          <AddressAutocomplete value={end} onChange={setEnd} placeholder="Going to…" />
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saveMutation.isPending ? (
                <>
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Saving…
                </>
              ) : (
                <><HiOutlineCheck className="h-3.5 w-3.5" /> Save</>
              )}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <HiOutlineXMark className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
