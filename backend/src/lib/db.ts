import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// Use direct URL for queries (not pgbouncer), so we can use PostGIS functions.
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  console.error('[db] idle client error', err);
});

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}
