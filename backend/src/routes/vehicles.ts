import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, queryOne } from '../lib/db.js';
import { researchVehicle } from '../agents/vehicleResearcher.js';
import type { VehicleDb, UserVehicle } from '../lib/types.js';

const SearchSchema = z.object({
  q: z.string().min(2).optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.coerce.number().int().min(1980).max(2030).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const ResearchSchema = z.object({
  year: z.number().int().min(1980).max(2030),
  make: z.string().min(1),
  model: z.string().min(1),
  trim: z.string().optional(),
});

const SetVehicleSchema = z.object({
  vehicle_db_id: z.string().uuid(),
  nickname: z.string().optional(),
  tank_level_percent: z.number().int().min(0).max(100).default(50),
  is_primary: z.boolean().default(true),
});

export default async function vehiclesRoutes(fastify: FastifyInstance) {
  // GET /vehicles/search — search the community vehicle database
  fastify.get('/vehicles/search', async (request, reply) => {
    const parsed = SearchSchema.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
    const { q, make, model, year, limit } = parsed.data;

    let sql = `SELECT * FROM vehicle_db WHERE 1=1`;
    const params: unknown[] = [];
    let i = 1;

    if (q) {
      sql += ` AND (make ILIKE $${i} OR model ILIKE $${i} OR CONCAT(year::text, ' ', make, ' ', model) ILIKE $${i})`;
      params.push(`%${q}%`);
      i++;
    }
    if (make) { sql += ` AND make ILIKE $${i++}`; params.push(`%${make}%`); }
    if (model) { sql += ` AND model ILIKE $${i++}`; params.push(`%${model}%`); }
    if (year) { sql += ` AND year = $${i++}`; params.push(year); }

    sql += ` ORDER BY make, model, year DESC LIMIT $${i}`;
    params.push(limit);

    const vehicles = await query<VehicleDb>(sql, params);
    return { vehicles, total: vehicles.length };
  });

  // GET /vehicles/:id — get single vehicle record
  fastify.get('/vehicles/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const v = await queryOne<VehicleDb>('SELECT * FROM vehicle_db WHERE id = $1', [id]);
    if (!v) return reply.status(404).send({ error: 'Vehicle not found' });
    return v;
  });

  // POST /vehicles/research — Claude agent researches a missing vehicle
  fastify.post('/vehicles/research', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Authentication required' });

    const parsed = ResearchSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
    const { year, make, model, trim } = parsed.data;

    // Check if already exists
    const existing = await queryOne<VehicleDb>(
      `SELECT * FROM vehicle_db WHERE year = $1 AND make ILIKE $2 AND model ILIKE $3 ${trim ? 'AND trim ILIKE $4' : ''} LIMIT 1`,
      trim ? [year, make, model, trim] : [year, make, model]
    );
    if (existing) return { vehicle: existing, source: 'existing' };

    // Research with Claude
    const result = await researchVehicle(fastify.ai, year, make, model, trim);
    if (!result) return reply.status(422).send({ error: 'Could not find fuel economy data for this vehicle' });

    // Insert into vehicle_db
    const inserted = await queryOne<VehicleDb>(`
      INSERT INTO vehicle_db (make, model, year, trim, mpg_city, mpg_highway, mpg_combined, l_per_100km, tank_size_gallons, fuel_type, source, verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'claude_agent', false)
      ON CONFLICT (year, make, model, COALESCE(trim, '')) DO UPDATE
        SET mpg_city = EXCLUDED.mpg_city, mpg_highway = EXCLUDED.mpg_highway,
            mpg_combined = EXCLUDED.mpg_combined, l_per_100km = EXCLUDED.l_per_100km,
            tank_size_gallons = EXCLUDED.tank_size_gallons, updated_at = NOW()
      RETURNING *
    `, [result.make, result.model, result.year, result.trim ?? null,
        result.mpg_city, result.mpg_highway, result.mpg_combined,
        result.l_per_100km, result.tank_size_gallons, result.fuel_type]);

    return { vehicle: inserted, source: 'claude_agent', confidence: result.confidence };
  });

  // GET /user/vehicle — get logged-in user's primary vehicle
  fastify.get('/user/vehicle', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Authentication required' });

    const vehicles = await query<UserVehicle & { vehicle: VehicleDb }>(`
      SELECT uv.*, row_to_json(vdb.*) AS vehicle
      FROM user_vehicles uv
      JOIN vehicle_db vdb ON vdb.id = uv.vehicle_db_id
      WHERE uv.user_id = $1
      ORDER BY uv.is_primary DESC, uv.created_at DESC
    `, [request.user.id]);

    return { vehicles };
  });

  // POST /user/vehicle — attach a vehicle to the logged-in user
  fastify.post('/user/vehicle', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Authentication required' });

    const parsed = SetVehicleSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
    const { vehicle_db_id, nickname, tank_level_percent, is_primary } = parsed.data;

    // Verify vehicle exists
    const vdb = await queryOne<VehicleDb>('SELECT id FROM vehicle_db WHERE id = $1', [vehicle_db_id]);
    if (!vdb) return reply.status(404).send({ error: 'Vehicle not found in database' });

    // If primary, unset other primaries
    if (is_primary) {
      await query('UPDATE user_vehicles SET is_primary = false WHERE user_id = $1', [request.user.id]);
    }

    const uv = await queryOne<UserVehicle>(`
      INSERT INTO user_vehicles (user_id, vehicle_db_id, nickname, tank_level_percent, is_primary)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, vehicle_db_id) DO UPDATE
        SET nickname = EXCLUDED.nickname, tank_level_percent = EXCLUDED.tank_level_percent,
            is_primary = EXCLUDED.is_primary, updated_at = NOW()
      RETURNING *
    `, [request.user.id, vehicle_db_id, nickname ?? null, tank_level_percent, is_primary]);

    return uv;
  });

  // PATCH /user/vehicle/tank — update tank level
  fastify.patch('/user/vehicle/tank', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Authentication required' });

    const { vehicle_db_id, tank_level_percent } = request.body as { vehicle_db_id: string; tank_level_percent: number };
    if (tank_level_percent < 0 || tank_level_percent > 100) return reply.status(400).send({ error: 'Invalid tank level' });

    const updated = await queryOne<UserVehicle>(`
      UPDATE user_vehicles SET tank_level_percent = $1, updated_at = NOW()
      WHERE user_id = $2 AND vehicle_db_id = $3
      RETURNING *
    `, [tank_level_percent, request.user.id, vehicle_db_id]);

    if (!updated) return reply.status(404).send({ error: 'Vehicle not found for this user' });
    return updated;
  });
}
