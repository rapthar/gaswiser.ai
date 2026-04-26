import { GasWiserClient } from '@gaswiser/api-client';
import { supabase } from './supabase';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export const apiClient = new GasWiserClient(BASE, () => {
  // Returns the cached session token synchronously; fine for client components.
  // Server actions must pass their own token.
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('sb-oeccfmjiqlekufnntgrw-auth-token');
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as { access_token: string }).access_token;
  } catch {
    return null;
  }
});
