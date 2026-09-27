/**
 * SMS receipts over a gateway (the Chomoka channel).
 *
 * GET  /api/sms?action=config -> is a gateway configured? (no secrets)
 * POST /api/sms?action=send   -> send one batch of member receipts
 *
 * Without SMS_GATEWAY_URL/SMS_GATEWAY_TOKEN this returns 503 and the app
 * falls back to the phone's own SMS app. No secrets ever reach the browser.
 */
import { cors, rateLimit } from '../lib/_lib.js';
import { requireRole } from '../lib/_auth.js';
import { parseSmsBatch, sendSmsBatch, smsConfig } from '../lib/sms.js';

function handleConfig(req, res) {
  if (!cors(req, res, 'GET,OPTIONS')) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const config = smsConfig();
  return res.status(200).json({
    success: true,
    configured: config.enabled,
    hint: config.enabled
      ? 'Receipts can be sent to every member in one tap.'
      : 'No SMS gateway configured — members get receipts through the phone SMS app instead.',
  });
}

async function handleSend(req, res) {
  if (!cors(req, res, 'POST,OPTIONS')) return;
  if (!rateLimit(req, res, { limit: 6, windowMs: 60000 })) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (requireRole(req, res, 'secretary') === undefined) return;

  const parsed = parseSmsBatch(req.body || {});
  if (!parsed.ok) return res.status(400).json({ success: false, error: parsed.error, skipped: parsed.skipped });

  const result = await sendSmsBatch(parsed.messages);
  if (!result.configured) {
    return res.status(503).json({ success: false, error: 'sms_not_configured', sent: 0 });
  }
  if (!result.ok) {
    return res.status(502).json({ success: false, error: result.error, sent: 0, failed: result.failed });
  }
  return res.status(200).json({
    success: true,
    sent: result.sent,
    failed: result.failed,
    skipped: parsed.skipped,
    timestamp: new Date().toISOString(),
  });
}

export default async function handler(req, res) {
  const action = String(req.query?.action || '').toLowerCase();
  if (action === 'config' || (!action && req.method === 'GET')) return handleConfig(req, res);
  if (action === 'send' || (!action && req.method === 'POST')) return handleSend(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(405).json({ error: 'Unknown sms action. Use ?action=config|send' });
}
