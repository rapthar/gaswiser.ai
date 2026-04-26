'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { VehicleSearch } from '@/components/features/VehicleSearch';
import { TankSlider } from '@/components/features/TankSlider';
import toast from 'react-hot-toast';
import type { VehicleDb } from '@gaswiser/api-client';
import { HiOutlineCheckCircle } from 'react-icons/hi2';
import { RiCarLine, RiGasStationLine, RiSpeedLine } from 'react-icons/ri';

export default function VehiclePage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<VehicleDb | null>(null);
  const [tank, setTank] = useState(50);

  const { data: userVehicleData } = useQuery({
    queryKey: ['user-vehicle'],
    queryFn: () => apiClient.getUserVehicle(),
  });

  const current = userVehicleData?.vehicle ?? null;
  const currentUserVehicle = userVehicleData?.userVehicle ?? null;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('No vehicle selected');
      await apiClient.setUserVehicle(selected.id);
    },
    onSuccess: () => {
      toast.success('Vehicle saved!');
      qc.invalidateQueries({ queryKey: ['user-vehicle'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const tankMutation = useMutation({
    mutationFn: () => {
      const vehicleDbId = selected?.id ?? currentUserVehicle?.vehicle_db_id;
      if (!vehicleDbId) throw new Error('No vehicle selected');
      return apiClient.updateTankLevel(vehicleDbId, tank);
    },
    onSuccess: () => {
      toast.success('Tank level updated!');
      qc.invalidateQueries({ queryKey: ['user-vehicle'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Vehicle</h1>
        <p className="text-sm text-muted-foreground mt-1">Set your vehicle to get personalized fuel planning.</p>
      </div>

      {current && (
        <Card className="border border-primary/20" style={{ background: 'hsl(213 100% 99%)' }}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <HiOutlineCheckCircle className="h-5 w-5 text-primary" />
              <div>
                <div className="font-semibold">
                  {current.year} {current.make} {current.model}{current.trim ? ` ${current.trim}` : ''}
                </div>
                <div className="text-sm text-muted-foreground">
                  {current.mpg_combined != null ? `${current.mpg_combined} mpg combined · ` : ''}
                  {current.fuel_type ?? ''}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {current.mpg_city != null && (
                <div className="text-center">
                  <RiSpeedLine className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                  <div className="text-lg font-bold">{current.mpg_city}</div>
                  <div className="text-xs text-muted-foreground">City MPG</div>
                </div>
              )}
              {current.mpg_highway != null && (
                <div className="text-center">
                  <RiSpeedLine className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                  <div className="text-lg font-bold">{current.mpg_highway}</div>
                  <div className="text-xs text-muted-foreground">Hwy MPG</div>
                </div>
              )}
              {current.tank_size_gallons != null && (
                <div className="text-center">
                  <RiGasStationLine className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                  <div className="text-lg font-bold">{current.tank_size_gallons}</div>
                  <div className="text-xs text-muted-foreground">Gal tank</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RiCarLine className="h-4 w-4" />
            Change Vehicle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Search Vehicle</Label>
            <VehicleSearch onSelect={setSelected} />
          </div>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!selected || saveMutation.isPending}
            className="w-full"
          >
            {saveMutation.isPending ? 'Saving…' : 'Save Vehicle'}
          </Button>
        </CardContent>
      </Card>

      {(current || selected) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiGasStationLine className="h-4 w-4" />
              Current Tank Level
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TankSlider value={tank} onChange={setTank} />
            <Button
              onClick={() => tankMutation.mutate()}
              disabled={tankMutation.isPending}
              variant="outline"
              className="w-full"
            >
              {tankMutation.isPending ? 'Updating…' : 'Update Tank Level'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
