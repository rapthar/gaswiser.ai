// ─── Existing DB types (matching gaswiser.com schema) ───────────────────────

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
  brand_id: string | null;
  website: string | null;
  fuel_types: string[];
  numeric_id: number | null;
  created_at: string;
  updated_at: string;
  // joined from price_updates
  regular_price?: number | null;
  midgrade_price?: number | null;
  premium_price?: number | null;
  diesel_price?: number | null;
  last_updated?: string | null;
  // distance (added by nearby query)
  distance_miles?: number;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_path: string | null;
  supported_countries: string[];
  is_active: boolean;
}

export interface PriceUpdate {
  id: string;
  station_id: string;
  price: number;
  fuel_type: 'regular' | 'midgrade' | 'premium' | 'diesel';
  update_time: string;
  status: string;
  user_id: string | null;
}

export interface AaaGasPrice {
  id: string;
  state_code: string;
  state_name: string;
  regular_price: number | null;
  mid_grade_price: number | null;
  premium_price: number | null;
  diesel_price: number | null;
  current_avg_data: Record<string, unknown> | null;
  yesterday_avg_data: Record<string, unknown> | null;
  week_ago_avg_data: Record<string, unknown> | null;
  month_ago_avg_data: Record<string, unknown> | null;
  year_ago_avg_data: Record<string, unknown> | null;
}

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

// ─── New Gas Wiser AI tables ─────────────────────────────────────────────────

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
  source: 'epa' | 'nrcan' | 'claude_agent' | 'manual';
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
  // joined
  vehicle?: VehicleDb;
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

export interface Waypoint {
  lat: number;
  lng: number;
  label: string;
  address?: string;
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
  price_prediction: PricePrediction;
  map_polyline: string | null;
  ai_summary: string;
  ai_reasoning: string | null;
  generated_at: string;
}

export interface FuelStop {
  sequence: number;
  station: StationRef;
  price_per_gallon: number;
  gallons_to_fill: number;
  estimated_cost: number;
  detour_miles: number;
  arrive_at_percent: number;
}

export interface StationRef {
  id: string;
  name: string;
  brand: string | null;
  address: string;
  lat: number;
  lng: number;
}

export interface PricePrediction {
  direction: 'rising' | 'falling' | 'stable';
  confidence: number;
  hours_ahead: number;
  predicted_delta: number;
}

export interface PlanChat {
  id: string;
  plan_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// ─── Request/Response shapes ─────────────────────────────────────────────────

export interface GeneratePlanRequest {
  vehicle_db_id: string;
  route_id?: string;
  waypoints?: Waypoint[];
  tank_level_percent: number;
  fuel_grade: 'regular' | 'midgrade' | 'premium' | 'diesel';
  max_detour_miles?: number;
}

export interface NearbyStationsQuery {
  lat: number;
  lng: number;
  radius_miles?: number;
  fuel_type?: 'regular' | 'midgrade' | 'premium' | 'diesel';
  limit?: number;
}

export interface ChatRequest {
  plan_id: string;
  message: string;
}

export interface ApiError {
  error: string;
  statusCode: number;
}
