import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  collectionStatus,
  getMomoConfig,
  normalizeUgandaMsisdn,
  parseCollectionInput,
  requestCollection,
} from '../lib/momo.js';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('live MoMo contracts', () => {
  it('normalizes Ugandan numbers without exposing provider credentials', () => {
    expect(normalizeUgandaMsisdn('0772-123-456')).toBe('256772123456');
    expect(parseCollectionInput({
      network: 'Airtel',
      phone: '+256 701 987654',
      amount: '50,000',
      memberName: 'Sarah Nabukalu',
      purpose: 'Loan repayment',
    })).toMatchObject({ network: 'Airtel', phone: '256701987654', amount: 50000 });
  });

  it('keeps requests in simulation unless live mode is explicitly enabled', async () => {
    vi.stubEnv('MOMO_LIVE', '0');
    const result = await requestCollection(parseCollectionInput({
      network: 'MTN', phone: '0772123456', amount: 50000, memberName: 'Member', purpose: 'Shares',
    }));
    expect(result).toMatchObject({ provider: 'MTN', status: 'pending', mode: 'sandbox' });
  });

  it('starts MTN collection and only reports pending before status confirmation', async () => {
    vi.stubEnv('MOMO_LIVE', '1');
    vi.stubEnv('MTN_MOMO_ENVIRONMENT', 'test-mtn');
    vi.stubEnv('MTN_MOMO_SUBSCRIPTION_KEY', 'subscription');
    vi.stubEnv('MTN_MOMO_API_USER_ID', 'api-user');
    vi.stubEnv('MTN_MOMO_API_KEY', 'api-key');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'mtn-token', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestCollection(parseCollectionInput({
      network: 'MTN', phone: '0772123456', amount: 50000, memberName: 'Member', purpose: 'Shares',
    }));

    expect(result).toMatchObject({ provider: 'MTN', status: 'pending', mode: 'live' });
    expect(fetchMock.mock.calls[1][0]).toContain('/collection/v1_0/requesttopay');
  });

  it('maps a confirmed Airtel status to confirmed', async () => {
    vi.stubEnv('MOMO_LIVE', '1');
    vi.stubEnv('AIRTEL_ENVIRONMENT', 'test-airtel');
    vi.stubEnv('AIRTEL_CLIENT_ID', 'client');
    vi.stubEnv('AIRTEL_CLIENT_SECRET', 'secret');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'airtel-token', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: { success: true, response_code: 'DP00800001000' } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await collectionStatus('Airtel', '12345678-1234-1234-1234-123456789012');
    expect(result).toMatchObject({ provider: 'Airtel', status: 'confirmed', mode: 'live' });
    expect(fetchMock.mock.calls[1][0]).toContain('/standard/v1/payments/');
  });

  it('reports live mode only when live mode and a complete provider config exist', () => {
    vi.stubEnv('MOMO_LIVE', '1');
    vi.stubEnv('MTN_MOMO_SUBSCRIPTION_KEY', 'subscription');
    vi.stubEnv('MTN_MOMO_API_USER_ID', 'api-user');
    vi.stubEnv('MTN_MOMO_API_KEY', 'api-key');
    vi.stubEnv('AIRTEL_CLIENT_ID', 'client');
    vi.stubEnv('AIRTEL_CLIENT_SECRET', 'secret');
    expect(getMomoConfig()).toMatchObject({ mode: 'live', mtnConfigured: true, airtelConfigured: true });
  });
});
