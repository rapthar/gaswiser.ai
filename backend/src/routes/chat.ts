import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, queryOne } from '../lib/db.js';
import type { FuelPlan, PlanChat } from '../lib/types.js';

const SONNET = 'claude-sonnet-4-6';

const ChatSchema = z.object({
  plan_id: z.string().uuid(),
  message: z.string().min(1).max(1000),
});

export default async function chatRoutes(fastify: FastifyInstance) {
  // POST /chat — send a message about a specific plan
  fastify.post('/chat', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Authentication required' });

    const parsed = ChatSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
    const { plan_id, message } = parsed.data;

    // Verify plan belongs to user
    const plan = await queryOne<FuelPlan>(
      'SELECT * FROM fuel_plans WHERE id = $1 AND user_id = $2',
      [plan_id, request.user.id]
    );
    if (!plan) return reply.status(404).send({ error: 'Plan not found or access denied' });

    // Load conversation history (last 10 messages)
    const history = await query<PlanChat>(
      'SELECT role, content FROM plan_chats WHERE plan_id = $1 ORDER BY created_at ASC LIMIT 10',
      [plan_id]
    );

    // Save user message
    await queryOne(
      'INSERT INTO plan_chats (plan_id, role, content) VALUES ($1, $2, $3)',
      [plan_id, 'user', message]
    );

    // Build context from the plan
    const planContext = `
You are the Gas Wiser AI assistant helping a user understand their fuel plan.
The user's route plan has the following details:
- Total fuel cost: $${plan.total_fuel_cost}
- Projected savings: $${plan.projected_savings}
- Total distance: ${plan.total_distance_miles} miles
- Number of fuel stops: ${(plan.stops as unknown[]).length}
- Stops: ${JSON.stringify(plan.stops, null, 2)}
- Price prediction: ${JSON.stringify(plan.price_prediction)}
- Plan summary: ${plan.ai_summary}

Answer questions about this specific plan. You can help with:
- Finding amenities near fuel stops (coffee, restrooms, food)
- Alternative routes or timing
- Explaining the optimization logic
- Cost breakdown questions
Keep responses concise and helpful.`.trim();

    // Build message history for Claude
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user', content: message },
    ];

    // Stream response using SSE
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    let fullResponse = '';

    const stream = await fastify.ai.messages.stream({
      model: SONNET,
      max_tokens: 1024,
      system: planContext,
      messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const chunk = event.delta.text;
        fullResponse += chunk;
        reply.raw.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
    }

    // Save assistant response
    await queryOne(
      'INSERT INTO plan_chats (plan_id, role, content) VALUES ($1, $2, $3)',
      [plan_id, 'assistant', fullResponse]
    );

    reply.raw.write('data: [DONE]\n\n');
    reply.raw.end();
  });

  // GET /chat/:plan_id — get full chat history for a plan
  fastify.get('/chat/:plan_id', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Authentication required' });

    const { plan_id } = request.params as { plan_id: string };

    // Verify plan ownership
    const plan = await queryOne<{ id: string }>(
      'SELECT id FROM fuel_plans WHERE id = $1 AND user_id = $2',
      [plan_id, request.user.id]
    );
    if (!plan) return reply.status(404).send({ error: 'Plan not found' });

    const messages = await query<PlanChat>(
      'SELECT * FROM plan_chats WHERE plan_id = $1 ORDER BY created_at ASC',
      [plan_id]
    );

    return { messages };
  });
}
