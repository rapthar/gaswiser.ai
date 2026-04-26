'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { HiOutlineMapPin, HiOutlineArrowPath } from 'react-icons/hi2';
import { cn } from '@/lib/utils';

interface Suggestion {
  id: string;
  label: string;
  short: string;
  lat: number;
  lng: number;
}

interface Props {
  value: string;
  onChange: (address: string, coords?: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
}

export function AddressAutocomplete({ value, onChange, placeholder, className }: Props) {
  const [input, setInput]             = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen]           = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [isSelected, setIsSelected]   = useState(false);

  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep input in sync if parent resets value
  useEffect(() => {
    if (value !== input) { setInput(value); setIsSelected(!!value); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Outside click → close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 3) { setSuggestions([]); setIsOpen(false); return; }
    setIsLoading(true);
    try {
      const { suggestions: results } = await apiClient.geocodeAutocomplete(q);
      setSuggestions(results);
      setIsOpen(results.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    setIsSelected(false);
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 280);
  };

  const handleSelect = (s: Suggestion) => {
    setInput(s.label);
    setIsSelected(true);
    setIsOpen(false);
    setSuggestions([]);
    onChange(s.label, { lat: s.lat, lng: s.lng });
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <HiOutlineMapPin className={cn(
          'absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none',
          isSelected ? 'text-primary' : 'text-muted-foreground',
        )} />
        <Input
          value={input}
          onChange={handleChange}
          onFocus={() => { if (suggestions.length > 0 && !isSelected) setIsOpen(true); }}
          placeholder={placeholder ?? 'Enter address…'}
          className={cn('pl-8 pr-8', className)}
        />
        {isLoading && (
          <HiOutlineArrowPath className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full bg-white border border-border rounded-lg shadow-lg overflow-hidden">
          {suggestions.map(s => (
            <li key={s.id}>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()} // prevent input blur before click
                onClick={() => handleSelect(s)}
                className="w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-secondary transition-colors border-b border-border last:border-0"
              >
                <HiOutlineMapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.short}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
