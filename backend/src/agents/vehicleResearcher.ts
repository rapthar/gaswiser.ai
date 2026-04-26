import Anthropic from '@anthropic-ai/sdk';

const OPUS = 'claude-opus-4-7';

export interface VehicleResearchResult {
  make: string;
  model: string;
  year: number;
  trim: string | null;
  mpg_city: number | null;
  mpg_highway: number | null;
  mpg_combined: number | null;
  l_per_100km: number | null;
  tank_size_gallons: number | null;
  fuel_type: string;
  source_url: string | null;
  confidence: 'high' | 'medium' | 'low';
}

const SYSTEM = `You are a vehicle fuel economy data researcher for Gas Wiser.
When given a vehicle year, make, model, and optional trim, you must find the official
EPA (US) or NRCan (Canada) fuel economy data.

Use your knowledge of EPA fueleconomy.gov data to provide accurate figures.
If you are not confident, return lower confidence.

Respond ONLY with valid JSON matching this schema — no markdown:
{
  "make": "Ford",
  "model": "F-150",
  "year": 2023,
  "trim": "XLT 3.5L V6",
  "mpg_city": 20,
  "mpg_highway": 26,
  "mpg_combined": 23,
  "l_per_100km": 10.2,
  "tank_size_gallons": 26.0,
  "fuel_type": "gasoline",
  "source_url": "https://www.fueleconomy.gov/...",
  "confidence": "high"
}`;

export async function researchVehicle(
  client: Anthropic,
  year: number,
  make: string,
  model: string,
  trim?: string
): Promise<VehicleResearchResult | null> {
  const query = trim
    ? `${year} ${make} ${model} ${trim}`
    : `${year} ${make} ${model}`;

  try {
    const response = await client.messages.create({
      model: OPUS,
      max_tokens: 512,
      system: SYSTEM,
      messages: [{ role: 'user', content: `Research fuel economy data for: ${query}` }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const clean = text.replace(/```(?:json)?\n?/g, '').trim();
    const data = JSON.parse(clean) as VehicleResearchResult;

    // Convert MPG to L/100km if not provided
    if (data.mpg_combined && !data.l_per_100km) {
      data.l_per_100km = Math.round((235.214 / data.mpg_combined) * 10) / 10;
    }

    return data;
  } catch {
    return null;
  }
}
