/**
 * Run all pending migrations against the Gas Wiser Supabase project.
 * Usage: pnpm db:migrate
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;
const __dir = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dir, '../../..', 'supabase', 'migrations');

async function run() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      ran_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const { rows: ran } = await client.query<{ name: string }>('SELECT name FROM _migrations');
  const ranSet = new Set(ran.map((r) => r.name));

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (ranSet.has(file)) {
      console.log(`  skip  ${file}`);
      continue;
    }
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    console.log(`  run   ${file}`);
    await client.query(sql);
    await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
  }

  await client.end();
  console.log('Migrations complete.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
