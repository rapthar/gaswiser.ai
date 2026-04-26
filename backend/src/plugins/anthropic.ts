import fp from 'fastify-plugin';
import Anthropic from '@anthropic-ai/sdk';
import type { FastifyPluginAsync } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    ai: Anthropic;
  }
}

const anthropicPlugin: FastifyPluginAsync = async (fastify) => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    fastify.log.warn('ANTHROPIC_API_KEY not set — AI features will be unavailable');
  }
  fastify.decorate('ai', new Anthropic({ apiKey: key }));
};

export default fp(anthropicPlugin, { name: 'anthropic' });
