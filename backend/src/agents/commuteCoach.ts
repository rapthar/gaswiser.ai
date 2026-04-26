import Anthropic from '@anthropic-ai/sdk';
import type { AaaGasPrice } from '../lib/types.js';

const OPUS = 'claude-opus-4-7';

export interface CommuteCoachOutput {
  best_day: string;
  best_time: string;
  expected_savings_per_gallon: number;
  reasoning: string;
}

export async function getCommuteAdvice(
  client: Anthropic,
  stateAaaData: AaaGasPrice | null,
  recentPrices: Array<{ price: number; recorded_at: string; day_of_week: string }>
): Promise<CommuteCoachOutput> {
  const SYSTEM = `You are a commute fuel advisor. Given weekly price patterns for a US state,
tell the user the best day and approximate time to fill up to save money.
Use known patterns: prices typically drop Tuesday–Wednesday, rise Thursday–Friday.
Respond ONLY with valid JSON:
{
  "best_day": "Wednesday",
  "best_time": "morning",
  "expected_savings_per_gallon": 0.06,
  "reasoning": "One sentence explanation"
}`;

  const payload = {
    aaa: stateAaaData
      ? {
          current: stateAaaData.regular_price,
          week_ago: (stateAaaData.week_ago_avg_data as Record<string, unknown> | null)?.regular ?? null,
        }
      : null,
    price_by_day: recentPrices.slice(0, 50),
    today: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
  };

  try {
    const response = await client.messages.create({
      model: OPUS,
      max_tokens: 256,
      system: SYSTEM,
      messages: [{ role: 'user', content: JSON.stringify(payload) }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const clean = text.replace(/```(?:json)?\n?/g, '').trim();
    return JSON.parse(clean) as CommuteCoachOutput;
  } catch {
    return {
      best_day: 'Wednesday',
      best_time: 'morning',
      expected_savings_per_gallon: 0.05,
      reasoning: 'Prices typically dip mid-week based on historical patterns.',
    };
  }
}
