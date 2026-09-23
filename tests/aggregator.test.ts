import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  AggregatorError,
  aggConfig,
  buildUgCharge,
  flwNetwork,
  initiateUgCharge,
  mapFlwStatus,
  newTxRef,
  normalizeUgMsisdn,
  verifyFlwTransaction,
  verifyWebhookSignature,
} from '../lib/aggregator.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('flutterwave aggregator contract', () => {
  it('builds a valid UGX charge payload', () => {
    const p = buildUgCharge({
      phone: '0772 123456',
      network: 'MTN',
      amount: 50000,
      email: 'x@y.z',
      fullname: 'Sarah Nabukalu',
      txRef: 'flw-test-12345678',
      meta: { groupId: 'g1' },
    });
    expect(p).toMatchObject({
      tx_ref: 'flw-test-12345678',
      amount: 50000,
      currency: 'UGX',
      network: 'MTN',
      phone_number: '256772123456',
    });
  });

  it('maps Airtel to the provider network code', () => {
    expect(flwNetwork('Airtel')).toBe('AIRTEL');
    expect(() => flwNetwork('Vodafone')).toThrowError(AggregatorError);
  });

  it('rejects bad phones and amounts before any network call', () => {
    expect(() => normalizeUgMsisdn('123')).toThrowError(/valid Ugandan/);
    expect(() =>
      buildUgCharge({ phone: '0772123456', network: 'MTN', amount: 100, txRef: 'flw-test-12345678' })
    ).toThrowError(/500/);
    expect(() =>
      buildUgCharge({ phone: '0772123456', network: 'MTN', amount: 50000, txRef: 'short' })
    ).toThrowError(/reference/);
  });

  it('maps provider statuses to app states', () => {
    expect(mapFlwStatus('successful')).toBe('confirmed');
    expect(mapFlwStatus('SUCCESSFUL')).toBe('confirmed');
    expect(mapFlwStatus('failed')).toBe('failed');
    expect(mapFlwStatus('cancelled')).toBe('failed');
    expect(mapFlwStatus('pending')).toBe('pending');
    expect(mapFlwStatus('')).toBe('pending');
    expect(mapFlwStatus(undefined)).toBe('pending');
  });

  it('mints unique merchant references', () => {
    const a = newTxRef('grp-x');
    const b = newTxRef('grp-x');
    expect(a).toMatch(/^flw-grp-x-[a-z0-9]+$/);
    expect(a).not.toBe(b);
  });

  it('gates config on the secret key, detects test keys', () => {
    vi.stubEnv('FLW_SECRET_KEY', '');
    expect(aggConfig().enabled).toBe(false);
    vi.stubEnv('FLW_SECRET_KEY', 'FLWSECK_TEST_abc123xyz');
    const c = aggConfig();
    expect(c.enabled).toBe(true);
    expect(c.testMode).toBe(true);
  });

  it('verifies webhook signatures with timing-safe compare', () => {
    vi.stubEnv('FLW_SECRET_HASH', 's3cr3t-hash-value');
    expect(verifyWebhookSignature({ 'verif-hash': 's3cr3t-hash-value' })).toBe(true);
    expect(verifyWebhookSignature({ 'verif-hash': 'wrong' })).toBe(false);
    expect(verifyWebhookSignature({})).toBe(false);
    vi.stubEnv('FLW_SECRET_HASH', '');
    expect(verifyWebhookSignature({ 'verif-hash': 'anything' })).toBe(false);
  });

  it('accepts id-less UG charge responses (tx_ref is authoritative)', async () => {
    vi.stubEnv('FLW_SECRET_KEY', 'FLWSECK_TEST_abc123xyz');
    const calls: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      calls.push(String(url));
      return {
        ok: true,
        text: async () =>
          JSON.stringify({
            status: 'success',
            message: 'Charge initiated',
            meta: { authorization: { mode: 'redirect', redirect: 'https://pay.example/confirm/1' } },
          }),
      } as any;
    });
    const started = await initiateUgCharge({
      phone: '0772123456',
      network: 'MTN',
      amount: 50000,
      txRef: 'flw-test-abcdef123456',
    });
    expect(started.status).toBe('pending');
    expect(started.flwId).toBeNull();
    expect(started.txRef).toBe('flw-test-abcdef123456');
    expect(started.redirectUrl).toBe('https://pay.example/confirm/1');
    vi.unstubAllGlobals();
  });

  it('verifies by tx_ref when no numeric id exists', async () => {
    vi.stubEnv('FLW_SECRET_KEY', 'FLWSECK_TEST_abc123xyz');
    const calls: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      calls.push(String(url));
      return {
        ok: true,
        text: async () =>
          JSON.stringify({
            status: 'success',
            data: { id: 3091255, tx_ref: 'flw-test-abcdef123456', amount: 50000, currency: 'UGX', status: 'successful' },
          }),
      } as any;
    });
    const v = await verifyFlwTransaction(null, 'flw-test-abcdef123456');
    expect(calls[0]).toContain('verify_by_reference?tx_ref=flw-test-abcdef123456');
    expect(v.status).toBe('confirmed');
    expect(v.amount).toBe(50000);
    vi.unstubAllGlobals();
  });
});
