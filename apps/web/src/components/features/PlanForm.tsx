'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VehicleSearch } from './VehicleSearch';
import { TankSlider } from './TankSlider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';
import type { VehicleDb, FuelPlan } from '@gaswiser/api-client';
import { AddressAutocomplete } from './AddressAutocomplete';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineBolt } from 'react-icons/hi2';

interface Props {
  onPlanGenerated: (plan: FuelPlan) => void;
  initialWaypoints?: Array<{ address: string }>;
}

export function PlanForm({ onPlanGenerated, initialWaypoints }: Props) {
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState<VehicleDb | null>(null);
  const [tankLevel, setTankLevel] = useState(50);
  const [fuelGrade, setFuelGrade] = useState('regular');
  const [maxDetour, setMaxDetour] = useState(3);
  const [waypoints, setWaypoints] = useState(
    initialWaypoints && initialWaypoints.length >= 2
      ? initialWaypoints
      : [{ address: '' }, { address: '' }],
  );
  const [loading, setLoading] = useState(false);

  const addWaypoint = () => setWaypoints(prev => [...prev, { address: '' }]);
  const removeWaypoint = (i: number) => setWaypoints(prev => prev.filter((_, idx) => idx !== i));
  const updateWaypoint = (i: number, address: string) =>
    setWaypoints(prev => prev.map((w, idx) => idx === i ? { address } : w));

  const handleGenerate = async () => {
    if (!vehicle) return toast.error('Please select a vehicle');
    if (!user) return toast.error('Please sign in');
    const filled = waypoints.filter(w => w.address.trim());
    if (filled.length < 2) return toast.error('Please enter at least 2 waypoints');

    setLoading(true);
    try {
      const plan = await apiClient.generatePlan({
        vehicle_db_id: vehicle.id,
        tank_level_percent: tankLevel,
        fuel_grade: fuelGrade as 'regular' | 'midgrade' | 'premium' | 'diesel',
        max_detour_miles: maxDetour,
        waypoints: filled as never, // backend geocodes address-only waypoints
      });
      onPlanGenerated(plan);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Vehicle</Label>
        <VehicleSearch onSelect={setVehicle} />
        {vehicle && (
          <p className="text-xs text-muted-foreground">
            {vehicle.mpg_combined != null ? `${vehicle.mpg_combined} mpg · ` : ''}
            {vehicle.tank_size_gallons != null ? `${vehicle.tank_size_gallons} gal tank · ` : ''}
            {vehicle.fuel_type ?? ''}
          </p>
        )}
      </div>

      <TankSlider value={tankLevel} onChange={setTankLevel} />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Fuel Grade</Label>
          <Select value={fuelGrade} onValueChange={setFuelGrade}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="midgrade">Mid-Grade</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="diesel">Diesel</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Max Detour (miles)</Label>
          <Input
            type="number"
            min={0}
            max={20}
            value={maxDetour}
            onChange={e => setMaxDetour(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Route Waypoints</Label>
        <div className="space-y-2">
          {waypoints.map((w, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-xs text-muted-foreground w-4 text-right shrink-0">{i + 1}</span>
              <AddressAutocomplete
                value={w.address}
                onChange={address => updateWaypoint(i, address)}
                placeholder={i === 0 ? 'Start address…' : i === waypoints.length - 1 ? 'Destination…' : 'Via…'}
              />
              {waypoints.length > 2 && (
                <button type="button" onClick={() => removeWaypoint(i)} className="text-muted-foreground hover:text-destructive shrink-0">
                  <HiOutlineTrash className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addWaypoint}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-1"
        >
          <HiOutlinePlus className="h-3.5 w-3.5" />
          Add stop
        </button>
      </div>

      <Button onClick={handleGenerate} disabled={loading} className="w-full">
        {loading ? (
          <span className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
            Optimizing route…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <HiOutlineBolt className="h-4 w-4" />
            Generate Fuel Plan
          </span>
        )}
      </Button>
    </div>
  );
}
