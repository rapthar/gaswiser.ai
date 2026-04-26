# Gas Wiser

AI-powered fuel intelligence platform — find the cheapest gas, predict price trends, plan optimal fuel stops on a route, and chat with an AI fuel coach.

Live site: https://gaswiser.com
Repo: https://github.com/rapthar/gaswiser.ai

## What's in this monorepo

- `backend/` — Fastify + TypeScript API. Handles auth, stations/prices, vehicle management, route planning, AI chat (Anthropic SDK), and price predictions.
- `apps/web/` — Next.js 14 (App Router) dashboard. Auth, vehicle setup, nearby map, plans, AI chat, price trends.
- `apps/mobile/` — Expo SDK 52 + Expo Router 4 React Native app. Same feature set as the web dashboard.
- `packages/api-client/` — Shared typed API client used by web + mobile.
- `packages/ui/` — Shared UI primitives.
- `supabase/` — SQL migrations and seed data.

## Tech stack

- **Backend:** Fastify, TypeScript, Supabase (Postgres + Auth), Anthropic SDK (Claude Opus 4.7 across all agents — route optimization, fuel coach, price prediction, chat), Mapbox (directions + geocoding).
- **Web:** Next.js 14, React, Tailwind, Leaflet (maps), Supabase JS client.
- **Mobile:** Expo SDK 52, Expo Router 4, React Query v5, React Native Maps.
- **Tooling:** Turborepo + pnpm workspaces.

## Data foundation

Production Supabase already contains:

- 6,182 gas stations
- 44,785 historical price updates
- AAA state and metro averages
- Brand metadata

New AI feature tables (vehicles, routes, plans, chats) were added via `supabase/migrations/001_gaswiser_ai_tables.sql`.

## Setup

Requires Node 20+ and pnpm 9+.

```bash
pnpm install
```

Each app needs its own `.env` (not committed). Required values:

- `backend/.env` — Supabase URL/keys, `ANTHROPIC_API_KEY`, Mapbox token
- `apps/web/.env.local` — `NEXT_PUBLIC_SUPABASE_URL`, anon key, API base URL
- `apps/mobile/.env` — same shape as web

### Run the database migration

```bash
cd backend && npm run db:migrate
```

Then paste `supabase/seed/vehicles.sql` into the Supabase SQL editor.

## Development

```bash
# Backend (Fastify)
cd backend && npm run dev

# Web dashboard (Next.js)
cd apps/web && npm run dev

# Mobile (Expo — iOS sim or Android)
cd apps/mobile && npx expo start
```

Or from the repo root:

```bash
pnpm dev          # turbo runs everything
pnpm backend      # backend only
```

## Notes

- Stations expose fields `store_name`, `street_address`, `regular_price` (not `name`/`address`/`prices[]`).
- Fuel plans expose `stops`, `vehicle_id`, `generated_at` (not `optimized_stops`/`created_at`).
- The backend `/prices/nearby` endpoint accepts a `state` parameter for fallback when no coordinate match is found — used so users in states with sparse geocoded stations still get results.
- Stations with the same `street_address` are deduplicated server-side; the cheapest price wins.

## License

[MIT](LICENSE) — free to use, modify, and distribute. See `LICENSE` for the full text.
