-- Demo data for cowded268@gmail.com
DO $$
DECLARE
  v_user_id    UUID := '8bbfe33c-1a3f-4d49-a5a9-a2e638a073fe';
  v_camry_db   UUID := '487ef132-4e8a-442f-9ce0-c3ac0cc26a33';
  v_runner_db  UUID := '48e22944-3469-4070-bb49-3f6ce7314915';
  v_uv_camry   UUID;
  v_uv_runner  UUID;
  v_plan1 UUID; v_plan2 UUID; v_plan3 UUID; v_plan4 UUID;
  -- fuel_plans.vehicle_id → vehicle_db.id (not user_vehicles.id)
BEGIN

-- ── Wipe existing demo data to allow re-runs ────────────────────────────────
DELETE FROM plan_chats  WHERE plan_id IN (SELECT id FROM fuel_plans WHERE user_id = v_user_id);
DELETE FROM fuel_plans  WHERE user_id = v_user_id;
DELETE FROM user_routes WHERE user_id = v_user_id;
DELETE FROM user_vehicles WHERE user_id = v_user_id;

-- ── User Vehicles ────────────────────────────────────────────────────────────
INSERT INTO user_vehicles (id, user_id, vehicle_db_id, nickname, tank_level_percent, is_primary)
VALUES
  (gen_random_uuid(), v_user_id, v_camry_db,  'My Camry',  65, true),
  (gen_random_uuid(), v_user_id, v_runner_db, '4Runner',   40, false);

SELECT id INTO v_uv_camry  FROM user_vehicles WHERE user_id = v_user_id AND vehicle_db_id = v_camry_db  LIMIT 1;
SELECT id INTO v_uv_runner FROM user_vehicles WHERE user_id = v_user_id AND vehicle_db_id = v_runner_db LIMIT 1;

-- ── Fuel Plans ───────────────────────────────────────────────────────────────
v_plan1 := gen_random_uuid();
INSERT INTO fuel_plans (id, user_id, vehicle_id, stops, total_fuel_cost, total_distance_miles,
  projected_savings, price_prediction, ai_summary, ai_reasoning, generated_at)
VALUES (v_plan1, v_user_id, v_camry_db,
  '[{"sequence":1,"station":{"id":"s1","name":"USA Gasoline","brand":"USA","address":"1025 W Anaheim St, Wilmington, CA","lat":33.779,"lng":-118.275},"price_per_gallon":3.879,"gallons_to_fill":6.2,"estimated_cost":24.05,"detour_miles":0.4,"arrive_at_percent":28},
    {"sequence":2,"station":{"id":"s2","name":"Costco Gasoline","brand":"Costco","address":"2501 Se Marine Dr, San Diego, CA","lat":32.706,"lng":-117.135},"price_per_gallon":3.749,"gallons_to_fill":4.1,"estimated_cost":15.37,"detour_miles":0.2,"arrive_at_percent":55}]'::jsonb,
  39.42, 121.3, 4.18,
  '{"direction":"falling","confidence":0.78,"hours_ahead":24,"predicted_delta":-0.031}'::jsonb,
  'LA → San Diego with 2 stops. Costco SD at $3.749/gal saves $4.18 vs area average.',
  'SoCal prices trending down. Costco consistently 12¢ below street price.',
  NOW() - INTERVAL '2 days');

v_plan2 := gen_random_uuid();
INSERT INTO fuel_plans (id, user_id, vehicle_id, stops, total_fuel_cost, total_distance_miles,
  projected_savings, price_prediction, ai_summary, ai_reasoning, generated_at)
VALUES (v_plan2, v_user_id, v_camry_db,
  '[{"sequence":1,"station":{"id":"s3","name":"Chevron","brand":"Chevron","address":"450 Fell St, San Francisco, CA","lat":37.776,"lng":-122.427},"price_per_gallon":4.199,"gallons_to_fill":7.8,"estimated_cost":32.75,"detour_miles":0.0,"arrive_at_percent":40},
    {"sequence":2,"station":{"id":"s4","name":"Shell","brand":"Shell","address":"1401 W Capitol Ave, West Sacramento, CA","lat":38.584,"lng":-121.537},"price_per_gallon":3.989,"gallons_to_fill":3.2,"estimated_cost":12.76,"detour_miles":0.6,"arrive_at_percent":72}]'::jsonb,
  45.51, 87.6, 2.91,
  '{"direction":"stable","confidence":0.65,"hours_ahead":12,"predicted_delta":0.008}'::jsonb,
  'SF → Sacramento. Shell in West Sacramento is $0.21/gal cheaper than SF average.',
  'Bay Area prices elevated due to refinery maintenance. Sacramento prices more competitive.',
  NOW() - INTERVAL '5 days');

v_plan3 := gen_random_uuid();
INSERT INTO fuel_plans (id, user_id, vehicle_id, stops, total_fuel_cost, total_distance_miles,
  projected_savings, price_prediction, ai_summary, ai_reasoning, generated_at)
VALUES (v_plan3, v_user_id, v_camry_db,
  '[{"sequence":1,"station":{"id":"s5","name":"ARCO AM/PM","brand":"ARCO","address":"1901 Lincoln Blvd, Santa Monica, CA","lat":34.009,"lng":-118.487},"price_per_gallon":3.699,"gallons_to_fill":5.5,"estimated_cost":20.34,"detour_miles":0.3,"arrive_at_percent":60}]'::jsonb,
  20.34, 32.1, 1.44,
  '{"direction":"rising","confidence":0.82,"hours_ahead":6,"predicted_delta":0.024}'::jsonb,
  'Santa Monica → Burbank. ARCO at $3.699/gal — cheapest in the corridor.',
  'Prices rising this evening. Fill now to beat the incoming increase.',
  NOW() - INTERVAL '8 days');

v_plan4 := gen_random_uuid();
INSERT INTO fuel_plans (id, user_id, vehicle_id, stops, total_fuel_cost, total_distance_miles,
  projected_savings, price_prediction, ai_summary, ai_reasoning, generated_at)
VALUES (v_plan4, v_user_id, v_camry_db,
  '[{"sequence":1,"station":{"id":"s6","name":"Costco Gasoline","brand":"Costco","address":"13463 Hoover St, Westminster, CA","lat":33.752,"lng":-117.997},"price_per_gallon":3.739,"gallons_to_fill":8.1,"estimated_cost":30.29,"detour_miles":1.2,"arrive_at_percent":45},
    {"sequence":2,"station":{"id":"s7","name":"ARCO","brand":"ARCO","address":"67900 Ramon Rd, Cathedral City, CA","lat":33.779,"lng":-116.468},"price_per_gallon":3.819,"gallons_to_fill":5.3,"estimated_cost":20.24,"detour_miles":0.4,"arrive_at_percent":38}]'::jsonb,
  50.53, 107.8, 5.62,
  '{"direction":"stable","confidence":0.71,"hours_ahead":48,"predicted_delta":-0.011}'::jsonb,
  'LA → Palm Springs weekend. Costco Westminster saves 22¢/gal vs desert stations.',
  'Desert stations price 15–25% higher than inland average. Pre-fill at Costco Westminster.',
  NOW() - INTERVAL '14 days');

-- ── Plan Chats ───────────────────────────────────────────────────────────────
INSERT INTO plan_chats (plan_id, role, content, created_at) VALUES
  (v_plan1, 'user',      'Why Costco SD over the Shell nearby?',                                                      NOW() - INTERVAL '2 days' + INTERVAL '5 minutes'),
  (v_plan1, 'assistant', 'Costco at $3.749 is 13¢/gal cheaper than Shell. Over 4.1 gallons that''s $0.53 extra savings. Costco prices fuel as a member perk, not a profit center — consistently 10–15¢ below street price.',                                 NOW() - INTERVAL '2 days' + INTERVAL '6 minutes'),
  (v_plan1, 'user',      'Should I fill completely at stop 1 instead?',                                               NOW() - INTERVAL '2 days' + INTERVAL '8 minutes'),
  (v_plan1, 'assistant', 'Stick with the plan. A lighter tank improves highway mpg slightly, and Costco SD is actually $0.13/gal cheaper anyway. Filling to ~55% at Wilmington gets you comfortably to SD with room for the cheaper top-up.',               NOW() - INTERVAL '2 days' + INTERVAL '9 minutes');

-- ── User Routes ──────────────────────────────────────────────────────────────
INSERT INTO user_routes (user_id, name, route_type, waypoints, distance_miles, is_active) VALUES
  (v_user_id, 'Daily Commute',   'daily', '[{"lat":34.024,"lng":-118.496,"label":"Home — Santa Monica"},{"lat":34.052,"lng":-118.244,"label":"Work — Downtown LA"}]'::jsonb,  16.4, true),
  (v_user_id, 'LA to San Diego', 'trip',  '[{"lat":34.052,"lng":-118.244,"label":"Downtown LA"},{"lat":32.715,"lng":-117.157,"label":"San Diego"}]'::jsonb,                  121.3, true);

RAISE NOTICE 'Demo seeded: 2 vehicles, 4 plans, 4 chats, 2 routes';
END $$;
