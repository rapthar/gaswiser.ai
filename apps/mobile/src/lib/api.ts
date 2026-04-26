import { GasWiserClient } from '@gaswiser/api-client';
import * as SecureStore from 'expo-secure-store';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

const AUTH_KEY = 'supabase-session';

export const apiClient = new GasWiserClient(BASE, () => {
  // SecureStore is sync on read via a cached value — we return null if unavailable
  // (Full async flow handled by AuthContext refreshing the token)
  try {
    const raw = (SecureStore as unknown as { getItemSync?: (k: string) => string | null }).getItemSync?.(AUTH_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as { access_token: string }).access_token;
  } catch {
    return null;
  }
});

// Async version for contexts that can await
export async function getAccessToken(): Promise<string | null> {
  try {
    const raw = await SecureStore.getItemAsync(AUTH_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as { access_token: string }).access_token;
  } catch {
    return null;
  }
}
