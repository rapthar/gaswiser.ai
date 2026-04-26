import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';

import supabasePlugin from './plugins/supabase.js';
import anthropicPlugin from './plugins/anthropic.js';
import authPlugin from './plugins/auth.js';

import vehiclesRoutes from './routes/vehicles.js';
import userRoutesHandlers from './routes/userRoutes.js';
import plansRoutes from './routes/plans.js';
import pricesRoutes from './routes/prices.js';
import chatRoutes from './routes/chat.js';
import profileRoutes from './routes/profile.js';
import geocodeRoutes from './routes/geocode.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const isDev = process.env.NODE_ENV !== 'production';

const fastify = Fastify({
  logger: {
    level: isDev ? 'info' : 'warn',
    transport: isDev ? { target: 'pino-pretty' } : undefined,
  },
  bodyLimit: 4 * 1024 * 1024, // 4 MB — covers base64-encoded 2 MB avatar
});

async function main() {
  // ── Plugins ──────────────────────────────────────────────────────────────
  await fastify.register(cors, {
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Type'],
    preflight: true,
    strictPreflight: false,
  });
  await fastify.register(sensible);
  await fastify.register(supabasePlugin);
  await fastify.register(anthropicPlugin);
  await fastify.register(authPlugin);

  // ── Routes ───────────────────────────────────────────────────────────────
  const PREFIX = '/api/v1';

  await fastify.register(vehiclesRoutes, { prefix: PREFIX });
  await fastify.register(userRoutesHandlers, { prefix: PREFIX });
  await fastify.register(plansRoutes, { prefix: PREFIX });
  await fastify.register(pricesRoutes, { prefix: PREFIX });
  await fastify.register(chatRoutes, { prefix: PREFIX });
  await fastify.register(profileRoutes, { prefix: PREFIX });
  await fastify.register(geocodeRoutes, { prefix: PREFIX });

  // ── Health check ─────────────────────────────────────────────────────────
  fastify.get('/health', async () => ({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  }));

  // ── Start ─────────────────────────────────────────────────────────────────
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Gas Wiser API running on http://0.0.0.0:${PORT}`);
}

main().catch((err) => {
  fastify.log.error(err);
  process.exit(1);
});
