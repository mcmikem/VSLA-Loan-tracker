/**
 * SMS / WhatsApp reminders — offline-first, zero-cost.
 * No gateway: we build pre-written messages and open the phone's own
 * SMS / WhatsApp app via `sms:` / `wa.me` links. Works with zero internet
 * for SMS, which is what matters for kabiriti phones.
 *
 * When a gateway IS configured on the server (lib/sms.js) the meeting-receipt
 * card can send a whole batch in one tap; the links stay as the fallback.
 */
import { normalizeUgPhone as normalize } from '../../lib/phone.js';

export type ReminderLang = 'EN' | 'LU';
export interface ReminderMember {
  id: string;
  no: string;
  name: string;
  phone: string;
  loanBalance: number;
  sharesTotal?: number;
  welfareBalance?: number;
}

const ugx = (n: number) => `UGX ${Math.max(0, Math.floor(n || 0)).toLocaleString('en-US')}`;

export function normalizeUgPhone(raw: string): string {
  return normalize(raw);
}

export function smsHref(phone: string, body: string): string {
  const p = (phone || '').replace(/\s/g, '');
  // iOS uses & for body separator when number present; Android uses ? — '?' works on both for single recipient.
  return p ? `sms:${p}?body=${encodeURIComponent(body)}` : `sms:?body=${encodeURIComponent(body)}`;
}

export function waHref(phone: string, body: string): string {
  const n = normalizeUgPhone(phone);
  const text = encodeURIComponent(body);
  return n ? `https://wa.me/${n}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function buildMeetingReminder(opts: {
  groupName: string;
  meetingNo: number;
  lang: ReminderLang;
}): string {
  const { groupName, meetingNo, lang } = opts;
  if (lang === 'LU') {
    return `[${groupName}] Okujjukiza: Olukuŋŋaana #${meetingNo} lujja ku Lwokutaano 4pm. Leeta ppaasibuku + emigabo gyo.`;
  }
  return `[${groupName}] Reminder: Meeting #${meetingNo} is this Friday 4PM. Bring your passbook + shares.`;
}

export function buildRepaymentReminder(
  m: ReminderMember,
  opts: { groupName: string; meetingNo: number; lang: ReminderLang }
): string {
  const first = m.name.split(' ')[0] || m.name;
  const amt = ugx(m.loanBalance);
  if (opts.lang === 'LU') {
    return `[${opts.groupName}] ${first}, obbanja bwo bwa ${amt}. Olukuŋŋaana #${opts.meetingNo} Lwokutaano 4pm. Leeta okusasula + ppaasibuku. Webale!`;
  }
  return `[${opts.groupName}] Hi ${first}, your loan balance is ${amt}. Meeting #${opts.meetingNo} Friday 4PM. Bring repayment + passbook. Thank you!`;
}

export function buildBalanceSnapshot(
  m: ReminderMember,
  opts: { groupName: string; lang: ReminderLang }
): string {
  // For kabiriti phones: secretary sends the member their full position on request.
  const saved = ugx(m.sharesTotal || 0);
  const loan = ugx(m.loanBalance || 0);
  const wel = ugx(m.welfareBalance || 0);
  if (opts.lang === 'LU') {
    return `[${opts.groupName}] ${m.name} (#${m.no}): Oterekedde ${saved}, bbanja ${loan}, obuyambi ${wel}. Buuza omuwandiisi singa waliwo ensobi.`;
  }
  return `[${opts.groupName}] ${m.name} (#${m.no}): Saved ${saved}, loan ${loan}, welfare ${wel}. Ask the secretary if anything looks wrong.`;
}

/** Keep SMS under one segment (~160 chars GSM) where possible; report length. */
export function isSingleSms(text: string): boolean {
  return text.length <= 160;
}

/**
 * Meeting receipt for one member. Chomoka (Ensibuuko, Uganda) sends an SMS
 * receipt to every member after a meeting; this is the same idea, built on
 * the phone's own SMS app so it costs nothing and works with no internet.
 * Short on purpose: three numbers, then "ask if wrong".
 */
export function buildMeetingReceipt(
  m: ReminderMember,
  opts: { groupName: string; meetingNo: number; boxTotal: number; lang: ReminderLang }
): string {
  const first = m.name.split(' ')[0] || m.name;
  const saved = ugx(m.sharesTotal || 0);
  const loan = ugx(m.loanBalance || 0);
  const wel = ugx(m.welfareBalance || 0);
  if (opts.lang === 'LU') {
    return `[${opts.groupName}] Olukuŋŋaana #${opts.meetingNo}: ${first}, otiisa ${saved}, bbanja ${loan}, obuyambi ${wel}. Sanduuko ${ugx(opts.boxTotal)}. Bw'ekigakanyo, buuza omuwandiisi.`;
  }
  return `[${opts.groupName}] Meeting #${opts.meetingNo}: ${first}, saved ${saved}, loan ${loan}, welfare ${wel}. Box ${ugx(opts.boxTotal)}. If wrong, ask the secretary.`;
}

export type FraudCategory = 'missing' | 'balance' | 'leader' | 'app' | 'other';

export const FRAUD_CATEGORIES: { id: FraudCategory; en: string; lu: string }[] = [
  { id: 'missing', en: 'Missing money', lu: 'Ensimbi ezibula' },
  { id: 'balance', en: 'Wrong balance', lu: 'Balance si ntuufu' },
  { id: 'leader', en: 'Leader problem', lu: 'Omukulu' },
  { id: 'app', en: 'App not working', lu: 'App — tekoze' },
  { id: 'other', en: 'Something else', lu: 'Ekirala' },
];

/**
 * Confidential fraud report sent OUT of the phone (WhatsApp to support).
 * Deliberately leaves no local trace — no audit entry, no draft — so a
 * report about a leader can't be found on the leader's phone.
 */
export function buildFraudReportMessage(opts: {
  groupName: string;
  boxIdentifier: string;
  category: FraudCategory;
  details: string;
  reporterName?: string;
  lang: ReminderLang;
}): string {
  const cat =
    FRAUD_CATEGORIES.find((c) => c.id === opts.category) || FRAUD_CATEGORIES[4];
  const who = opts.reporterName?.trim() || (opts.lang === 'LU' ? 'Member (erinnya likwekeddwa)' : 'Anonymous member');
  const details = opts.details.trim().slice(0, 500);
  if (opts.lang === 'LU') {
    return `VSLA UG — OKULOOPA (kyama)\nEkibiina: ${opts.groupName} (${opts.boxIdentifier})\nEnsonga: ${cat.lu}\nOmutumya: ${who}\nEbisingawo: ${details || '—'}`;
  }
  return `VSLA UG — FRAUD REPORT (confidential)\nGroup: ${opts.groupName} (${opts.boxIdentifier})\nIssue: ${cat.en}\nFrom: ${who}\nDetails: ${details || '—'}`;
}
