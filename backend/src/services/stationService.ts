/**
 * Queries the existing gaswiser.com stations + price_updates tables.
 * No new tables — reads from the live data already scraped by the scraper pipeline.
 */
import { query } from '../lib/db.js';
import type { Station } from '../lib/types.js';

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
  CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
};

function stateVariants(code: string): [string, string] {
  const abbr = code.toUpperCase();
  return [abbr, STATE_NAMES[abbr] ?? abbr];
}

/**
 * Find stations near a lat/lng within radius_miles.
 * Returns stations with their latest prices joined in.
 */
export async function findNearbyStations(
  lat: number,
  lng: number,
  radiusMiles = 10,
  fuelType = 'regular',
  limit = 25,
  fallbackState?: string
): Promise<Station[]> {
  // Use DISTINCT ON (street_address) to deduplicate stations from multiple scraper runs.
  // Keep the row with the lowest regular price (or most recent if no price).
  const rows = await query<Station>(`
    WITH ranked AS (
      SELECT
        s.id,
        s.store_name,
        s.street_address,
        s.city,
        s.state,
        s.zipcode,
        s.country,
        s.latitude,
        s.longitude,
        s.website,
        s.fuel_types,
        s.created_at,
        s.updated_at,
        reg.price  AS regular_price,
        mid.price  AS midgrade_price,
        prem.price AS premium_price,
        die.price  AS diesel_price,
        GREATEST(reg.update_time, mid.update_time, prem.update_time, die.update_time) AS last_updated,
        ROUND((point(s.longitude, s.latitude) <@> point($2, $1))::numeric, 2) AS distance_miles,
        ROW_NUMBER() OVER (
          PARTITION BY LOWER(s.street_address)
          ORDER BY reg.price ASC NULLS LAST, s.updated_at DESC
        ) AS rn
      FROM stations s
      LEFT JOIN LATERAL (SELECT price, update_time FROM price_updates WHERE station_id = s.id AND fuel_type = 'regular' ORDER BY update_time DESC LIMIT 1) reg ON true
      LEFT JOIN LATERAL (SELECT price, update_time FROM price_updates WHERE station_id = s.id AND fuel_type = 'midgrade' ORDER BY update_time DESC LIMIT 1) mid ON true
      LEFT JOIN LATERAL (SELECT price, update_time FROM price_updates WHERE station_id = s.id AND fuel_type = 'premium' ORDER BY update_time DESC LIMIT 1) prem ON true
      LEFT JOIN LATERAL (SELECT price, update_time FROM price_updates WHERE station_id = s.id AND fuel_type = 'diesel' ORDER BY update_time DESC LIMIT 1) die ON true
      WHERE
        s.latitude IS NOT NULL
        AND s.longitude IS NOT NULL
        AND (point(s.longitude, s.latitude) <@> point($2, $1)) < $3
    )
    SELECT id, store_name, street_address, city, state, zipcode, country,
           latitude, longitude, website, fuel_types, created_at, updated_at,
           regular_price, midgrade_price, premium_price, diesel_price, last_updated, distance_miles
    FROM ranked
    WHERE rn = 1
    ORDER BY distance_miles ASC
    LIMIT $4
  `, [lat, lng, radiusMiles, limit]);

  // If coordinate-based search found results, return them
  if (rows.length > 0) return rows;

  // Fallback: return cheapest stations by state with price data
  if (!fallbackState) return [];

  const [stateAbbr, stateFull] = stateVariants(fallbackState);
  const stateRows = await query<Station>(`
    WITH ranked AS (
      SELECT
        s.id, s.store_name, s.street_address, s.city, s.state, s.zipcode,
        s.country, s.latitude, s.longitude, s.website, s.fuel_types,
        s.created_at, s.updated_at,
        reg.price AS regular_price, mid.price AS midgrade_price,
        prem.price AS premium_price, die.price AS diesel_price,
        GREATEST(reg.update_time, mid.update_time, prem.update_time, die.update_time) AS last_updated,
        NULL::numeric AS distance_miles,
        ROW_NUMBER() OVER (
          PARTITION BY LOWER(s.street_address)
          ORDER BY reg.price ASC NULLS LAST, s.updated_at DESC
        ) AS rn
      FROM stations s
      LEFT JOIN LATERAL (SELECT price, update_time FROM price_updates WHERE station_id = s.id AND fuel_type = 'regular' ORDER BY update_time DESC LIMIT 1) reg ON true
      LEFT JOIN LATERAL (SELECT price, update_time FROM price_updates WHERE station_id = s.id AND fuel_type = 'midgrade' ORDER BY update_time DESC LIMIT 1) mid ON true
      LEFT JOIN LATERAL (SELECT price, update_time FROM price_updates WHERE station_id = s.id AND fuel_type = 'premium' ORDER BY update_time DESC LIMIT 1) prem ON true
      LEFT JOIN LATERAL (SELECT price, update_time FROM price_updates WHERE station_id = s.id AND fuel_type = 'diesel' ORDER BY update_time DESC LIMIT 1) die ON true
      WHERE (s.state ILIKE $1 OR s.state ILIKE $2) AND reg.price IS NOT NULL
    )
    SELECT id, store_name, street_address, city, state, zipcode, country,
           latitude, longitude, website, fuel_types, created_at, updated_at,
           regular_price, midgrade_price, premium_price, diesel_price, last_updated, distance_miles
    FROM ranked WHERE rn = 1
    ORDER BY regular_price ASC
    LIMIT $3
  `, [stateAbbr, stateFull, limit]);

  return stateRows;
}

/**
 * Find stations along a bounding box defined by a set of waypoints.
 * Used by the route optimizer to get candidate stations for a trip.
 */
export async function findStationsAlongRoute(
  waypoints: Array<{ lat: number; lng: number }>,
  bufferMiles = 5,
  limit = 40,
  fallbackState?: string
): Promise<Station[]> {
  if (waypoints.length === 0) return [];

  const lats = waypoints.map((w) => w.lat);
  const lngs = waypoints.map((w) => w.lng);

  const minLat = Math.min(...lats) - bufferMiles / 69;
  const maxLat = Math.max(...lats) + bufferMiles / 69;
  const midLat = (minLat + maxLat) / 2;
  const degPerMileLng = bufferMiles / (69 * Math.cos((midLat * Math.PI) / 180));
  const minLng = Math.min(...lngs) - degPerMileLng;
  const maxLng = Math.max(...lngs) + degPerMileLng;

  const rows = await query<Station>(`
    SELECT
      s.id,
      s.store_name,
      s.street_address,
      s.city,
      s.state,
      s.zipcode,
      s.country,
      s.latitude,
      s.longitude,
      s.website,
      s.fuel_types,
      s.created_at,
      s.updated_at,
      reg.price  AS regular_price,
      mid.price  AS midgrade_price,
      prem.price AS premium_price,
      die.price  AS diesel_price,
      GREATEST(reg.update_time, mid.update_time, prem.update_time, die.update_time) AS last_updated
    FROM stations s
    LEFT JOIN LATERAL (
      SELECT price, update_time FROM price_updates
      WHERE station_id = s.id AND fuel_type = 'regular'
      ORDER BY update_time DESC LIMIT 1
    ) reg ON true
    LEFT JOIN LATERAL (
      SELECT price, update_time FROM price_updates
      WHERE station_id = s.id AND fuel_type = 'midgrade'
      ORDER BY update_time DESC LIMIT 1
    ) mid ON true
    LEFT JOIN LATERAL (
      SELECT price, update_time FROM price_updates
      WHERE station_id = s.id AND fuel_type = 'premium'
      ORDER BY update_time DESC LIMIT 1
    ) prem ON true
    LEFT JOIN LATERAL (
      SELECT price, update_time FROM price_updates
      WHERE station_id = s.id AND fuel_type = 'diesel'
      ORDER BY update_time DESC LIMIT 1
    ) die ON true
    WHERE
      s.latitude  BETWEEN $1 AND $2
      AND s.longitude BETWEEN $3 AND $4
    ORDER BY reg.price ASC NULLS LAST
    LIMIT $5
  `, [minLat, maxLat, minLng, maxLng, limit]);

  // If coordinate-based results found, return them
  if (rows.length >= 3) return rows;

  // Fallback to state-based search when few/no coordinate matches
  if (!fallbackState) return rows;

  const [stateAbbr, stateFull] = stateVariants(fallbackState);
  const stateRows = await query<Station>(`
    SELECT
      s.id, s.store_name, s.street_address, s.city, s.state, s.zipcode,
      s.country, s.latitude, s.longitude, s.website, s.fuel_types,
      s.created_at, s.updated_at,
      reg.price AS regular_price, mid.price AS midgrade_price,
      prem.price AS premium_price, die.price AS diesel_price,
      GREATEST(reg.update_time, mid.update_time, prem.update_time, die.update_time) AS last_updated
    FROM stations s
    LEFT JOIN LATERAL (SELECT price, update_time FROM price_updates WHERE station_id = s.id AND fuel_type = 'regular' ORDER BY update_time DESC LIMIT 1) reg ON true
    LEFT JOIN LATERAL (SELECT price, update_time FROM price_updates WHERE station_id = s.id AND fuel_type = 'midgrade' ORDER BY update_time DESC LIMIT 1) mid ON true
    LEFT JOIN LATERAL (SELECT price, update_time FROM price_updates WHERE station_id = s.id AND fuel_type = 'premium' ORDER BY update_time DESC LIMIT 1) prem ON true
    LEFT JOIN LATERAL (SELECT price, update_time FROM price_updates WHERE station_id = s.id AND fuel_type = 'diesel' ORDER BY update_time DESC LIMIT 1) die ON true
    WHERE (s.state ILIKE $1 OR s.state ILIKE $2) AND reg.price IS NOT NULL
    ORDER BY reg.price ASC
    LIMIT $3
  `, [stateAbbr, stateFull, limit]);

  // Merge: coordinate results first, then state fallback (deduped)
  const seen = new Set(rows.map(r => r.id));
  return [...rows, ...stateRows.filter(r => !seen.has(r.id))].slice(0, limit);
}

/** Get the most recent price history for a state (for price prediction) */
export async function getStatePriceHistory(
  stateCode: string,
  hoursBack = 72
): Promise<Array<{ price: number; recorded_at: string; day_of_week: string }>> {
  const [abbr, full] = stateVariants(stateCode);
  return query(`
    SELECT
      pu.price,
      pu.update_time AS recorded_at,
      TO_CHAR(pu.update_time AT TIME ZONE 'UTC', 'Day') AS day_of_week
    FROM price_updates pu
    JOIN stations s ON s.id = pu.station_id
    WHERE
      (s.state ILIKE $1 OR s.state ILIKE $2)
      AND pu.fuel_type = 'regular'
      AND pu.update_time > NOW() - INTERVAL '1 hour' * $3
    ORDER BY pu.update_time DESC
    LIMIT 200
  `, [abbr, full, hoursBack]);
}
