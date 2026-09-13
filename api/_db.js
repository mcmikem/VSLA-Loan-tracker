/**
 * Upgrade #21 — storage abstraction.
 *
 * Drivers (selected by environment, no code changes):
 *   - memory   (default on Vercel): per-instance seed store, stateless-safe.
 *              Writes echo; browsers persist via localStorage.
 *   - postgres (set DATABASE_URL): shared durable store for all group
 *              state. Provision free at neon.tech, paste the URL into
 *              Vercel → Project → Settings → Environment Variables.
 *
 * Table (created automatically on first use):
 *   vsla_groups(group_id TEXT PRIMARY KEY, state JSONB, updated_at TIMESTAMPTZ)
 */
import { getSeedForGroup } from './_seed.js';

let pool = null;
let tableEnsured = false;

function usePostgres() {
  return !!process.env.DATABASE_URL;
}

async function getPool() {
  if (pool) return pool;
  const { Pool } = await import('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 10000,
  });
  return pool;
}

async function ensureTable() {
  if (tableEnsured) return;
  const p = await getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS vsla_groups (
      group_id TEXT PRIMARY KEY,
      state JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  tableEnsured = true;
}

const memory = new Map();

export async function loadGroup(groupId) {
  if (!usePostgres()) {
    if (!memory.has(groupId)) memory.set(groupId, getSeedForGroup(groupId));
    return memory.get(groupId);
  }
  await ensureTable();
  const p = await getPool();
  const { rows } = await p.query('SELECT state FROM vsla_groups WHERE group_id = $1', [groupId]);
  if (rows.length > 0) return rows[0].state;
  const seed = getSeedForGroup(groupId);
  await p.query(
    'INSERT INTO vsla_groups (group_id, state) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [groupId, JSON.stringify(seed)]
  );
  return seed;
}

export async function saveGroup(groupId, state) {
  state.groupId = groupId;
  state.lastBackupDate = new Date().toISOString();
  if (!usePostgres()) {
    memory.set(groupId, state);
    if (memory.size > 200) memory.clear();
    return state;
  }
  await ensureTable();
  const p = await getPool();
  await p.query(
    `INSERT INTO vsla_groups (group_id, state, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (group_id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
    [groupId, JSON.stringify(state)]
  );
  return state;
}

export function storageInfo() {
  return {
    driver: usePostgres() ? 'postgres' : 'memory',
    durable: usePostgres(),
  };
}
