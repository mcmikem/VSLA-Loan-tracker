import { z } from 'zod';

// Upgrade #3/#4 — shared API hardening: schema validation + best-effort
// per-IP rate limiting for all serverless endpoints.
// NOTE: in-memory buckets reset on cold starts; for strict multi-instance
// limits attach Upstash Redis via UPSTASH_REDIS_REST_URL later.

// ---------- rate limiting ----------
const buckets = new Map();

export function rateLimit(req, res, { limit = 60, windowMs = 60000 } = {}) {
  const ip =
    req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  const key = `${ip}:${req.url?.split('?')[0] || 'global'}`;
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now - entry.start > windowMs) {
    buckets.set(key, { start: now, count: 1 });
    if (buckets.size > 5000) buckets.clear();
    return true;
  }
  entry.count += 1;
  if (entry.count > limit) {
    res.setHeader('Retry-After', String(Math.ceil((entry.start + windowMs - now) / 1000)));
    res.status(429).json({ error: 'Too many requests. Please wait a minute and try again.' });
    return false;
  }
  return true;
}

// ---------- CORS + methods ----------
export function cors(req, res, methods = 'GET,POST,OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-group-id');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return false;
  }
  return true;
}

// ---------- schemas ----------
export const groupIdSchema = z
  .string()
  .regex(/^[a-zA-Z0-9_-]{1,64}$/)
  .optional();

export const createGroupSchema = z.object({
  name: z.string().trim().min(3).max(80),
  adminName: z.string().trim().min(3).max(80),
  adminPhone: z.string().trim().min(9).max(16),
  boxIdentifier: z.string().trim().max(24).optional(),
  location: z.string().trim().max(120).optional(),
  meetingDay: z.string().trim().max(80).optional(),
  sharePrice: z.coerce.number().int().min(500).max(1000000).optional(),
  welfareMonthly: z.coerce.number().int().min(0).max(500000).optional(),
  cycleDurationMonths: z.coerce.number().int().min(3).max(24).optional(),
  adminProvider: z.enum(['MTN', 'Airtel']).optional(),
  adminPin: z.string().regex(/^\d{4}$/).optional(),
  plan: z.enum(['free', 'pro', 'sacco']).optional(),
});

const UGANDA_PHONE = /^\+256\d{9}$|^0\d{9}$|^256\d{9}$/;

export const joinGroupSchema = z.object({
  inviteCode: z.string().trim().min(4).max(16),
  memberName: z.string().trim().min(3).max(80),
  phone: z.string().trim().regex(UGANDA_PHONE, 'Use a valid Ugandan phone number'),
  provider: z.enum(['MTN', 'Airtel']).optional(),
  nationalId: z.string().trim().max(20).optional(),
  pin: z.string().regex(/^\d{4}$/).optional(),
});

export const stateSchema = z
  .object({
    members: z.array(z.any()).max(5000),
    boxCashBalance: z.number().finite().min(0).max(1e12).optional(),
    loanFundBalance: z.number().finite().min(0).max(1e13).optional(),
    welfareFundBalance: z.number().finite().min(0).max(1e12).optional(),
  })
  .passthrough();

export function validate(schema, data, res) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid request',
      details: parsed.error.issues.slice(0, 5).map((i) => ({
        field: i.path.join('.') || '(root)',
        message: i.message,
      })),
    });
    return null;
  }
  return parsed.data;
}

// ---------- subscription plans (upgrade #25 scaffold) ----------
// Free groups are capped; paid plans lift the cap. Limits enforced in
// /api/groups/join. Paid activation arrives with MoMo billing keys.
export const PLAN_LIMITS = {
  free: { maxMembers: 30, label: 'Free' },
  pro: { maxMembers: 500, label: 'Pro' },
  sacco: { maxMembers: 5000, label: 'SACCO' },
};

export function planOf(group) {
  const plan = group.groupProfile?.plan || group.plan || 'free';
  return PLAN_LIMITS[plan] ? plan : 'free';
}

export function memberCap(group) {
  return PLAN_LIMITS[planOf(group)].maxMembers;
}
