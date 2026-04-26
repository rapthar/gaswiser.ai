import Anthropic from '@anthropic-ai/sdk';
import type { AaaGasPrice } from '../lib/types.js';

const SONNET = 'claude-sonnet-4-6';

export interface PriceScoutInput {
  stateCode: string;
  stateAaaData: AaaGasPrice | null;
  recentPriceHistory: Array<{ price: number; recorded_at: string }>;
}

export interface PriceScoutOutput {
  direction: 'rising' | 'falling' | 'stable';
  confidence: number;
  hours_ahead: 24 | 48 | 72;
  predicted_delta: number;
  reasoning: string;
}

const SYSTEM = `You are a fuel price prediction analyst for Gas Wiser.
Given AAA state average data and recent price history at individual stations,
predict whether prices in this state will rise, fall, or stay stable over the next 24–72 hours.

Key factors to consider:
- Current price vs. yesterday / week ago / month ago
- Rate of change (momentum)
- Seasonal patterns (prices often rise on Thursdays/Fridays, fall midweek)
- Day of the week effect

Respond ONLY with valid JSON:
{
  "direction": "rising" | "falling" | "stable",
  "confidence": 0.75,
  "hours_ahead": 24,
  "predicted_delta": 0.04,
  "reasoning": "One sentence explanation"
}`;

export async function scoutPrices(
  client: Anthropic,
  input: PriceScoutInput
): Promise<PriceScoutOutput> {
  const payload = {
    state: input.stateCode,
    aaa: input.stateAaaData
      ? {
          current_regular: input.stateAaaData.regular_price,
          yesterday: (input.stateAaaData.yesterday_avg_data as Record<string, unknown> | null)?.regular ?? null,
          week_ago: (input.stateAaaData.week_ago_avg_data as Record<string, unknown> | null)?.regular ?? null,
          month_ago: (input.stateAaaData.month_ago_avg_data as Record<string, unknown> | null)?.regular ?? null,
        }
      : null,
    recent_prices: input.recentPriceHistory.slice(0, 20),
    current_day_of_week: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
  };

  try {
    const response = await client.messages.create({
      model: SONNET,
      max_tokens: 256,
      system: SYSTEM,
      messages: [{ role: 'user', content: JSON.stringify(payload) }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const clean = text.replace(/```(?:json)?\n?/g, '').trim();
    return JSON.parse(clean) as PriceScoutOutput;
  } catch {
    return {
      direction: 'stable',
      confidence: 0.5,
      hours_ahead: 24,
      predicted_delta: 0,
      reasoning: 'Insufficient data for prediction.',
    };
  }
}
