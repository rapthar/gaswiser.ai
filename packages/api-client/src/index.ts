export type {
  Station,
  VehicleDb,
  UserVehicle,
  Waypoint,
  AddressWaypoint,
  UserRoute,
  FuelStop,
  PricePrediction,
  FuelPlan,
  PlanChat,
  AaaStatePrice,
  PriceScoutResult,
  CommuteAdvice,
  GeneratePlanRequest,
  CreateRouteRequest,
  Profile,
  StationAdvice,
} from './types.js';

import type {
  VehicleDb,
  UserVehicle,
  UserRoute,
  FuelPlan,
  PlanChat,
  Station,
  AaaStatePrice,
  GeneratePlanRequest,
  CreateRouteRequest,
  PriceScoutResult,
  CommuteAdvice,
  Profile,
  StationAdvice,
} from './types.js';

export class GasWiserClient {
  private baseUrl: string;
  private getToken: () => string | null;

  constructor(baseUrl: string, getToken: () => string | null) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.getToken = getToken;
  }

  private async fetch<T>(path: string, init?: RequestInit): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers as Record<string, string>),
    };

    const res = await fetch(`${this.baseUrl}/api/v1${path}`, { ...init, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error: string }).error ?? res.statusText);
    }
    return res.json() as Promise<T>;
  }

  // ── Vehicles ────────────────────────────────────────────────────────────────

  searchVehicles(q: string, limit = 20): Promise<{ vehicles: VehicleDb[] }> {
    return this.fetch(`/vehicles/search?q=${encodeURIComponent(q)}&limit=${limit}`);
  }

  researchVehicle(year: number, make: string, model: string, trim?: string): Promise<{ vehicle: VehicleDb; source: string }> {
    return this.fetch('/vehicles/research', {
      method: 'POST',
      body: JSON.stringify({ year, make, model, trim }),
    });
  }

  // Returns all vehicles for the current user (primary first)
  getUserVehicles(): Promise<{ vehicles: (UserVehicle & { vehicle: VehicleDb })[] }> {
    return this.fetch('/user/vehicle');
  }

  // Convenience: returns primary vehicle or null
  async getUserVehicle(): Promise<{ vehicle: VehicleDb; userVehicle: UserVehicle } | null> {
    const { vehicles } = await this.getUserVehicles();
    if (!vehicles.length) return null;
    const uv = vehicles[0];
    return { vehicle: uv.vehicle as VehicleDb, userVehicle: uv };
  }

  // Set user's vehicle (upserts by vehicle_db_id)
  setUserVehicle(vehicle_db_id: string, options?: { nickname?: string; tank_level_percent?: number }): Promise<UserVehicle> {
    return this.fetch('/user/vehicle', {
      method: 'POST',
      body: JSON.stringify({ vehicle_db_id, is_primary: true, tank_level_percent: 50, ...options }),
    });
  }

  updateTankLevel(vehicle_db_id: string, tank_level_percent: number): Promise<UserVehicle> {
    return this.fetch('/user/vehicle/tank', {
      method: 'PATCH',
      body: JSON.stringify({ vehicle_db_id, tank_level_percent }),
    });
  }

  // ── Routes ──────────────────────────────────────────────────────────────────

  getRoutes(): Promise<{ routes: UserRoute[] }> {
    return this.fetch('/routes');
  }

  createRoute(data: CreateRouteRequest | { name: string; route_type: 'daily' | 'today' | 'trip'; waypoints: Array<{ address: string }> }): Promise<UserRoute> {
    return this.fetch('/routes', { method: 'POST', body: JSON.stringify(data) });
  }

  updateRoute(id: string, data: Partial<CreateRouteRequest>): Promise<UserRoute> {
    return this.fetch(`/routes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  deleteRoute(id: string): Promise<void> {
    return this.fetch(`/routes/${id}`, { method: 'DELETE' });
  }

  // ── Plans ───────────────────────────────────────────────────────────────────

  generatePlan(data: GeneratePlanRequest): Promise<FuelPlan> {
    return this.fetch('/plans/generate', { method: 'POST', body: JSON.stringify(data) });
  }

  getPlan(id: string): Promise<FuelPlan> {
    return this.fetch(`/plans/${id}`);
  }

  getPlans(): Promise<{ plans: FuelPlan[] }> {
    return this.fetch('/plans');
  }

  deletePlan(id: string): Promise<void> {
    return this.fetch(`/plans/${id}`, { method: 'DELETE' });
  }

  // ── Prices ──────────────────────────────────────────────────────────────────

  getNearbyStations(lat: number, lng: number, radius_miles = 10, fuel_type = 'regular', state?: string): Promise<{ stations: Station[]; count: number }> {
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng), radius_miles: String(radius_miles), fuel_type });
    if (state) params.set('state', state);
    return this.fetch(`/prices/nearby?${params}`);
  }

  getPricePrediction(state: string): Promise<{ state: string; current_avg: number | null; prediction: PriceScoutResult }> {
    return this.fetch(`/prices/predict?state=${state}`);
  }

  getCommuteAdvice(state: string): Promise<{ state: string; advice: CommuteAdvice }> {
    return this.fetch(`/prices/commute-advice?state=${state}`);
  }

  getStatePrice(state: string): Promise<AaaStatePrice> {
    return this.fetch(`/prices/state/${state}`);
  }

  getPriceHistory(state: string): Promise<{ history: Array<{ recorded_at: string; regular?: number; midgrade?: number; premium?: number; diesel?: number }> }> {
    return this.fetch(`/prices/history?state=${state}`);
  }

  // ── Chat (streaming — returns SSE response) ──────────────────────────────────

  async *streamChat(plan_id: string, message: string): AsyncGenerator<string> {
    const token = this.getToken();
    const res = await fetch(`${this.baseUrl}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ plan_id, message }),
    });

    if (!res.ok || !res.body) throw new Error('Chat request failed');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data) as { chunk: string };
          yield parsed.chunk;
        } catch {
          // ignore malformed chunks
        }
      }
    }
  }

  getChatHistory(plan_id: string): Promise<{ messages: PlanChat[] }> {
    return this.fetch(`/chat/${plan_id}`);
  }

  // ── Geocoding ────────────────────────────────────────────────────────────────

  geocodeAutocomplete(q: string): Promise<{ suggestions: Array<{ id: string; label: string; short: string; lat: number; lng: number }> }> {
    return this.fetch(`/geocode/autocomplete?q=${encodeURIComponent(q)}`);
  }

  // ── Profile ──────────────────────────────────────────────────────────────────

  getProfile(): Promise<{ profile: Profile }> {
    return this.fetch('/profile');
  }

  updateProfile(data: { full_name?: string; username?: string; avatar_url?: string; home_address?: string; home_lat?: number; home_lng?: number }): Promise<{ profile: Profile }> {
    return this.fetch('/profile', { method: 'PUT', body: JSON.stringify(data) });
  }

  getStationAnalysis(lat: number, lng: number, radius_miles = 25, state?: string): Promise<{ stations: Station[]; prediction: PriceScoutResult; advice: StationAdvice; state_avg: number | null }> {
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng), radius_miles: String(radius_miles) });
    if (state) params.set('state', state);
    return this.fetch(`/prices/station-analysis?${params}`);
  }

  async uploadAvatar(file: File): Promise<{ avatar_url: string; profile: Profile }> {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    // chunk to avoid call-stack overflow on large files
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    const data = btoa(binary);
    return this.fetch('/profile/avatar', {
      method: 'POST',
      body: JSON.stringify({ data, contentType: file.type }),
    });
  }
}
