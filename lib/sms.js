/**
 * SMS gateway — the "Chomoka" channel.
 *
 * Chomoka (Ensibuuko, Uganda) sends every member an SMS receipt straight from
 * the group phone because they run a gateway. Most of our groups will not, so
 * this is opt-in: set SMS_GATEWAY_URL + SMS_GATEWAY_TOKEN and the app sends
 * one batch per meeting; without them the UI silently falls back to the
 * phone's own SMS app, which works with no data bundle.
 *
 * Provider-agnostic on purpose: any HTTP gateway that accepts
 * { to, from, message } and returns 2xx works (Africa's Talking, Infobip,
 * Arkesel, a telco shortcode relay...). Nothing here ever logs a token.
 */
import { isUgPhone, normalizeUgPhone } from './phone.js';

export const MAX_BATCH = 50;

export function smsConfig(env = process.env) {
  const url = (env.SMS_GATEWAY_URL || '').trim();
  const token = (env.SMS_GATEWAY_TOKEN || '').trim();
  return {
    enabled: Boolean(url && token),
    url,
    token,
    senderId: (env.SMS_SENDER_ID || 'VSLA-UG').trim(),
  };
}

/** Accepts one message or a batch; validates numbers, caps the batch size. */
export function parseSmsBatch(body) {
  const raw = body?.messages ?? (body?.to ? [{ to: body.to, message: body.message }] : []);
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: 'Nothing to send.' };
  }
  if (raw.length > MAX_BATCH) {
    return { ok: false, error: `Too many numbers in one batch (max ${MAX_BATCH}).` };
  }
  const messages = [];
  const skipped = [];
  for (const entry of raw) {
    const to = normalizeUgPhone(String(entry?.to || ''));
    const message = String(entry?.message || '').trim();
    if (!isUgPhone(to)) {
      skipped.push({ to: String(entry?.to || ''), why: 'bad-number' });
      continue;
    }
    if (!message) {
      skipped.push({ to, why: 'empty-message' });
      continue;
    }
    messages.push({ to, message: message.slice(0, 480) });
  }
  if (messages.length === 0) return { ok: false, error: 'No valid Ugandan numbers in the batch.', skipped };
  return { ok: true, messages, skipped };
}

/**
 * Sends one batch. Resolves to counts, never throws on a bad gateway — a
 * failed SMS must not look like a failed meeting.
 */
export async function sendSmsBatch(messages, { env = process.env, fetchImpl = fetch } = {}) {
  const config = smsConfig(env);
  if (!config.enabled) {
    return { ok: false, configured: false, sent: 0, failed: messages.length, error: 'sms_not_configured' };
  }
  try {
    const response = await fetchImpl(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
      },
      body: JSON.stringify({
        from: config.senderId,
        messages: messages.map((m) => ({ to: m.to, message: m.message })),
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('SMS gateway rejected the batch:', response.status, detail.slice(0, 200));
      return { ok: false, configured: true, sent: 0, failed: messages.length, error: `gateway_${response.status}` };
    }
    return { ok: true, configured: true, sent: messages.length, failed: 0 };
  } catch (error) {
    console.error('SMS gateway unreachable:', error?.message || error);
    return { ok: false, configured: true, sent: 0, failed: messages.length, error: 'gateway_unreachable' };
  }
}
