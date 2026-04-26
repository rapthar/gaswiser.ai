/**
 * Geocodes stations that have street addresses but no lat/lng using Nominatim (OpenStreetMap).
 * Rate-limited to 1 request/second per Nominatim usage policy.
 *
 * Usage: node scripts/geocode-stations.js [state_abbr]
 * Example: node scripts/geocode-stations.js CA
 */

import pg from 'pg';
import { readFileSync } from 'fs';

const { Pool } = pg;

// Load env manually
const envPath = new URL('../.env', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
try {
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?/);
    if (m) process.env[m[1]] = m[2];
  }
} catch { /* env already set */ }

const DIRECT_URL = process.env.DIRECT_URL;
if (!DIRECT_URL) { console.error('DIRECT_URL not set'); process.exit(1); }

const pool = new Pool({ connectionString: DIRECT_URL, ssl: { rejectUnauthorized: false } });

async function geocode(address, city, state, zipcode) {
  const parts = [address, city, state, zipcode, 'USA'].filter(Boolean).join(', ');
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(parts)}&format=json&limit=1&addressdetails=0`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GasWiser/1.0 (gaswiser.com)' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (e) {
    console.error('  fetch error:', e.message);
    return null;
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const STATE_NAMES = {
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

async function main() {
  const stateFilter = (process.argv[2] ?? 'CA').toUpperCase();
  const stateFull = STATE_NAMES[stateFilter] ?? stateFilter;
  const client = await pool.connect();

  try {
    // Get stations with price data but no coordinates
    const { rows } = await client.query(`
      SELECT DISTINCT s.id, s.store_name, s.street_address, s.city, s.state, s.zipcode
      FROM stations s
      JOIN price_updates pu ON pu.station_id = s.id
      WHERE (s.state ILIKE $1 OR s.state ILIKE $2)
        AND s.latitude IS NULL
        AND s.street_address IS NOT NULL
      ORDER BY s.store_name
    `, [stateFilter, stateFull]);

    console.log(`Found ${rows.length} ${stateFilter} stations to geocode`);

    let success = 0, failed = 0;

    for (let i = 0; i < rows.length; i++) {
      const s = rows[i];
      process.stdout.write(`[${i + 1}/${rows.length}] ${s.store_name} (${s.city})... `);

      const coords = await geocode(s.street_address, s.city, s.state, s.zipcode);

      if (coords) {
        await client.query(
          'UPDATE stations SET latitude = $1, longitude = $2, updated_at = NOW() WHERE id = $3',
          [coords.lat, coords.lng, s.id]
        );
        process.stdout.write(`✓ ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}\n`);
        success++;
      } else {
        process.stdout.write(`✗ not found\n`);
        failed++;
      }

      // Nominatim rate limit: 1 req/second
      await sleep(1100);
    }

    console.log(`\nDone. Success: ${success}, Failed: ${failed}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
