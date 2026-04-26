'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';
import { AddressAutocomplete } from '@/components/features/AddressAutocomplete';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineMapPin, HiOutlinePencil, HiOutlineXMark } from 'react-icons/hi2';
import { RiRouteLine } from 'react-icons/ri';
import type { UserRoute } from '@gaswiser/api-client';

interface AddressWaypoint { address: string; }

export default function RoutesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<UserRoute | null>(null);
  const [name, setName] = useState('');
  const [routeType, setRouteType] = useState<'daily' | 'today' | 'trip'>('daily');
  const [waypoints, setWaypoints] = useState<AddressWaypoint[]>([{ address: '' }, { address: '' }]);

  const { data, isLoading } = useQuery({
    queryKey: ['routes'],
    queryFn: () => apiClient.getRoutes(),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingRoute(null);
    setName('');
    setRouteType('daily');
    setWaypoints([{ address: '' }, { address: '' }]);
  };

  const createMutation = useMutation({
    mutationFn: () => {
      const filled = waypoints.filter(w => w.address.trim());
      if (filled.length < 2) throw new Error('Enter at least 2 waypoints');
      return apiClient.createRoute({ name, route_type: routeType, waypoints: filled as never });
    },
    onSuccess: () => {
      toast.success('Route saved!');
      closeForm();
      qc.invalidateQueries({ queryKey: ['routes'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingRoute) throw new Error('No route selected');
      const filled = waypoints.filter(w => w.address.trim());
      if (filled.length < 2) throw new Error('Enter at least 2 waypoints');
      return apiClient.updateRoute(editingRoute.id, {
        name,
        route_type: routeType,
        waypoints: filled as never,
      });
    },
    onSuccess: () => {
      toast.success('Route updated!');
      closeForm();
      qc.invalidateQueries({ queryKey: ['routes'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteRoute(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routes'] }),
  });

  const routes = data?.routes ?? [];

  const handleEdit = (r: UserRoute) => {
    setEditingRoute(r);
    setName(r.name || '');
    setRouteType(r.route_type);
    setWaypoints(
      r.waypoints?.length >= 2
        ? r.waypoints.map(w => ({ address: w.address ?? w.label ?? '' }))
        : [{ address: '' }, { address: '' }],
    );
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNewRoute = () => {
    if (showForm && !editingRoute) { closeForm(); return; }
    setEditingRoute(null);
    setName('');
    setRouteType('daily');
    setWaypoints([{ address: '' }, { address: '' }]);
    setShowForm(true);
  };

  const addWaypoint = () => setWaypoints(prev => [...prev, { address: '' }]);
  const removeWaypoint = (i: number) => setWaypoints(prev => prev.filter((_, idx) => idx !== i));
  const updateWaypoint = (i: number, address: string) =>
    setWaypoints(prev => prev.map((w, idx) => idx === i ? { address } : w));

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Saved Routes</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Quick-load routes when generating fuel plans.</p>
        </div>
        <Button onClick={handleNewRoute} variant={showForm && !editingRoute ? 'outline' : 'default'}>
          {showForm && !editingRoute ? <HiOutlineXMark className="h-4 w-4" /> : <HiOutlinePlus className="h-4 w-4" />}
          {showForm && !editingRoute ? 'Cancel' : 'New Route'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editingRoute ? 'Edit Route' : 'New Route'}</CardTitle>
              <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">
                <HiOutlineXMark className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Route Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Daily Commute" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={routeType} onValueChange={v => setRouteType(v as 'daily' | 'today' | 'trip')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily commute</SelectItem>
                    <SelectItem value="today">Today&apos;s route</SelectItem>
                    <SelectItem value="trip">Trip</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Waypoints</Label>
              {waypoints.map((w, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-xs text-muted-foreground w-4 text-right shrink-0">{i + 1}</span>
                  <AddressAutocomplete
                    value={w.address}
                    onChange={address => updateWaypoint(i, address)}
                    placeholder={i === 0 ? 'Start address…' : i === waypoints.length - 1 ? 'End address…' : 'Via…'}
                  />
                  {waypoints.length > 2 && (
                    <button type="button" onClick={() => removeWaypoint(i)} className="text-muted-foreground hover:text-destructive shrink-0">
                      <HiOutlineTrash className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addWaypoint}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <HiOutlinePlus className="h-3.5 w-3.5" />
                Add waypoint
              </button>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => editingRoute ? updateMutation.mutate() : createMutation.mutate()}
                disabled={isPending}
                className="flex-1"
              >
                {isPending ? 'Saving…' : editingRoute ? 'Update Route' : 'Save Route'}
              </Button>
              <Button variant="outline" onClick={closeForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-20 bg-secondary animate-pulse rounded-xl" />)}
        </div>
      )}

      {!isLoading && routes.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <RiRouteLine className="h-10 w-10 mx-auto mb-3" />
          <p className="text-sm">No saved routes yet. Save a route to reuse it in plans.</p>
        </div>
      )}

      <div className="space-y-3">
        {routes.map((r: UserRoute) => (
          <Card key={r.id}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <RiRouteLine className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium text-sm">{r.name || 'Unnamed Route'}</div>
                    <div className="text-[10px] text-muted-foreground capitalize mb-1">{r.route_type}</div>
                    <div className="space-y-0.5">
                      {r.waypoints?.slice(0, 3).map((w, i) => (
                        <div key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                          <HiOutlineMapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-xs">{w.address ?? w.label}</span>
                        </div>
                      ))}
                      {r.waypoints?.length > 3 && (
                        <div className="text-xs text-muted-foreground">+{r.waypoints.length - 3} more stops</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleEdit(r)}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="Edit route"
                  >
                    <HiOutlinePencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(r.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete route"
                  >
                    <HiOutlineTrash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
