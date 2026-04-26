import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { queryOne } from '../lib/db.js';
import { findNearbyStations } from '../services/stationService.js';
import { getStatePriceHistory } from '../services/stationService.js';
import { scoutPrices } from '../agents/priceScout.js';
import { getCommuteAdvice } from '../agents/commuteCoach.js';
import { adviseStation } from '../agents/stationAdvisor.js';
import type { AaaGasPrice } from '../lib/types.js';

const NearbySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius_miles: z.coerce.number().min(0.5).max(100).default(10),
  fuel_type: z.enum(['regular', 'midgrade', 'premium', 'diesel']).default('regular'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  state: z.string().optional(),
});

const PredictSchema = z.object({
  state: z.string().length(2),
});

const StationAnalysisSchema = z.object({
  lat:          z.coerce.number().min(-90).max(90),
  lng:          z.coerce.number().min(-180).max(180),
  radius_miles: z.coerce.number().min(0.5).max(100).default(25),
  state:        z.string().optional(),
});

// Rough bounding boxes for all 50 US states + DC
const US_STATE_BOXES: Array<{ code: string; minLat: number; maxLat: number; minLng: number; maxLng: number }> = [
  { code: 'AL', minLat: 30.1, maxLat: 35.0, minLng: -88.5, maxLng: -84.9 },
  { code: 'AK', minLat: 51.2, maxLat: 71.4, minLng: -179.9, maxLng: -129.9 },
  { code: 'AZ', minLat: 31.3, maxLat: 37.0, minLng: -114.8, maxLng: -109.0 },
  { code: 'AR', minLat: 33.0, maxLat: 36.5, minLng: -94.6, maxLng: -89.6 },
  { code: 'CA', minLat: 32.5, maxLat: 42.0, minLng: -124.5, maxLng: -114.1 },
  { code: 'CO', minLat: 36.9, maxLat: 41.0, minLng: -109.1, maxLng: -102.0 },
  { code: 'CT', minLat: 40.9, maxLat: 42.1, minLng: -73.7, maxLng: -71.8 },
  { code: 'DE', minLat: 38.4, maxLat: 39.8, minLng: -75.8, maxLng: -75.0 },
  { code: 'FL', minLat: 24.4, maxLat: 31.0, minLng: -87.6, maxLng: -80.0 },
  { code: 'GA', minLat: 30.4, maxLat: 35.0, minLng: -85.6, maxLng: -80.8 },
  { code: 'HI', minLat: 18.9, maxLat: 22.2, minLng: -160.3, maxLng: -154.8 },
  { code: 'ID', minLat: 41.9, maxLat: 49.0, minLng: -117.2, maxLng: -111.0 },
  { code: 'IL', minLat: 36.9, maxLat: 42.5, minLng: -91.5, maxLng: -87.0 },
  { code: 'IN', minLat: 37.7, maxLat: 41.8, minLng: -88.1, maxLng: -84.8 },
  { code: 'IA', minLat: 40.4, maxLat: 43.5, minLng: -96.6, maxLng: -90.1 },
  { code: 'KS', minLat: 36.9, maxLat: 40.0, minLng: -102.1, maxLng: -94.6 },
  { code: 'KY', minLat: 36.5, maxLat: 39.1, minLng: -89.6, maxLng: -81.9 },
  { code: 'LA', minLat: 28.9, maxLat: 33.0, minLng: -94.0, maxLng: -89.0 },
  { code: 'ME', minLat: 43.0, maxLat: 47.5, minLng: -71.1, maxLng: -67.0 },
  { code: 'MD', minLat: 37.9, maxLat: 39.7, minLng: -79.5, maxLng: -75.0 },
  { code: 'MA', minLat: 41.2, maxLat: 42.9, minLng: -73.5, maxLng: -69.9 },
  { code: 'MI', minLat: 41.7, maxLat: 48.3, minLng: -90.4, maxLng: -82.1 },
  { code: 'MN', minLat: 43.5, maxLat: 49.4, minLng: -97.2, maxLng: -89.5 },
  { code: 'MS', minLat: 30.1, maxLat: 35.0, minLng: -91.7, maxLng: -88.1 },
  { code: 'MO', minLat: 35.9, maxLat: 40.6, minLng: -95.8, maxLng: -89.1 },
  { code: 'MT', minLat: 44.4, maxLat: 49.0, minLng: -116.1, maxLng: -104.0 },
  { code: 'NE', minLat: 40.0, maxLat: 43.0, minLng: -104.1, maxLng: -95.3 },
  { code: 'NV', minLat: 35.0, maxLat: 42.0, minLng: -120.0, maxLng: -114.0 },
  { code: 'NH', minLat: 42.7, maxLat: 45.3, minLng: -72.6, maxLng: -70.7 },
  { code: 'NJ', minLat: 38.9, maxLat: 41.4, minLng: -75.6, maxLng: -73.9 },
  { code: 'NM', minLat: 31.3, maxLat: 37.0, minLng: -109.1, maxLng: -103.0 },
  { code: 'NY', minLat: 40.5, maxLat: 45.0, minLng: -79.8, maxLng: -71.9 },
  { code: 'NC', minLat: 33.8, maxLat: 36.6, minLng: -84.3, maxLng: -75.5 },
  { code: 'ND', minLat: 45.9, maxLat: 49.0, minLng: -104.1, maxLng: -96.6 },
  { code: 'OH', minLat: 38.4, maxLat: 42.3, minLng: -84.8, maxLng: -80.5 },
  { code: 'OK', minLat: 33.6, maxLat: 37.0, minLng: -103.0, maxLng: -94.4 },
  { code: 'OR', minLat: 41.9, maxLat: 46.3, minLng: -124.6, maxLng: -116.5 },
  { code: 'PA', minLat: 39.7, maxLat: 42.3, minLng: -80.5, maxLng: -74.7 },
  { code: 'RI', minLat: 41.1, maxLat: 42.0, minLng: -71.9, maxLng: -71.1 },
  { code: 'SC', minLat: 32.0, maxLat: 35.2, minLng: -83.4, maxLng: -78.5 },
  { code: 'SD', minLat: 42.5, maxLat: 45.9, minLng: -104.1, maxLng: -96.4 },
  { code: 'TN', minLat: 34.9, maxLat: 36.7, minLng: -90.3, maxLng: -81.6 },
  { code: 'TX', minLat: 25.8, maxLat: 36.5, minLng: -106.6, maxLng: -93.5 },
  { code: 'UT', minLat: 36.9, maxLat: 42.0, minLng: -114.1, maxLng: -109.0 },
  { code: 'VT', minLat: 42.7, maxLat: 45.0, minLng: -73.4, maxLng: -71.5 },
  { code: 'VA', minLat: 36.5, maxLat: 39.5, minLng: -83.7, maxLng: -75.2 },
  { code: 'WA', minLat: 45.5, maxLat: 49.0, minLng: -124.8, maxLng: -116.9 },
  { code: 'WV', minLat: 37.2, maxLat: 40.6, minLng: -82.6, maxLng: -77.7 },
  { code: 'WI', minLat: 42.5, maxLat: 47.1, minLng: -92.9, maxLng: -86.2 },
  { code: 'WY', minLat: 40.9, maxLat: 45.0, minLng: -111.1, maxLng: -104.1 },
  { code: 'DC', minLat: 38.8, maxLat: 39.0, minLng: -77.1, maxLng: -76.9 },
];

function guessStateFromCoords(lat: number, lng: number): string {
  for (const s of US_STATE_BOXES) {
    if (lat >= s.minLat && lat <= s.maxLat && lng >= s.minLng && lng <= s.maxLng) {
      return s.code;
    }
  }
  return 'TX'; // continental fallback
}

export default async function pricesRoutes(fastify: FastifyInstance) {
  // GET /prices/nearby — stations near a coordinate with live prices
  fastify.get('/prices/nearby', async (request, reply) => {
    const parsed = NearbySchema.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
    const { lat, lng, radius_miles, fuel_type, limit, state } = parsed.data;

    const stations = await findNearbyStations(lat, lng, radius_miles, fuel_type, limit, state);
    return { stations, count: stations.length };
  });

  // GET /prices/predict?state=TX — AI price prediction for a state
  fastify.get('/prices/predict', async (request, reply) => {
    const parsed = PredictSchema.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
    const { state } = parsed.data;

    const [aaaData, priceHistory] = await Promise.all([
      queryOne<AaaGasPrice>(
        'SELECT * FROM aaa_gas_prices WHERE state_code ILIKE $1 LIMIT 1',
        [state]
      ),
      getStatePriceHistory(state, 72),
    ]);

    const prediction = await scoutPrices(fastify.ai, {
      stateCode: state.toUpperCase(),
      stateAaaData: aaaData,
      recentPriceHistory: priceHistory,
    });

    return {
      state: state.toUpperCase(),
      current_avg: aaaData?.regular_price ?? null,
      prediction,
    };
  });

  // GET /prices/commute-advice?state=TX — best day/time to fill up
  fastify.get('/prices/commute-advice', async (request, reply) => {
    const parsed = PredictSchema.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
    const { state } = parsed.data;

    const [aaaData, priceHistory] = await Promise.all([
      queryOne<AaaGasPrice>(
        'SELECT * FROM aaa_gas_prices WHERE state_code ILIKE $1 LIMIT 1',
        [state]
      ),
      getStatePriceHistory(state, 168), // 7 days
    ]);

    const advice = await getCommuteAdvice(fastify.ai, aaaData, priceHistory);
    return { state: state.toUpperCase(), advice };
  });

  // GET /prices/station-analysis — AI advice on when/where to fill up near a coordinate
  fastify.get('/prices/station-analysis', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Authentication required' });
    const parsed = StationAnalysisSchema.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
    const { lat, lng, radius_miles, state } = parsed.data;

    // Always resolve a state code — use passed param, else guess from coordinates
    const stateCode = state
      ? (state.length === 2 ? state.toUpperCase() : state.slice(0, 2).toUpperCase())
      : guessStateFromCoords(lat, lng);

    const stations = await findNearbyStations(lat, lng, radius_miles, 'regular', 20, stateCode);
    if (stations.length === 0) {
      return reply.status(404).send({ error: 'No nearby stations with price data found' });
    }

    const [aaaData, priceHistory] = await Promise.all([
      queryOne<AaaGasPrice>(
        'SELECT * FROM aaa_gas_prices WHERE state_code ILIKE $1 LIMIT 1',
        [stateCode],
      ),
      getStatePriceHistory(stateCode, 72),
    ]);

    const prediction = await scoutPrices(fastify.ai, {
      stateCode,
      stateAaaData: aaaData,
      recentPriceHistory: priceHistory,
    });

    const advice = await adviseStation(fastify.ai, stations, prediction, aaaData);

    return { stations, prediction, advice, state_avg: aaaData?.regular_price ?? null };
  });

  // GET /prices/national — national averages from AAA data
  fastify.get('/prices/national', async () => {
    const rows = await queryOne<AaaGasPrice>(
      `SELECT * FROM aaa_gas_prices WHERE state_code = 'US' OR state_name ILIKE 'national%' LIMIT 1`
    );
    return rows;
  });

  // GET /prices/state/:state — state averages
  fastify.get('/prices/state/:state', async (request, reply) => {
    const { state } = request.params as { state: string };
    const row = await queryOne<AaaGasPrice>(
      'SELECT * FROM aaa_gas_prices WHERE state_code ILIKE $1 LIMIT 1',
      [state]
    );
    if (!row) return reply.status(404).send({ error: 'State not found' });
    return row;
  });

  // GET /prices/history?state=TX — 72-hour price history (averaged by hour)
  fastify.get('/prices/history', async (request, reply) => {
    const parsed = PredictSchema.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
    const { state } = parsed.data;

    const rows = await import('../lib/db.js').then(({ query: q }) => q(`
      SELECT
        DATE_TRUNC('hour', pu.update_time) AS recorded_at,
        ROUND(AVG(CASE WHEN pu.fuel_type = 'regular'  THEN pu.price END)::numeric, 3) AS regular,
        ROUND(AVG(CASE WHEN pu.fuel_type = 'midgrade' THEN pu.price END)::numeric, 3) AS midgrade,
        ROUND(AVG(CASE WHEN pu.fuel_type = 'premium'  THEN pu.price END)::numeric, 3) AS premium,
        ROUND(AVG(CASE WHEN pu.fuel_type = 'diesel'   THEN pu.price END)::numeric, 3) AS diesel
      FROM price_updates pu
      JOIN stations s ON s.id = pu.station_id
      WHERE s.state ILIKE $1
        AND pu.update_time > NOW() - INTERVAL '72 hours'
      GROUP BY DATE_TRUNC('hour', pu.update_time)
      ORDER BY recorded_at ASC
    `, [state]));

    return { history: rows };
  });
}
