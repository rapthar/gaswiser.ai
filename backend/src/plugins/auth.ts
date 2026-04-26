/**
 * Verifies Supabase JWT tokens sent as `Authorization: Bearer <token>`.
 * Attaches `request.user` = { id, email } on success.
 */
import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('user', null);

  fastify.addHook('preHandler', async (request: FastifyRequest, reply) => {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return;

    const token = auth.slice(7);
    const { data, error } = await fastify.supabase.auth.getUser(token);

    if (error || !data.user) {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }

    request.user = {
      id: data.user.id,
      email: data.user.email ?? '',
      role: (data.user.app_metadata?.role as string) ?? 'user',
    };
  });
};

export default fp(authPlugin, { name: 'auth', dependencies: ['supabase'] });

