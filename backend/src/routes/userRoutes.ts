import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, queryOne } from '../lib/db.js';
import { geocode } from '../services/mapbox.js';
import type { UserRoute, Waypoint } from '../lib/types.js';

const WaypointSchema = z.union([
  z.object({ lat: z.number(), lng: z.number(), label: z.string(), address: z.string().optional() }),
  z.object({ address: z.string().min(1) }),
]);

const CreateRouteSchema = z.object({
  name: z.string().min(1).max(100),
  route_type: z.enum(['daily', 'today', 'trip']),
  waypoints: z.array(WaypointSchema).min(2),
});

const UpdateRouteSchema = CreateRouteSchema.partial();

export default async function userRoutesHandlers(fastify: FastifyInstance) {
  // GET /routes — list all routes for current user
  fastify.get('/routes', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Authentication required' });

    const routes = await query<UserRoute>(
      `SELECT * FROM user_routes WHERE user_id = $1 AND is_active = true ORDER BY route_type, created_at DESC`,
      [request.user.id]
    );
    return { routes };
  });

  // GET /routes/:id
  fastify.get('/routes/:id', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Authentication required' });

    const { id } = request.params as { id: string };
    const route = await queryOne<UserRoute>(
      'SELECT * FROM user_routes WHERE id = $1 AND user_id = $2',
      [id, request.user.id]
    );
    if (!route) return reply.status(404).send({ error: 'Route not found' });
    return route;
  });

  // POST /routes
  fastify.post('/routes', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Authentication required' });

    const parsed = CreateRouteSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
    const { name, route_type, waypoints: rawWaypoints } = parsed.data;

    // Geocode address-only waypoints
    const waypoints: Waypoint[] = await Promise.all(
      rawWaypoints.map(async (w) => {
        if ('lat' in w && 'lng' in w) return w as Waypoint;
        const geo = await geocode(w.address);
        if (!geo) throw new Error(`Could not geocode: ${w.address}`);
        return { lat: geo.lat, lng: geo.lng, label: w.address, address: geo.place_name };
      })
    );

    // Rough distance estimate using haversine sum
    let distanceMiles = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const a = waypoints[i];
      const b = waypoints[i + 1];
      const dLat = ((b.lat - a.lat) * Math.PI) / 180;
      const dLng = ((b.lng - a.lng) * Math.PI) / 180;
      const ha = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      distanceMiles += 3958.8 * 2 * Math.atan2(Math.sqrt(ha), Math.sqrt(1 - ha));
    }

    const route = await queryOne<UserRoute>(`
      INSERT INTO user_routes (user_id, name, route_type, waypoints, distance_miles)
      VALUES ($1, $2, $3, $4::jsonb, $5)
      RETURNING *
    `, [request.user.id, name, route_type, JSON.stringify(waypoints), Math.round(distanceMiles * 10) / 10]);

    return reply.status(201).send(route);
  });

  // PUT /routes/:id
  fastify.put('/routes/:id', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Authentication required' });

    const { id } = request.params as { id: string };
    const parsed = UpdateRouteSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
    const updates = parsed.data;

    const existing = await queryOne<UserRoute>(
      'SELECT id FROM user_routes WHERE id = $1 AND user_id = $2',
      [id, request.user.id]
    );
    if (!existing) return reply.status(404).send({ error: 'Route not found' });

    const fields: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (updates.name !== undefined) { fields.push(`name = $${i++}`); params.push(updates.name); }
    if (updates.waypoints !== undefined) { fields.push(`waypoints = $${i++}::jsonb`); params.push(JSON.stringify(updates.waypoints)); }
    if (updates.route_type !== undefined) { fields.push(`route_type = $${i++}`); params.push(updates.route_type); }
    fields.push(`updated_at = NOW()`);

    params.push(id);
    const updated = await queryOne<UserRoute>(
      `UPDATE user_routes SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      params
    );

    return updated;
  });

  // DELETE /routes/:id — soft delete
  fastify.delete('/routes/:id', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Authentication required' });

    const { id } = request.params as { id: string };
    const deleted = await queryOne(
      'UPDATE user_routes SET is_active = false WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, request.user.id]
    );
    if (!deleted) return reply.status(404).send({ error: 'Route not found' });
    return reply.status(204).send();
  });
}
