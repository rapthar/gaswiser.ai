import Anthropic from '@anthropic-ai/sdk';
import type { Station, AaaGasPrice } from '../lib/types.js';
import type { PriceScoutOutput as PriceScoutResult } from './priceScout.js';

export interface StationAdvice {
  recommended_station_id: string | null;
  recommended_station_name: string | null;
  recommended_price: number | null;
  fill_timing: 'now' | 'today' | 'soon' | 'wait';
  timing_reason: string;
  station_reason: string;
  summary: string;
  potential_savings: number | null;
}

const SYSTEM = `You are a fuel-savings expert for Gas Wiser.
Given nearby gas stations with current prices, a price trend prediction, and local state average,
recommend the best station and whether to fill up now or wait.

Rules:
- "now": prices are rising, fill immediately
- "today": stable or slight rise, good time to fill now
- "soon": prices falling but there's still a good deal nearby
- "wait": prices clearly falling, hold off if tank allows
- Factor in price vs. state average to rank stations
- preferred station = cheapest with a reliable/known brand, balanced against distance

Output ONLY valid JSON matching this schema — no markdown, no text outside JSON:
{
  "recommended_station_id": "uuid or null",
  "recommended_station_name": "name or null",
  "recommended_price": 3.459,
  "fill_timing": "now",
  "timing_reason": "one sentence on when to fill",
  "station_reason": "one sentence on why this station",
  "summary": "2-3 sentence plain-English overview combining timing + station advice",
  "potential_savings": 4.20
}`;

export async function adviseStation(
  client: Anthropic,
  stations: Station[],
  prediction: PriceScoutResult,
  stateAvg: AaaGasPrice | null,
): Promise<StationAdvice> {
  const priced = stations
    .filter(s => s.regular_price != null)
    .slice(0, 15)
    .map(s => ({
      id: s.id,
      name: s.store_name,
      address: `${s.street_address}, ${s.city}`,
      regular_price: Number(s.regular_price),
      distance_miles: s.distance_miles != null ? Number(s.distance_miles) : null,
    }));

  const avgPrice = stateAvg?.regular_price ?? null;
  const cheapestPrice = priced.length > 0 ? Math.min(...priced.map(s => s.regular_price)) : null;
  const potentialSavings = avgPrice && cheapestPrice
    ? Math.round(((avgPrice - cheapestPrice) * 12) * 100) / 100  // assume 12 gal fill
    : null;

  const payload = {
    nearby_stations: priced,
    price_prediction: {
      direction: prediction.direction,
      confidence: prediction.confidence,
      predicted_delta_cents: Math.round(prediction.predicted_delta * 100),
      hours_ahead: prediction.hours_ahead,
      reasoning: prediction.reasoning,
    },
    state_average_price: avgPrice,
    current_time: new Date().toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' }),
  };

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify(payload) }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const clean = text.replace(/```(?:json)?\n?/g, '').trim();

  try {
    const parsed = JSON.parse(clean) as StationAdvice;
    parsed.potential_savings = potentialSavings;
    return parsed;
  } catch {
    const best = priced.sort((a, b) => a.regular_price - b.regular_price)[0] ?? null;
    return {
      recommended_station_id: best?.id ?? null,
      recommended_station_name: best?.name ?? null,
      recommended_price: best?.regular_price ?? null,
      fill_timing: prediction.direction === 'rising' ? 'now' : 'today',
      timing_reason: prediction.direction === 'rising' ? 'Prices are trending up — fill up soon.' : 'Prices are stable in your area.',
      station_reason: best ? `${best.name} has the lowest price nearby.` : 'No priced stations found nearby.',
      summary: best ? `Fill up at ${best.name} for $${best.regular_price?.toFixed(3)}/gal.` : 'No nearby stations with price data found.',
      potential_savings: potentialSavings,
    };
  }
}
