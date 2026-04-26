import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, queryOne } from '../lib/db.js';
import { findStationsAlongRoute } from '../services/stationService.js';
import { getStatePriceHistory } from '../services/stationService.js';
import { scoutPrices } from '../agents/priceScout.js';
import { optimizeRoute } from '../agents/routeOptimizer.js';
import { getDirections, geocode } from '../services/mapbox.js';
import type { FuelPlan, VehicleDb, UserRoute, AaaGasPrice, Waypoint } from '../lib/types.js';

// Accept either a full lat/lng waypoint or just an address string
const WaypointSchema = z.union([
  z.object({
    lat: z.number(),
    lng: z.number(),
    label: z.string(),
    address: z.string().optional(),
  }),
  z.object({ address: z.string().min(1) }),
]);

const GenerateSchema = z.object({
  vehicle_db_id: z.string().uuid(),
  route_id: z.string().uuid().optional(),
  waypoints: z.array(WaypointSchema).min(2).optional(),
  tank_level_percent: z.number().int().min(0).max(100),
  fuel_grade: z.enum(['regular', 'midgrade', 'premium', 'diesel']).default('regular'),
  max_detour_miles: z.number().min(0).max(20).default(2),
});

export default async function plansRoutes(fastify: FastifyInstance) {
  // POST /plans/generate — the core AI endpoint
  fastify.post('/plans/generate', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Authentication required' });

    const parsed = GenerateSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
    const { vehicle_db_id, route_id, waypoints: inlineWaypoints, tank_level_percent, fuel_grade, max_detour_miles } = parsed.data;

    // 1. Resolve vehicle
    const vehicle = await queryOne<VehicleDb>('SELECT * FROM vehicle_db WHERE id = $1', [vehicle_db_id]);
    if (!vehicle) return reply.status(404).send({ error: 'Vehicle not found' });

    // 2. Resolve waypoints — geocode address-only entries
    let rawWaypoints = inlineWaypoints;
    let routeId = route_id ?? null;

    if (!rawWaypoints && route_id) {
      const savedRoute = await queryOne<UserRoute>(
        'SELECT * FROM user_routes WHERE id = $1 AND user_id = $2',
        [route_id, request.user.id]
      );
      if (!savedRoute) return reply.status(404).send({ error: 'Route not found' });
      rawWaypoints = savedRoute.waypoints;
    }

    if (!rawWaypoints || rawWaypoints.length < 2) {
      return reply.status(400).send({ error: 'Provide at least 2 waypoints or a valid route_id' });
    }

    // Geocode any address-only waypoints
    const waypoints: Waypoint[] = await Promise.all(
      rawWaypoints.map(async (w, i) => {
        if ('lat' in w && 'lng' in w) return w as Waypoint;
        const geo = await geocode(w.address);
        if (!geo) throw new Error(`Could not geocode: ${w.address}`);
        return { lat: geo.lat, lng: geo.lng, label: w.address, address: geo.place_name };
      })
    );

    // 3. Get directions (distance + polyline)
    const directions = await getDirections(waypoints);
    const totalDistanceMiles = directions?.distance_miles ?? estimateDistance(waypoints);
    const mapPolyline = directions?.polyline ?? null;

    // 4. Get origin state (needed for both stations fallback and price prediction)
    const originState = await guessState(waypoints[0].lat, waypoints[0].lng);

    // 5. Find stations along route (with state fallback when coordinate data is sparse)
    const stations = await findStationsAlongRoute(waypoints, max_detour_miles + 2, 40, originState ?? undefined);
    const aaaData = originState
      ? await queryOne<AaaGasPrice>('SELECT * FROM aaa_gas_prices WHERE state_code ILIKE $1 LIMIT 1', [originState])
      : null;
    const priceHistory = originState ? await getStatePriceHistory(originState, 48) : [];

    const prediction = await scoutPrices(fastify.ai, {
      stateCode: originState ?? 'TX',
      stateAaaData: aaaData,
      recentPriceHistory: priceHistory,
    });

    // 6. Run Route Optimizer agent
    const optimized = await optimizeRoute(fastify.ai, {
      vehicle,
      waypoints,
      tankLevelPercent: tank_level_percent,
      fuelGrade: fuel_grade,
      maxDetourMiles: max_detour_miles,
      stationsAlongRoute: stations,
      pricePrediction: {
        direction: prediction.direction,
        confidence: prediction.confidence,
        hours_ahead: prediction.hours_ahead,
        predicted_delta: prediction.predicted_delta,
      },
      totalDistanceMiles,
    });

    // 7. Persist plan
    const plan = await queryOne<FuelPlan>(`
      INSERT INTO fuel_plans (
        user_id, route_id, vehicle_id, stops, total_fuel_cost,
        total_distance_miles, projected_savings, price_prediction,
        map_polyline, ai_summary, ai_reasoning
      )
      VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8::jsonb, $9, $10, $11)
      RETURNING *
    `, [
      request.user.id,
      routeId,
      vehicle_db_id,
      JSON.stringify(optimized.stops),
      optimized.total_fuel_cost,
      totalDistanceMiles,
      optimized.projected_savings,
      JSON.stringify({ direction: prediction.direction, confidence: prediction.confidence, hours_ahead: prediction.hours_ahead, predicted_delta: prediction.predicted_delta }),
      mapPolyline,
      optimized.ai_summary,
      optimized.ai_reasoning,
    ]);

    return reply.status(201).send(plan);
  });

  // GET /plans/:id
  fastify.get('/plans/:id', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Authentication required' });

    const { id } = request.params as { id: string };
    const plan = await queryOne<FuelPlan>(
      'SELECT * FROM fuel_plans WHERE id = $1 AND user_id = $2',
      [id, request.user.id]
    );
    if (!plan) return reply.status(404).send({ error: 'Plan not found' });
    return plan;
  });

  // GET /plans — list recent plans for user
  fastify.get('/plans', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Authentication required' });

    const plans = await query<FuelPlan>(
      'SELECT * FROM fuel_plans WHERE user_id = $1 ORDER BY generated_at DESC LIMIT 20',
      [request.user.id]
    );
    return { plans };
  });

  // DELETE /plans/:id
  fastify.delete('/plans/:id', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Authentication required' });

    const { id } = request.params as { id: string };
    const deleted = await queryOne<{ id: string }>(
      'DELETE FROM fuel_plans WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, request.user.id]
    );
    if (!deleted) return reply.status(404).send({ error: 'Plan not found' });
    return reply.status(204).send();
  });
}

function estimateDistance(waypoints: Array<{ lat: number; lng: number }>): number {
  let d = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const ha = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    d += 3958.8 * 2 * Math.atan2(Math.sqrt(ha), Math.sqrt(1 - ha));
  }
  return Math.round(d * 10) / 10;
}

// Best-effort state guess from lat/lng using bounding boxes (no API needed)
async function guessState(lat: number, lng: number): Promise<string | null> {
  // Very rough state bounding boxes for common US states
  const states: Array<{ code: string; minLat: number; maxLat: number; minLng: number; maxLng: number }> = [
    { code: 'TX', minLat: 25.8, maxLat: 36.5, minLng: -106.6, maxLng: -93.5 },
    { code: 'CA', minLat: 32.5, maxLat: 42.0, minLng: -124.4, maxLng: -114.1 },
    { code: 'FL', minLat: 24.4, maxLat: 31.0, minLng: -87.6, maxLng: -80.0 },
    { code: 'NY', minLat: 40.5, maxLat: 45.0, minLng: -79.8, maxLng: -71.9 },
    { code: 'IL', minLat: 36.9, maxLat: 42.5, minLng: -91.5, maxLng: -87.0 },
    { code: 'GA', minLat: 30.4, maxLat: 35.0, minLng: -85.6, maxLng: -80.8 },
  ];

  for (const s of states) {
    if (lat >= s.minLat && lat <= s.maxLat && lng >= s.minLng && lng <= s.maxLng) {
      return s.code;
    }
  }
  return 'TX'; // default fallback
}
