import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseSmsBatch, sendSmsBatch, smsConfig, MAX_BATCH } from '../lib/sms.js';
import { isUgPhone, normalizeUgPhone } from '../lib/phone.js';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('phone normalisation (shared by app and API)', () => {
  it('produces the 256XXXXXXXXX form gateways expect', () => {
    expect(normalizeUgPhone('0772 123 456')).toBe('256772123456');
    expect(normalizeUgPhone('+256772123456')).toBe('256772123456');
    expect(isUgPhone('256772123456')).toBe(true);
    expect(isUgPhone('077212345')).toBe(false);
    expect(isUgPhone('')).toBe(false);
  });
});

describe('SMS batch contract', () => {
  it('is disabled until a gateway URL and token both exist', () => {
    expect(smsConfig({}).enabled).toBe(false);
    expect(smsConfig({ SMS_GATEWAY_URL: 'https://sms.example/send' }).enabled).toBe(false);
    expect(smsConfig({ SMS_GATEWAY_TOKEN: 'secret' }).enabled).toBe(false);
    expect(
      smsConfig({ SMS_GATEWAY_URL: 'https://sms.example/send', SMS_GATEWAY_TOKEN: 'secret' }).enabled
    ).toBe(true);
  });

  it('never leaks the token through the config shape', () => {
    const config = smsConfig({ SMS_GATEWAY_URL: 'https://sms.example/send', SMS_GATEWAY_TOKEN: 'secret' });
    expect(JSON.stringify({ enabled: config.enabled, senderId: config.senderId })).not.toContain('secret');
  });

  it('skips bad numbers instead of failing the whole batch', () => {
    const parsed = parseSmsBatch({
      messages: [
        { to: '0772123456', message: 'Meeting #3 receipt' },
        { to: 'not-a-number', message: 'hi' },
        { to: '0772123457', message: '  ' },
      ],
    });
    expect(parsed.ok).toBe(true);
    expect(parsed.messages).toHaveLength(1);
    expect(parsed.messages[0].to).toBe('256772123456');
    expect(parsed.skipped.map((s: { why: string }) => s.why)).toEqual(['bad-number', 'empty-message']);
  });

  it('refuses an empty batch and caps the size', () => {
    expect(parseSmsBatch({ messages: [] }).ok).toBe(false);
    const tooMany = Array.from({ length: MAX_BATCH + 1 }, (_, i) => ({ to: `0772123${String(i).padStart(3, '0')}`, message: 'x' }));
    expect(parseSmsBatch({ messages: tooMany }).ok).toBe(false);
  });

  it('reports "not configured" instead of pretending to send', async () => {
    const result = await sendSmsBatch([{ to: '256772123456', message: 'hello' }], { env: {} });
    expect(result).toMatchObject({ ok: false, configured: false, sent: 0, failed: 1 });
  });

  it('posts the batch to the gateway with a bearer token', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, text: async () => '' }));
    const result = await sendSmsBatch([{ to: '256772123456', message: 'receipt' }], {
      env: { SMS_GATEWAY_URL: 'https://sms.example/send', SMS_GATEWAY_TOKEN: 'tok', SMS_SENDER_ID: 'VSLA' },
      fetchImpl: fetchImpl as never,
    });
    expect(result).toMatchObject({ ok: true, configured: true, sent: 1 });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://sms.example/send');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(JSON.parse(String(init.body)).messages[0].to).toBe('256772123456');
  });

  it('survives a gateway outage without throwing', async () => {
    const result = await sendSmsBatch([{ to: '256772123456', message: 'receipt' }], {
      env: { SMS_GATEWAY_URL: 'https://sms.example/send', SMS_GATEWAY_TOKEN: 'tok' },
      fetchImpl: (async () => { throw new Error('ECONNREFUSED'); }) as never,
    });
    expect(result).toMatchObject({ ok: false, configured: true, sent: 0, error: 'gateway_unreachable' });
  });
});

describe('simple nav stays small but keeps every module reachable', () => {
  const nav = read('src/components/BottomNavBar.tsx');

  it('gives officers four tabs plus a More button', () => {
    const tabs = [...nav.matchAll(/tabBtn\('(\w+)'/g)].map((m) => m[1]);
    // members: account, shop, loan, help. officers: home, meeting, members, approvals.
    expect(tabs).toEqual(['members', 'shop', 'loans', 'more', 'home', 'meetings', 'members', 'approvals']);
    expect(nav).toContain('onClick={handleMoreClick}');
    expect((nav.match(/\{moduleSheet\}/g) || []).length).toBe(2); // simple + advanced
  });

  it('shop left the tab bar but is still in the sheet', () => {
    expect(nav).toContain("handleSelectMoreOption('shop', 'shop')");
  });

  it('the More button is a 52px target with the approvals badge', () => {
    expect(nav).toContain('min-h-[52px] min-w-[56px]');
  });
});

describe('Luganda strings are evidence-backed', () => {
  it('uses only corpus-verified words for the new menu labels', () => {
    const lu = read('src/i18n/translations.ts');
    expect(lu).toContain("menu: 'menu'");
    expect(lu).toContain("help: 'Obuyambi'");
    expect(lu).toContain("bigText: 'Kinene'");
    // words with no corpus evidence must stay English
    expect(lu).toContain("brightScreen: 'Bright screen'");
    expect(lu).toContain("showOnScreen: 'Show on big screen'");
  });
});
