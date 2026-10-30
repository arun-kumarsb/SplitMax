import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Server-side Postgres connection pool
let pool = null;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.warn('⚠️ WARNING: DATABASE_URL is not set in environment.');
    }
    pool = new Pool({
      connectionString,
      ssl: connectionString?.includes('localhost') ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function query(text, params) {
  const p = getPool();
  return p.query(text, params);
}

export async function runMigrations() {
  const migrationPath = path.join(__dirname, 'migrations', '001_initial_schema.sql');
  if (fs.existsSync(migrationPath)) {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    const p = getPool();
    await p.query(sql);
    console.log('✓ Database schema migrations applied successfully.');
  }
}
