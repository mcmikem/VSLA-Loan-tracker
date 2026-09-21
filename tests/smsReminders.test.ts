import { describe, expect, it } from 'vitest';
import {
  buildBalanceSnapshot,
  buildFraudReportMessage,
  buildMeetingReminder,
  buildRepaymentReminder,
  isSingleSms,
  normalizeUgPhone,
  smsHref,
  waHref,
} from '../src/utils/smsReminders';

describe('sms reminders', () => {
  it('normalizes UG phones for wa.me', () => {
    expect(normalizeUgPhone('+256 772 123456')).toBe('256772123456');
    expect(normalizeUgPhone('0772 123456')).toBe('256772123456');
    expect(normalizeUgPhone('772123456')).toBe('256772123456');
    expect(normalizeUgPhone('')).toBe('');
  });

  it('builds short repayment reminders in both languages', () => {
    const m = { id: 'm1', no: '01', name: 'Sarah Nabukalu', phone: '+256772123456', loanBalance: 60000 };
    const en = buildRepaymentReminder(m, { groupName: 'Bakwata', meetingNo: 29, lang: 'EN' });
    const lu = buildRepaymentReminder(m, { groupName: 'Bakwata', meetingNo: 29, lang: 'LU' });
    expect(en).toContain('Sarah');
    expect(en).toContain('UGX 60,000');
    expect(en).toContain('Meeting #29');
    expect(lu).toContain('obbanja');
    expect(lu).toContain('UGX 60,000');
    expect(isSingleSms(en)).toBe(true);
    expect(isSingleSms(lu)).toBe(true);
  });

  it('meeting reminder fits one SMS', () => {
    const t = buildMeetingReminder({ groupName: 'Bakwata', meetingNo: 29, lang: 'LU' });
    expect(isSingleSms(t)).toBe(true);
  });

  it('balance snapshot carries all three funds', () => {
    const m = { id: 'm2', no: '02', name: 'Joseph Mukasa', phone: '0772123456', loanBalance: 40000, sharesTotal: 320000, welfareBalance: 5000 };
    const t = buildBalanceSnapshot(m, { groupName: 'Bakwata', lang: 'EN' });
    expect(t).toContain('UGX 320,000');
    expect(t).toContain('UGX 40,000');
    expect(t).toContain('UGX 5,000');
  });

  it('hrefs encode body and phone', () => {
    const s = smsHref('+256772123456', 'Hello Sarah');
    expect(s.startsWith('sms:')).toBe(true);
    expect(s).toContain(encodeURIComponent('Hello Sarah'));
    const w = waHref('0772123456', 'Hello Sarah');
    expect(w).toBe(`https://wa.me/256772123456?text=${encodeURIComponent('Hello Sarah')}`);
  });

  it('fraud report carries group context, stays anonymous by default', () => {
    const en = buildFraudReportMessage({
      groupName: 'Bakwata', boxIdentifier: 'BOX-01', category: 'missing',
      details: '50000 missing after Friday', lang: 'EN',
    });
    expect(en).toContain('Bakwata');
    expect(en).toContain('BOX-01');
    expect(en).toContain('Anonymous member');
    expect(en).toContain('50000 missing after Friday');
    const lu = buildFraudReportMessage({
      groupName: 'Bakwata', boxIdentifier: 'BOX-01', category: 'leader',
      details: '', reporterName: 'Sarah', lang: 'LU',
    });
    expect(lu).toContain('Sarah');
    expect(lu).toContain('Omukulu');
  });
});
