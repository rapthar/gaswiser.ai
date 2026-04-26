-- Gas Wiser AI Tables Migration
-- Only adds NEW tables. Does NOT modify existing gaswiser.com schema.
-- Existing tables: stations, brands, price_updates, profiles, aaa_gas_prices, etc.

-- ─── Vehicle Database (community vehicle fuel economy DB) ─────────────────────
CREATE TABLE IF NOT EXISTS vehicle_db (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make               VARCHAR(100) NOT NULL,
  model              VARCHAR(100) NOT NULL,
  year               INT NOT NULL CHECK (year >= 1980 AND year <= 2030),
  trim               VARCHAR(200),
  mpg_city           NUMERIC(5,2),
  mpg_highway        NUMERIC(5,2),
  mpg_combined       NUMERIC(5,2),
  l_per_100km        NUMERIC(5,2),
  tank_size_gallons  NUMERIC(5,2),
  fuel_type          VARCHAR(50) NOT NULL DEFAULT 'gasoline',
  source             VARCHAR(50) NOT NULL DEFAULT 'manual'
                       CHECK (source IN ('epa', 'nrcan', 'claude_agent', 'manual')),
  verified           BOOLEAN NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── User Vehicles (which vehicle a user drives) ──────────────────────────────
CREATE TABLE IF NOT EXISTS user_vehicles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_db_id       UUID NOT NULL REFERENCES vehicle_db(id) ON DELETE CASCADE,
  nickname            VARCHAR(100),
  tank_level_percent  INT NOT NULL DEFAULT 50 CHECK (tank_level_percent >= 0 AND tank_level_percent <= 100),
  is_primary          BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, vehicle_db_id)
);

-- ─── User Routes ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_routes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  route_type      VARCHAR(20) NOT NULL DEFAULT 'daily'
                    CHECK (route_type IN ('daily', 'today', 'trip')),
  waypoints       JSONB NOT NULL DEFAULT '[]',
  distance_miles  NUMERIC(8,2),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Fuel Plans (AI-generated) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fuel_plans (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id              UUID REFERENCES user_routes(id),
  vehicle_id            UUID NOT NULL REFERENCES vehicle_db(id),
  stops                 JSONB NOT NULL DEFAULT '[]',
  total_fuel_cost       NUMERIC(8,2) NOT NULL DEFAULT 0,
  total_distance_miles  NUMERIC(8,2) NOT NULL DEFAULT 0,
  projected_savings     NUMERIC(6,2) NOT NULL DEFAULT 0,
  price_prediction      JSONB,
  map_polyline          TEXT,
  ai_summary            TEXT NOT NULL DEFAULT '',
  ai_reasoning          TEXT,
  generated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Plan Chat (post-plan only) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plan_chats (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     UUID NOT NULL REFERENCES fuel_plans(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_db_unique ON vehicle_db (year, make, model, COALESCE(trim, ''));
CREATE INDEX IF NOT EXISTS idx_vehicle_db_search     ON vehicle_db (year, make, model);
CREATE INDEX IF NOT EXISTS idx_user_vehicles_user    ON user_vehicles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_routes_user      ON user_routes (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_fuel_plans_user       ON fuel_plans (user_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_plan_chats_plan       ON plan_chats (plan_id, created_at ASC);

-- ─── Updated_at trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_vehicle_db_updated_at') THEN
    CREATE TRIGGER set_vehicle_db_updated_at BEFORE UPDATE ON vehicle_db FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_user_vehicles_updated_at') THEN
    CREATE TRIGGER set_user_vehicles_updated_at BEFORE UPDATE ON user_vehicles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_user_routes_updated_at') THEN
    CREATE TRIGGER set_user_routes_updated_at BEFORE UPDATE ON user_routes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE vehicle_db    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_routes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_chats    ENABLE ROW LEVEL SECURITY;

-- vehicle_db: readable by all authenticated users, writable only by service role
CREATE POLICY "vehicle_db_select" ON vehicle_db FOR SELECT TO authenticated USING (true);
CREATE POLICY "vehicle_db_insert" ON vehicle_db FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "vehicle_db_update" ON vehicle_db FOR UPDATE TO service_role USING (true);

-- user_vehicles: users can only see/modify their own
CREATE POLICY "user_vehicles_select" ON user_vehicles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_vehicles_insert" ON user_vehicles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_vehicles_update" ON user_vehicles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_vehicles_delete" ON user_vehicles FOR DELETE TO authenticated USING (user_id = auth.uid());

-- user_routes
CREATE POLICY "user_routes_select" ON user_routes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_routes_insert" ON user_routes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_routes_update" ON user_routes FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_routes_delete" ON user_routes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- fuel_plans
CREATE POLICY "fuel_plans_select" ON fuel_plans FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "fuel_plans_insert" ON fuel_plans FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- plan_chats: accessible through plan ownership
CREATE POLICY "plan_chats_access" ON plan_chats FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM fuel_plans WHERE fuel_plans.id = plan_chats.plan_id AND fuel_plans.user_id = auth.uid()));
