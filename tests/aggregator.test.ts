import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  AggregatorError,
  aggConfig,
  buildUgCharge,
  flwNetwork,
  mapFlwStatus,
  newTxRef,
  normalizeUgMsisdn,
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
});
