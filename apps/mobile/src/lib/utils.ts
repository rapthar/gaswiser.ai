export function formatPrice(price: number | null | undefined): string {
  if (price == null) return '—';
  return `$${price.toFixed(3)}`;
}

export function formatMiles(miles: number | null | undefined): string {
  if (miles == null) return '—';
  return `${miles.toFixed(1)} mi`;
}

export function formatCost(cost: number | null | undefined): string {
  if (cost == null) return '—';
  return `$${cost.toFixed(2)}`;
}

export function priceBand(price: number, avg: number): 'cheap' | 'mid' | 'high' {
  if (price <= avg * 0.98) return 'cheap';
  if (price >= avg * 1.02) return 'high';
  return 'mid';
}
