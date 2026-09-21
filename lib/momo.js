/**
 * Live Uganda mobile-money collection helpers.
 *
 * Provider secrets stay server-side. The browser only receives a provider
 * reference and a pending/confirmed/failed status.
 */
import crypto from 'node:crypto';
import { aggConfig, initiateUgCharge, loadPendingTx, newTxRef, savePendingTx, verifyFlwTransaction } from './aggregator.js';

const REQUEST_TIMEOUT_MS = 15000;
const TOKEN_MARGIN_MS = 30000;
const tokenCache = globalThis.__bakwataMomoTokenCache || (globalThis.__bakwataMomoTokenCache = new Map());

function env(name, fallback = '') {
  return String(process.env[name] || fallback).trim();
}

export class MomoProviderError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'MomoProviderError';
    this.status = status;
  }
}

export function getMomoConfig() {
  const mtnConfigured = Boolean(
    env('MTN_MOMO_SUBSCRIPTION_KEY') &&
      env('MTN_MOMO_API_USER_ID') &&
      env('MTN_MOMO_API_KEY')
  );
  const airtelConfigured = Boolean(env('AIRTEL_CLIENT_ID') && env('AIRTEL_CLIENT_SECRET'));
  const agg = aggConfig();
  const liveRequested = env('MOMO_LIVE') === '1';
  return {
    mode: liveRequested && (agg.enabled || mtnConfigured || airtelConfigured) ? 'live' : 'sandbox',
    liveRequested,
    mtnConfigured,
    airtelConfigured,
    aggregatorEnabled: agg.enabled,
    aggregatorTestMode: agg.testMode,
    provider: agg.enabled ? 'flutterwave' : 'direct',
    mtnEnvironment: env('MTN_MOMO_ENVIRONMENT', 'sandbox'),
    airtelEnvironment: env('AIRTEL_ENVIRONMENT', 'sandbox'),
  };
}

export function isSupportedNetwork(network) {
  return network === 'MTN' || network === 'Airtel';
}

export function normalizeUgandaMsisdn(input) {
  const raw = String(input || '').trim();
  const digits = raw.replace(/\D/g, '');
  const normalized = digits.startsWith('0') ? `256${digits.slice(1)}` : digits;
  if (!/^256\d{9}$/.test(normalized)) {
    throw new MomoProviderError('Use a valid Ugandan mobile number.', 400);
  }
  return normalized;
}

export function parseCollectionInput(payload = {}) {
  const network = payload.network;
  if (!isSupportedNetwork(network)) {
    throw new MomoProviderError('Choose MTN or Airtel.', 400);
  }
  const phone = normalizeUgandaMsisdn(payload.phone);
  const amount = Number(String(payload.amount ?? '').replace(/[,\s]/g, ''));
  if (!Number.isInteger(amount) || amount < 500 || amount > 5000000) {
    throw new MomoProviderError('Amount must be a whole number between UGX 500 and UGX 5,000,000.', 400);
  }
  const memberName = String(payload.memberName || '').trim();
  const purpose = String(payload.purpose || '').trim();
  if (memberName.length < 2 || memberName.length > 120) {
    throw new MomoProviderError('Member name is required.', 400);
  }
  if (purpose.length < 2 || purpose.length > 160) {
    throw new MomoProviderError('Transaction purpose is required.', 400);
  }
  return { network, phone, amount, memberName, purpose };
}

function providerBase(network) {
  if (network === 'MTN') {
    return env('MTN_MOMO_ENVIRONMENT', 'sandbox').toLowerCase() === 'production'
      ? 'https://momodeveloper.mtn.com'
      : 'https://sandbox.momodeveloper.mtn.com';
  }
  return env('AIRTEL_ENVIRONMENT', 'sandbox').toLowerCase() === 'production'
    ? 'https://openapi.airtel.africa'
    : 'https://openapiuat.airtel.africa';
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
      throw new MomoProviderError('Mobile-money provider timed out. No money was taken.', 504);
    }
    throw new MomoProviderError('Mobile-money provider is unreachable. No money was taken.', 502);
  } finally {
    clearTimeout(timeout);
  }
}

function providerFailure(network, response) {
  const code = response?.status ? ` (${response.status})` : '';
  return new MomoProviderError(`${network} mobile-money request was rejected${code}. No money was taken.`, 502);
}

async function getMtnToken() {
  const cacheKey = `mtn:${env('MTN_MOMO_ENVIRONMENT', 'sandbox')}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + TOKEN_MARGIN_MS) return cached.value;

  const basic = Buffer.from(`${env('MTN_MOMO_API_USER_ID')}:${env('MTN_MOMO_API_KEY')}`).toString('base64');
  const { response, payload } = await fetchJson(`${providerBase('MTN')}/collection/token/`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Ocp-Apim-Subscription-Key': env('MTN_MOMO_SUBSCRIPTION_KEY'),
      'X-Target-Environment': env('MTN_MOMO_ENVIRONMENT', 'sandbox'),
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok || !payload.access_token) throw providerFailure('MTN', response);

  const expiresIn = Number(payload.expires_in) || 3600;
  tokenCache.set(cacheKey, { value: payload.access_token, expiresAt: Date.now() + expiresIn * 1000 });
  return payload.access_token;
}

async function getAirtelToken() {
  const cacheKey = `airtel:${env('AIRTEL_ENVIRONMENT', 'sandbox')}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + TOKEN_MARGIN_MS) return cached.value;

  const { response, payload } = await fetchJson(`${providerBase('Airtel')}/auth/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env('AIRTEL_CLIENT_ID'),
      client_secret: env('AIRTEL_CLIENT_SECRET'),
      grant_type: 'client_credentials',
    }),
  });
  if (!response.ok || !payload.access_token) throw providerFailure('Airtel', response);

  const expiresIn = Number(payload.expires_in) || 3600;
  tokenCache.set(cacheKey, { value: payload.access_token, expiresAt: Date.now() + expiresIn * 1000 });
  return payload.access_token;
}

function newReference() {
  return crypto.randomUUID();
}

async function createMtnCollection(input) {
  const referenceId = newReference();
  const token = await getMtnToken();
  const { response } = await fetchJson(`${providerBase('MTN')}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Reference-Id': referenceId,
      'X-Target-Environment': env('MTN_MOMO_ENVIRONMENT', 'sandbox'),
      'Ocp-Apim-Subscription-Key': env('MTN_MOMO_SUBSCRIPTION_KEY'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: String(input.amount),
      currency: 'UGX',
      externalId: referenceId,
      payer: { partyIdType: 'MSISDN', partyId: input.phone },
      payerMessage: input.purpose,
      payeeNote: `Bakwata · ${input.memberName}`,
    }),
  });
  if (!response.ok && response.status !== 202) throw providerFailure('MTN', response);
  return { transactionId: referenceId, provider: 'MTN', status: 'pending', mode: 'live' };
}

async function createAirtelCollection(input) {
  const transactionId = newReference();
  const token = await getAirtelToken();
  const { response } = await fetchJson(`${providerBase('Airtel')}/merchant/v1/payments/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Country': 'UG',
      'X-Currency': 'UGX',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reference: transactionId,
      subscriber: { country: 'UG', currency: 'UGX', msisdn: input.phone },
      transaction: {
        amount: input.amount,
        country: 'UG',
        currency: 'UGX',
        id: transactionId,
      },
    }),
  });
  if (!response.ok) throw providerFailure('Airtel', response);
  return { transactionId, provider: 'Airtel', status: 'pending', mode: 'live' };
}

function simulatedCollection(input) {
  const prefix = input.network === 'Airtel' ? 'SIM-AIRTEL-UG-' : 'SIM-MTN-UG-';
  return {
    transactionId: prefix + Math.floor(100000 + Math.random() * 900000),
    provider: input.network,
    status: 'pending',
    mode: 'sandbox',
  };
}

export async function requestCollection(input, ctx = {}) {
  const config = getMomoConfig();
  if (!config.liveRequested) return simulatedCollection(input);
  // Aggregator first: one integration covers MTN + Airtel, no IP paperwork.
  if (config.aggregatorEnabled) {
    const txRef = newTxRef(ctx.groupId);
    const started = await initiateUgCharge({
      phone: input.phone,
      network: input.network,
      amount: input.amount,
      fullname: input.memberName,
      txRef,
      meta: { groupId: ctx.groupId || null, memberName: input.memberName, purpose: input.purpose },
    });
    await savePendingTx({
      txRef,
      provider: 'flutterwave',
      status: 'pending',
      flwId: started.flwId,
      network: input.network,
      amount: input.amount,
      groupId: ctx.groupId || null,
      memberName: input.memberName,
      purpose: input.purpose,
    });
    return { transactionId: txRef, provider: input.network, via: 'flutterwave', status: 'pending', mode: 'live' };
  }
  if (input.network === 'MTN' && !config.mtnConfigured) {
    throw new MomoProviderError('MTN live keys are not configured. No money was taken.', 503);
  }
  if (input.network === 'Airtel' && !config.airtelConfigured) {
    throw new MomoProviderError('Airtel live keys are not configured. No money was taken.', 503);
  }
  return input.network === 'MTN' ? createMtnCollection(input) : createAirtelCollection(input);
}

function mapMtnStatus(payload) {
  const raw = String(payload?.status || '').toUpperCase();
  if (['SUCCESSFUL', 'SUCCESS', 'COMPLETED'].includes(raw)) return 'confirmed';
  if (['FAILED', 'REJECTED', 'CANCELLED', 'TIMEOUT'].includes(raw)) return 'failed';
  return 'pending';
}

function mapAirtelStatus(payload) {
  const status = payload?.status || {};
  const raw = String(status.status || status.message || '').toUpperCase();
  const code = String(status.response_code || '').toUpperCase();
  if (status.success === true || ['SUCCESS', 'SUCCESSFUL', 'COMPLETED'].includes(raw) || ['200', 'DP00800001000'].includes(code)) {
    return 'confirmed';
  }
  if (raw.includes('PENDING') || ['DP00800001006', 'DP00800001007'].includes(code)) return 'pending';
  if (status.success === false || raw.includes('FAIL') || raw.includes('REJECT') || raw.includes('CANCEL')) return 'failed';
  return 'pending';
}

export async function collectionStatus(network, transactionId) {
  // Aggregator references first (own format, store-routed) — then legacy direct.
  const pending = await loadPendingTx(String(transactionId || ''));
  if (pending && pending.provider === 'flutterwave') {
    if (pending.status === 'confirmed' || pending.status === 'failed') {
      return { transactionId: pending.txRef, provider: pending.network || network, via: 'flutterwave', status: pending.status, mode: 'live' };
    }
    const verified = await verifyFlwTransaction(pending.flwId);
    const status = verified.status;
    if (status === 'confirmed' || status === 'failed') {
      await savePendingTx({ ...pending, status, verifiedAmount: verified.amount, verifiedAt: new Date().toISOString() });
    }
    return { transactionId: pending.txRef, provider: pending.network || network, via: 'flutterwave', status, mode: 'live', amount: verified.amount };
  }
  if (!isSupportedNetwork(network) || !/^[a-f0-9-]{20,80}$/i.test(String(transactionId || ''))) {
    throw new MomoProviderError('Invalid mobile-money transaction reference.', 400);
  }
  const config = getMomoConfig();
  if (!config.liveRequested) return { transactionId, provider: network, status: 'pending', mode: 'sandbox' };

  if (network === 'MTN') {
    if (!config.mtnConfigured) throw new MomoProviderError('MTN live keys are not configured.', 503);
    const token = await getMtnToken();
    const { response, payload } = await fetchJson(`${providerBase('MTN')}/collection/v1_0/requesttopay/${encodeURIComponent(transactionId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Target-Environment': env('MTN_MOMO_ENVIRONMENT', 'sandbox'),
        'Ocp-Apim-Subscription-Key': env('MTN_MOMO_SUBSCRIPTION_KEY'),
      },
    });
    if (!response.ok) throw providerFailure('MTN', response);
    return { transactionId, provider: 'MTN', status: mapMtnStatus(payload), mode: 'live' };
  }

  if (!config.airtelConfigured) throw new MomoProviderError('Airtel live keys are not configured.', 503);
  const token = await getAirtelToken();
  const { response, payload } = await fetchJson(`${providerBase('Airtel')}/standard/v1/payments/${encodeURIComponent(transactionId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Country': 'UG',
      'X-Currency': 'UGX',
    },
  });
  if (!response.ok) throw providerFailure('Airtel', response);
  return { transactionId, provider: 'Airtel', status: mapAirtelStatus(payload), mode: 'live' };
}
