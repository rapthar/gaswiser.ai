import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;
const __dir = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dir, '../../../supabase/seed/demo_user.sql');

const client = new Client({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
const sql = readFileSync(sqlPath, 'utf8');
await client.query(sql);
await client.end();
console.log('Demo data seeded for cowded268@gmail.com');
