import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const BASE = 'https://api.mapbox.com';

interface MapboxFeature {
  id: string;
  place_name: string;
  text: string;
  center: [number, number];
}

const QuerySchema = z.object({
  q:       z.string().min(2).max(256),
  limit:   z.coerce.number().int().min(1).max(10).default(6),
  country: z.string().default('us,ca'),
});

export default async function geocodeRoutes(fastify: FastifyInstance) {
  // GET /geocode/autocomplete?q=...
  fastify.get('/geocode/autocomplete', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Authentication required' });

    const parsed = QuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid query' });

    const { q, limit, country } = parsed.data;
    const token = process.env.MAPBOX_TOKEN;
    if (!token) return reply.status(503).send({ error: 'Geocoding not configured' });

    const url =
      `${BASE}/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
      `?access_token=${token}&autocomplete=true&limit=${limit}&types=address,place,poi&country=${country}`;

    try {
      const res = await fetch(url);
      if (!res.ok) return reply.status(502).send({ error: 'Geocoding service error' });
      const data = await res.json() as { features: MapboxFeature[] };

      const suggestions = data.features.map(f => ({
        id:         f.id,
        label:      f.place_name,
        short:      f.text,
        lat:        f.center[1],
        lng:        f.center[0],
      }));

      return { suggestions };
    } catch {
      return reply.status(502).send({ error: 'Geocoding service error' });
    }
  });
}
