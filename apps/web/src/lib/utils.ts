import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number | string | null | undefined): string {
  const n = Number(price);
  if (price == null || isNaN(n)) return '—';
  return `$${n.toFixed(3)}`;
}

export function formatMiles(miles: number | string | null | undefined): string {
  const n = Number(miles);
  if (miles == null || isNaN(n)) return '—';
  return `${n.toFixed(1)} mi`;
}

export function formatCost(cost: number | string | null | undefined): string {
  const n = Number(cost);
  if (cost == null || isNaN(n)) return '$0.00';
  return `$${n.toFixed(2)}`;
}

export function priceBand(price: number | string, avg: number | string): 'cheap' | 'mid' | 'high' {
  const p = Number(price);
  const a = Number(avg);
  if (p <= a * 0.98) return 'cheap';
  if (p >= a * 1.02) return 'high';
  return 'mid';
}
