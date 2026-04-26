'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { HiOutlineMagnifyingGlass, HiOutlineCheckCircle, HiOutlineXMark, HiOutlineSparkles } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import type { VehicleDb } from '@gaswiser/api-client';

function parseVehicleQuery(q: string): { year: number; make: string; model: string } | null {
  const yearMatch = q.match(/\b(19|20)\d{2}\b/);
  if (!yearMatch) return null;
  const year = parseInt(yearMatch[0]);
  const rest = q.replace(yearMatch[0], '').trim().split(/\s+/).filter(Boolean);
  if (rest.length < 2) return null;
  return { year, make: rest[0], model: rest.slice(1).join(' ') };
}

interface Props {
  onSelect: (vehicle: VehicleDb) => void;
}

export function VehicleSearch({ onSelect }: Props) {
  const [q, setQ] = useState('');
  const [isSelected, setIsSelected] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Strip year from search so "2022 Toyota Camry" searches for "Toyota Camry"
  const searchQ = q.replace(/\b(19|20)\d{2}\b/g, '').trim();

  const { data, isLoading } = useQuery({
    queryKey: ['vehicles', searchQ],
    queryFn: () => apiClient.searchVehicles(searchQ, 10),
    enabled: searchQ.length >= 2 && !isSelected,
  });

  const handleSelect = useCallback((v: VehicleDb) => {
    setQ(`${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ''}`);
    setIsSelected(true);
    onSelect(v);
  }, [onSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQ(e.target.value);
    if (isSelected) setIsSelected(false);
  };

  const handleClear = () => {
    setQ('');
    setIsSelected(false);
  };

  const handleResearch = async () => {
    const parsed = parseVehicleQuery(q);
    if (!parsed) {
      toast.error('Format: year make model  (e.g. 2022 Toyota Camry)');
      return;
    }
    setIsResearching(true);
    try {
      const { vehicle } = await apiClient.researchVehicle(parsed.year, parsed.make, parsed.model);
      handleSelect(vehicle);
      toast.success('Vehicle found and added!');
    } catch {
      toast.error('Could not find vehicle — check year, make, and model.');
    } finally {
      setIsResearching(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsSelected(true); // treat blur as "done" — hides dropdown without clearing text
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const showDropdown = q.length >= 2 && !isSelected;

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        {isSelected
          ? <HiOutlineCheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
          : <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        }
        <Input
          value={q}
          onChange={handleChange}
          onFocus={() => { if (isSelected) setIsSelected(false); }}
          placeholder="Search vehicle (e.g. 2022 Toyota Camry)…"
          className="pl-9 pr-8"
        />
        {q && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <HiOutlineXMark className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {isLoading && (
            <div className="px-4 py-3 text-sm text-muted-foreground">Searching…</div>
          )}
          {!isLoading && (!data?.vehicles || data.vehicles.length === 0) && (
            <div className="px-4 py-3">
              <p className="text-sm text-muted-foreground mb-2">Not in database</p>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={handleResearch}
                disabled={isResearching}
                className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline disabled:opacity-50"
              >
                {isResearching ? (
                  <>
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    Researching with AI…
                  </>
                ) : (
                  <>
                    <HiOutlineSparkles className="h-3.5 w-3.5" />
                    Research &amp; Add with AI
                  </>
                )}
              </button>
              <p className="text-xs text-muted-foreground mt-1.5">Use format: year make model (e.g. 2022 Toyota Camry)</p>
            </div>
          )}
          {data?.vehicles?.map(v => (
            <button
              key={v.id}
              type="button"
              onClick={() => handleSelect(v)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary transition-colors border-b border-border last:border-0"
            >
              <div className="font-medium">{v.year} {v.make} {v.model}{v.trim ? ` ${v.trim}` : ''}</div>
              <div className="text-xs text-muted-foreground">
                {v.mpg_combined != null ? `${v.mpg_combined} mpg combined` : ''}
                {v.fuel_type ? ` · ${v.fuel_type}` : ''}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
