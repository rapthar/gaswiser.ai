'use client';

import { Slider } from '@/components/ui/slider';
import { RiGasStationLine } from 'react-icons/ri';

interface Props {
  value: number;
  onChange: (v: number) => void;
}

export function TankSlider({ value, onChange }: Props) {
  const color = value <= 20 ? 'text-red-500' : value <= 40 ? 'text-amber-500' : 'text-green-600';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <RiGasStationLine className="h-4 w-4 text-muted-foreground" />
          Current Tank Level
        </div>
        <span className={`text-sm font-bold ${color}`}>{value}%</span>
      </div>
      <Slider
        min={0}
        max={100}
        step={5}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Empty</span>
        <span>Half</span>
        <span>Full</span>
      </div>
    </div>
  );
}
