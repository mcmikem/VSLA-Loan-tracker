/**
 * Flutterwave aggregator for Uganda mobile-money collections (MTN + Airtel).
 *
 * Why an aggregator: Vercel serverless has no static egress IPs, and both
 * MTN/Airtel want whitelisted caller IPs for direct integrations.
 * Flutterwave already holds that connectivity — one integration here covers
 * both networks, and no IP paperwork is needed on our side.
 *
 * Contract (developer.flutterwave.com, v3):
 *   charge  POST /v3/charges?type=mobile_money_uganda (Bearer SECRET_KEY)
 *           { tx_ref, amount, currency:UGX, network, phone_number, email,
 *             fullname?, meta? } -> { data:{id,tx_ref}, meta:{authorization} }
 *   verify  GET  /v3/transactions/:id/verify -> { data:{status,amount,...} }
 *   webhook POST (charge.completed) signed with `verif-hash` == FLW_SECRET_HASH.
 *           Always re-verify before crediting; webhooks may duplicate.
 *
 * Secrets stay server-side. Test keys (FLWSECK_TEST_) hit the sandbox where
 * UG mobile-money auto-authorizes after a few seconds.
 */
import crypto from 'node:crypto';

const FLW_BASE = 'https://api.flutterwave.com/v3';
const REQUEST_TIMEOUT_MS = 15000;

function env(name, fallback = '') {
  return String(process.env[name] || fallback).trim();
}

export class AggregatorError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'AggregatorError';
    this.status = status;
  }
}

export function aggConfig() {
  const secretKey = env('FLW_SECRET_KEY');
  return {
    enabled: secretKey.length > 10,
    testMode: secretKey.startsWith('FLWSECK_TEST_'),
    hasWebhookSecret: env('FLW_SECRET_HASH').length > 0,
  };
}

/** Flutterwave wants the 12-digit international format for UG numbers. */
export function normalizeUgMsisdn(input) {
  const digits = String(input || '').replace(/\D/g, '');
  const normalized = digits.startsWith('0') ? `256${digits.slice(1)}` : digits;
  if (!/^256\d{9}$/.test(normalized)) {
    throw new AggregatorError('Use a valid Ugandan mobile number.', 400);
  }
  return normalized;
}

export function flwNetwork(network) {
  if (network === 'MTN') return 'MTN';
  if (network === 'Airtel') return 'AIRTEL';
  throw new AggregatorError('Choose MTN or Airtel.', 400);
}

/** Unique merchant reference per charge (Flutterwave rejects replays). */
export function newTxRef(groupId) {
  const rand = crypto.randomBytes(6).toString('hex');
  const gid = String(groupId || 'grp').replace(/[^a-z0-9-]/gi, '').slice(0, 12) || 'grp';
  return `flw-${gid}-${Date.now().toString(36)}${rand}`;
}

/** Pure payload builder — unit-tested, no network.
 * @param {{ phone: string, network: string, amount: number, email?: string, fullname?: string, txRef: string, meta?: any }} args
 */
export function buildUgCharge({ phone, network, amount, email, fullname, txRef, meta }) {
  const amt = Number(amount);
  if (!Number.isInteger(amt) || amt < 500 || amt > 5000000) {
    throw new AggregatorError('Amount must be a whole number between UGX 500 and UGX 5,000,000.', 400);
  }
  if (!txRef || txRef.length < 8) throw new AggregatorError('Charge reference is required.', 400);
  return {
    tx_ref: txRef,
    amount: amt,
    currency: 'UGX',
    network: flwNetwork(network),
    phone_number: normalizeUgMsisdn(phone),
    email: email || env('FLW_CUSTOMER_EMAIL', 'noreply@vsla-ug.app'),
    ...(fullname ? { fullname: String(fullname).slice(0, 120) } : {}),
    ...(meta ? { meta } : {}),
  };
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let payload = {};
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { raw: text.slice(0, 200) };
      }
    }
    return { response, payload };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new AggregatorError('Flutterwave timed out. No money was taken.', 504);
    }
    throw new AggregatorError('Flutterwave is unreachable. No money was taken.', 502);
  } finally {
    clearTimeout(timeout);
  }
}

function flwHeaders() {
  return {
    Authorization: `Bearer ${env('FLW_SECRET_KEY')}`,
    'Content-Type': 'application/json',
  };
}

/** Initiate a UGX collection. Returns a pending reference — never a confirmation.
 * NOTE: UG charge responses carry NO transaction id, only meta.authorization.
 * Our tx_ref is the authoritative key; verification runs against it. */
export async function initiateUgCharge(args) {
  const body = buildUgCharge(args);
  const { response, payload } = await fetchJson(`${FLW_BASE}/charges?type=mobile_money_uganda`, {
    method: 'POST',
    headers: flwHeaders(),
    body: JSON.stringify(body),
  });
  if (!response.ok || payload?.status !== 'success') {
    const msg = payload?.message ? `Flutterwave refused the charge (${payload.message}).` : 'Flutterwave refused the charge.';
    throw new AggregatorError(`${msg} No money was taken.`, 502);
  }
  const data = payload.data || {};
  return {
    flwId: data.id ? String(data.id) : null,
    txRef: data.tx_ref || body.tx_ref,
    status: 'pending',
    mode: 'live',
    provider: 'flutterwave',
    redirectUrl: payload?.meta?.authorization?.redirect || null,
    authMode: payload?.meta?.authorization?.mode || null,
  };
}

export function mapFlwStatus(raw) {
  const s = String(raw || '').toLowerCase();
  if (['successful', 'success', 'completed'].includes(s)) return 'confirmed';
  if (['failed', 'cancelled', 'canceled', 'reversed'].includes(s)) return 'failed';
  return 'pending';
}

/**
 * Re-query Flutterwave — the ONLY basis for crediting a member.
 * Prefers the numeric id when the charge response carried one, otherwise
 * verifies by our own tx_ref (UG charges return no id).
 */
export async function verifyFlwTransaction(flwIdOrRef, txRef = null) {
  const ref = txRef || (!/^\d+$/.test(String(flwIdOrRef || '')) ? String(flwIdOrRef) : null);
  const url = /^\d+$/.test(String(flwIdOrRef || ''))
    ? `${FLW_BASE}/transactions/${encodeURIComponent(String(flwIdOrRef))}/verify`
    : `${FLW_BASE}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(String(ref || flwIdOrRef))}`;
  const { response, payload } = await fetchJson(url, { method: 'GET', headers: flwHeaders() });
  if (!response.ok) throw new AggregatorError('Could not verify with Flutterwave yet.', 502);
  const data = payload?.data || {};
  return {
    flwId: data.id ? String(data.id) : (typeof flwIdOrRef === 'string' && /^\d+$/.test(flwIdOrRef) ? flwIdOrRef : null),
    txRef: data.tx_ref || ref || null,
    amount: Number(data.amount) || null,
    currency: data.currency || null,
    status: mapFlwStatus(data.status),
    raw: data.processor_response || null,
  };
}

/** Webhook gate: verif-hash must equal FLW_SECRET_HASH when configured. */
export function verifyWebhookSignature(headers = {}) {
  const configured = env('FLW_SECRET_HASH');
  if (!configured) return false;
  const got = headers['verif-hash'] || headers['Verif-Hash'] || '';
  if (!got || got.length !== configured.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(configured));
  } catch {
    return false;
  }
}

// ---------- pending-transaction store (memory, or postgres when configured) ----------
const memTx = globalThis.__vslaFlwTx || (globalThis.__vslaFlwTx = new Map());

let pool = null;
async function getPool() {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) return null;
  const { Pool } = await import('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 2,
    idleTimeoutMillis: 10000,
  });
  return pool;
}

let tableEnsured = false;
async function ensureTable() {
  const p = await getPool();
  if (!p || tableEnsured) return p;
  await p.query(`
    CREATE TABLE IF NOT EXISTS momo_tx (
      tx_ref TEXT PRIMARY KEY,
      provider TEXT NOT NULL DEFAULT 'flutterwave',
      status TEXT NOT NULL DEFAULT 'pending',
      payload JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  tableEnsured = true;
  return p;
}

export async function savePendingTx(record) {
  memTx.set(record.txRef, { ...record, updatedAt: new Date().toISOString() });
  try {
    const p = await ensureTable();
    if (!p) return;
    await p.query(
      `INSERT INTO momo_tx (tx_ref, provider, status, payload, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (tx_ref) DO UPDATE SET status = EXCLUDED.status, payload = EXCLUDED.payload, updated_at = NOW()`,
      [record.txRef, record.provider || 'flutterwave', record.status || 'pending', JSON.stringify(record)]
    );
  } catch {
    /* memory copy is enough for the meeting */
  }
}

export async function loadPendingTx(txRef) {
  if (memTx.has(txRef)) return memTx.get(txRef);
  try {
    const p = await ensureTable();
    if (!p) return null;
    const { rows } = await p.query('SELECT tx_ref, provider, status, payload FROM momo_tx WHERE tx_ref = $1', [txRef]);
    if (rows.length === 0) return null;
    const rec = { ...(rows[0].payload || {}), txRef: rows[0].tx_ref, status: rows[0].status };
    memTx.set(txRef, rec);
    return rec;
  } catch {
    return null;
  }
}
