// Shared types used by both web and mobile apps.
// Keep in sync with backend/src/lib/types.ts

export interface Profile {
  id: string;
  email: string | null;
  role: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  home_address: string | null;
  home_lat: number | null;
  home_lng: number | null;
  created_at: string;
  updated_at: string;
}

export interface StationAdvice {
  recommended_station_id: string | null;
  recommended_station_name: string | null;
  recommended_price: number | null;
  fill_timing: 'now' | 'today' | 'soon' | 'wait';
  timing_reason: string;
  station_reason: string;
  summary: string;
  potential_savings: number | null;
}

export interface Station {
  id: string;
  store_name: string;
  street_address: string;
  city: string;
  state: string;
  zipcode: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  fuel_types: string[];
  regular_price?: number | null;
  midgrade_price?: number | null;
  premium_price?: number | null;
  diesel_price?: number | null;
  last_updated?: string | null;
  distance_miles?: number;
}

export interface VehicleDb {
  id: string;
  make: string;
  model: string;
  year: number;
  trim: string | null;
  mpg_city: number | null;
  mpg_highway: number | null;
  mpg_combined: number | null;
  l_per_100km: number | null;
  tank_size_gallons: number | null;
  fuel_type: string;
  source: string;
  verified: boolean;
  created_at: string;
}

export interface UserVehicle {
  id: string;
  user_id: string;
  vehicle_db_id: string;
  nickname: string | null;
  tank_level_percent: number;
  is_primary: boolean;
  created_at: string;
  vehicle?: VehicleDb;
}

export interface Waypoint {
  lat: number;
  lng: number;
  label: string;
  address?: string;
}

export interface AddressWaypoint {
  address: string;
}

export interface UserRoute {
  id: string;
  user_id: string;
  name: string;
  route_type: 'daily' | 'today' | 'trip';
  waypoints: Waypoint[];
  distance_miles: number | null;
  is_active: boolean;
  created_at: string;
}

export interface FuelStop {
  sequence: number;
  station: {
    id: string;
    name: string;
    brand: string | null;
    address: string;
    lat: number;
    lng: number;
  };
  price_per_gallon: number;
  gallons_to_fill: number;
  estimated_cost: number;
  detour_miles: number;
  arrive_at_percent: number;
}

export interface PricePrediction {
  direction: 'rising' | 'falling' | 'stable';
  confidence: number;
  hours_ahead: number;
  predicted_delta: number;
}

export interface FuelPlan {
  id: string;
  user_id: string;
  route_id: string | null;
  vehicle_id: string;
  stops: FuelStop[];
  total_fuel_cost: number;
  total_distance_miles: number;
  projected_savings: number;
  price_prediction: PricePrediction | null;
  map_polyline: string | null;
  ai_summary: string;
  ai_reasoning: string | null;
  generated_at: string;
}

export interface PlanChat {
  id: string;
  plan_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface AaaStatePrice {
  state_code: string;
  state_name: string;
  regular_price: number | null;
  mid_grade_price: number | null;
  premium_price: number | null;
  diesel_price: number | null;
}

export interface PriceScoutResult {
  direction: 'rising' | 'falling' | 'stable';
  confidence: number;
  hours_ahead: number;
  predicted_delta_cents?: number;
  predicted_delta: number;
  reasoning: string;
}

export interface CommuteAdvice {
  best_day: string;
  best_time: string;
  expected_savings_per_gallon: number;
  reasoning: string;
}

export interface GeneratePlanRequest {
  vehicle_db_id: string;
  route_id?: string;
  waypoints?: (Waypoint | AddressWaypoint)[];
  tank_level_percent: number;
  fuel_grade: 'regular' | 'midgrade' | 'premium' | 'diesel';
  max_detour_miles?: number;
}

export interface CreateRouteRequest {
  name: string;
  route_type: 'daily' | 'today' | 'trip';
  waypoints: Waypoint[];
}
