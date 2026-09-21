/**
 * Mobile-money collections for MTN MoMo and Airtel Money Uganda.
 *
 * GET  /api/momo/config  -> configuration badge (never secrets)
 * POST /api/momo/push    -> starts a collection request
 * GET  /api/momo/status  -> reads provider status for a pending request
 */
import { cors, rateLimit } from '../lib/_lib.js';
import { requireRole } from '../lib/_auth.js';
import { resolveGroupId } from '../lib/_seed.js';
import { loadPendingTx, savePendingTx, verifyFlwTransaction, verifyWebhookSignature } from '../lib/aggregator.js';
import {
  MomoProviderError,
  collectionStatus,
  getMomoConfig,
  parseCollectionInput,
  requestCollection,
} from '../lib/momo.js';

function protectMoneyRoute(req, res) {
  const session = requireRole(req, res, 'treasurer');
  return session !== undefined;
}

function sendMomoError(res, error) {
  if (error instanceof MomoProviderError) {
    return res.status(error.status || 502).json({ success: false, error: error.message });
  }
  if (error && typeof error.status === 'number') {
    return res.status(error.status).json({ success: false, error: error.message || 'Mobile-money error.' });
  }
  console.error('MoMo provider error:', error?.message || error);
  return res.status(502).json({ success: false, error: 'Mobile-money provider error. No money was taken.' });
}

function handleConfig(req, res) {
  if (!cors(req, res, 'GET,OPTIONS')) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const config = getMomoConfig();
  return res.status(200).json({
    success: true,
    mode: config.mode,
    provider: config.provider,
    mtnConfigured: config.mtnConfigured,
    airtelConfigured: config.airtelConfigured,
    aggregatorEnabled: config.aggregatorEnabled,
    aggregatorTestMode: config.aggregatorTestMode,
    mtnEnvironment: config.mtnEnvironment,
    airtelEnvironment: config.airtelEnvironment,
    hint:
      config.mode === 'live'
        ? config.provider === 'flutterwave'
          ? `Live collections via Flutterwave (${config.aggregatorTestMode ? 'test' : 'live'} keys).`
          : 'Live MoMo collections enabled.'
        : 'Sandbox simulation — add provider credentials and set MOMO_LIVE=1 to move real money.',
  });
}

async function handlePush(req, res) {
  if (!cors(req, res, 'POST,OPTIONS')) return;
  if (!rateLimit(req, res, { limit: 20, windowMs: 60000 })) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!protectMoneyRoute(req, res)) return;

  try {
    const input = parseCollectionInput(req.body || {});
    const result = await requestCollection(input, { groupId: resolveGroupId(req) });
    return res.status(result.mode === 'live' ? 202 : 200).json({
      success: true,
      ...result,
      network: input.network,
      phone: input.phone,
      amount: input.amount,
      memberName: input.memberName,
      purpose: input.purpose,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return sendMomoError(res, error);
  }
}

async function handleStatus(req, res) {
  if (!cors(req, res, 'GET,OPTIONS')) return;
  if (!rateLimit(req, res, { limit: 120, windowMs: 60000 })) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!protectMoneyRoute(req, res)) return;

  try {
    const network = String(req.query?.network || '');
    const transactionId = String(req.query?.transactionId || '');
    const result = await collectionStatus(network, transactionId);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return sendMomoError(res, error);
  }
}

export default async function handler(req, res) {
  const action = String(req.query?.action || '').toLowerCase();
  if (action === 'config' || (!action && req.method === 'GET' && !req.query?.network)) return handleConfig(req, res);
  if (action === 'status' || (!action && req.method === 'GET' && req.query?.network)) return handleStatus(req, res);
  if (action === 'push' || (!action && req.method === 'POST')) return handlePush(req, res);
  if (action === 'webhook') return handleWebhook(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(405).json({ error: 'Unknown momo action. Use ?action=config|push|status|webhook' });
}

/**
 * POST /api/momo/webhook — Flutterwave charge.completed notifications.
 * No session here: the verif-hash signature IS the authentication.
 * Fast + idempotent: verify-then-mark, crediting happens on status poll.
 */
async function handleWebhook(req, res) {
  if (!cors(req, res, 'POST,OPTIONS')) return;
  if (!rateLimit(req, res, { limit: 60, windowMs: 60000 })) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    if (!verifyWebhookSignature(req.headers || {})) {
      return res.status(401).json({ error: 'Bad webhook signature.' });
    }
    const { event, data } = req.body || {};
    if (event !== 'charge.completed' || !data?.tx_ref) return res.status(200).end();
    const stored = await loadPendingTx(String(data.tx_ref));
    if (!stored || stored.status === 'confirmed' || stored.status === 'failed') {
      return res.status(200).end(); // unknown or duplicate — ack, change nothing
    }
    const verified = await verifyFlwTransaction(stored.flwId);
    if (verified.status === 'confirmed' || verified.status === 'failed') {
      await savePendingTx({ ...stored, status: verified.status, verifiedAmount: verified.amount, verifiedAt: new Date().toISOString() });
    }
    return res.status(200).end();
  } catch (error) {
    console.error('MoMo webhook error:', error?.message || error);
    return res.status(200).end(); // never fail loudly — Flutterwave retries
  }
}
