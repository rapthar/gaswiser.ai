import Anthropic from '@anthropic-ai/sdk';
import type { VehicleDb, Station, FuelStop, PricePrediction, Waypoint } from '../lib/types.js';

const OPUS = 'claude-opus-4-7';

export interface RouteOptimizerInput {
  vehicle: VehicleDb;
  waypoints: Waypoint[];
  tankLevelPercent: number;
  fuelGrade: 'regular' | 'midgrade' | 'premium' | 'diesel';
  maxDetourMiles: number;
  stationsAlongRoute: Station[];
  pricePrediction: PricePrediction;
  totalDistanceMiles: number;
}

export interface RouteOptimizerOutput {
  stops: FuelStop[];
  total_fuel_cost: number;
  projected_savings: number;
  ai_summary: string;
  ai_reasoning: string;
}

const SYSTEM = `You are a precision fuel optimization engine for Gas Wiser.
Given a vehicle, route, current tank level, and nearby gas stations with live prices,
compute the optimal fueling strategy that minimizes total fuel cost for the trip.

Rules:
- Never let the tank drop below 15% (safety buffer)
- Only stop at stations that are within max_detour_miles of the route
- Factor in vehicle MPG and tank size for accurate range calculations
- Compare each stop against the average price prediction to determine if it's a good deal
- Output ONLY valid JSON matching the schema below — no markdown, no explanation outside JSON

Output schema:
{
  "stops": [
    {
      "sequence": 1,
      "station": { "id": "...", "name": "...", "brand": "...", "address": "...", "lat": 0.0, "lng": 0.0 },
      "price_per_gallon": 3.459,
      "gallons_to_fill": 8.5,
      "estimated_cost": 29.40,
      "detour_miles": 0.3,
      "arrive_at_percent": 42
    }
  ],
  "total_fuel_cost": 29.40,
  "projected_savings": 6.20,
  "ai_summary": "One sentence plain-English summary of the plan",
  "ai_reasoning": "Detailed explanation of the optimization logic"
}`;

export async function optimizeRoute(
  client: Anthropic,
  input: RouteOptimizerInput
): Promise<RouteOptimizerOutput> {
  const payload = {
    vehicle: {
      make: input.vehicle.make,
      model: input.vehicle.model,
      year: input.vehicle.year,
      mpg_combined: input.vehicle.mpg_combined,
      mpg_highway: input.vehicle.mpg_highway,
      tank_size_gallons: input.vehicle.tank_size_gallons,
      fuel_type: input.vehicle.fuel_type,
    },
    current_tank_percent: input.tankLevelPercent,
    fuel_grade: input.fuelGrade,
    max_detour_miles: input.maxDetourMiles,
    total_route_distance_miles: input.totalDistanceMiles,
    price_prediction: input.pricePrediction,
    stations: input.stationsAlongRoute.slice(0, 20).map((s) => ({
      id: s.id,
      name: s.store_name,
      brand: null,
      address: `${s.street_address}, ${s.city}, ${s.state}`,
      lat: s.latitude,
      lng: s.longitude,
      price: input.fuelGrade === 'regular' ? s.regular_price
        : input.fuelGrade === 'premium' ? s.premium_price
        : input.fuelGrade === 'diesel' ? s.diesel_price
        : s.regular_price,
    })).filter((s) => s.price != null),
  };

  const response = await client.messages.create({
    model: OPUS,
    max_tokens: 2048,
    system: SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify(payload) }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // Strip any accidental markdown fences
  const clean = text.replace(/```(?:json)?\n?/g, '').trim();

  try {
    return JSON.parse(clean) as RouteOptimizerOutput;
  } catch {
    // Fallback: single stop at cheapest station
    const cheapest = input.stationsAlongRoute
      .filter((s) => s.regular_price != null)
      .sort((a, b) => (a.regular_price ?? 999) - (b.regular_price ?? 999))[0];

    if (!cheapest || cheapest.latitude == null || cheapest.longitude == null) {
      return {
        stops: [],
        total_fuel_cost: 0,
        projected_savings: 0,
        ai_summary: 'No viable fuel stops found along this route.',
        ai_reasoning: 'Fallback: no stations with valid price data near route.',
      };
    }

    const gallons = (input.vehicle.tank_size_gallons ?? 15) * (1 - input.tankLevelPercent / 100);
    const price = cheapest.regular_price ?? 3.5;

    return {
      stops: [{
        sequence: 1,
        station: {
          id: cheapest.id,
          name: cheapest.store_name,
          brand: null,
          address: `${cheapest.street_address}, ${cheapest.city}, ${cheapest.state}`,
          lat: cheapest.latitude,
          lng: cheapest.longitude,
        },
        price_per_gallon: price,
        gallons_to_fill: Math.round(gallons * 10) / 10,
        estimated_cost: Math.round(gallons * price * 100) / 100,
        detour_miles: 0,
        arrive_at_percent: input.tankLevelPercent,
      }],
      total_fuel_cost: Math.round(gallons * price * 100) / 100,
      projected_savings: 0,
      ai_summary: `Fill up at ${cheapest.store_name} — lowest price along your route.`,
      ai_reasoning: 'Fallback plan: cheapest station near route.',
    };
  }
}
