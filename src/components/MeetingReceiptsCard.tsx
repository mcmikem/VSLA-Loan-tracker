import React, { useState } from 'react';
import { Language, Member } from '../types';
import { buildMeetingReceipt, smsHref, waHref } from '../utils/smsReminders';
import { sendSmsBatchRemote } from '../utils/api';

interface MeetingReceiptsCardProps {
  members: Member[];
  groupName: string;
  meetingNo: number;
  boxTotal: number;
  language?: Language;
  groupId?: string;
}

/**
 * Chomoka-style receipts: after the box is sealed, every member gets their own
 * SMS with their numbers. No gateway, no cost — the phone's SMS app opens with
 * the message ready, so it works on a kabiriti phone with no data.
 * Progress is tracked on screen so the secretary can see who is left.
 */
export const MeetingReceiptsCard: React.FC<MeetingReceiptsCardProps> = ({
  members,
  groupName,
  meetingNo,
  boxTotal,
  language = 'EN',
  groupId = '',
}) => {
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bulkNote, setBulkNote] = useState<string | null>(null);
  const lu = language === 'LU';

  const withPhone = members.filter((m) => (m.phone || '').trim().length > 0);
  const withoutPhone = members.length - withPhone.length;
  const sentCount = withPhone.filter((m) => sent[m.id]).length;

  if (withPhone.length === 0) {
    return (
      <section className="bg-surface-card border border-border-strong rounded-xl p-3 space-y-1.5 text-left">
        <h3 className="text-xs font-bold text-primary flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">sms</span>
          {lu ? 'Sindika SMS' : 'Send receipts by SMS'}
        </h3>
        <p className="text-[11px] text-text-muted">
          {lu
            ? 'Tewali kizimbe ekyoobiddwa. Won\'eza oluyimirizako ku nsi oluyimirizako?'
            : 'No member has a phone number saved yet. Add them in Members so every member gets their own receipt.'}
        </p>
      </section>
    );
  }

  const receiptFor = (m: Member) =>
    buildMeetingReceipt(
      {
        id: m.id,
        no: m.no,
        name: m.name,
        phone: m.phone,
        loanBalance: m.loanBalance,
        sharesTotal: m.sharesTotal,
        welfareBalance: m.welfareBalance,
      },
      { groupName, meetingNo, boxTotal, lang: language }
    );

  return (
    <section className="bg-surface-card border border-border-strong rounded-xl p-3 space-y-2 text-left">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-primary flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">sms</span>
          {lu ? 'Sindika SMS' : 'Send receipts by SMS'}
        </h3>
        <span className="text-[11px] font-bold text-text-muted">
          {sentCount}/{withPhone.length} {lu ? 'tumiddwa' : 'sent'}
        </span>
      </div>
      <p className="text-[11px] text-text-muted">
        {lu
          ? 'Buli omu akaseka. Omusango ugenda, oyimiriza omuwandiisi okuteekeka buli omu n\'aba.'
          : 'One tap per member opens SMS with their numbers already written. The secretary keeps the phone.'}
      </p>

      <div className="max-h-64 overflow-y-auto divide-y divide-border-line border border-border-line rounded-lg">
        {withPhone.map((m) => {
          const body = receiptFor(m);
          const isSent = !!sent[m.id];
          return (
            <div key={m.id} className="flex items-center gap-2 p-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-primary truncate">
                  {m.name} <span className="font-mono text-text-muted">#{m.no}</span>
                </p>
                <p className="text-[10px] font-mono text-text-muted truncate">{m.phone}</p>
              </div>
              <a
                href={smsHref(m.phone, body)}
                onClick={() => setSent((p) => ({ ...p, [m.id]: true }))}
                className={`min-h-[44px] px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 active:scale-95 ${
                  isSent ? 'bg-status-ok-bg text-status-ok-tx' : 'bg-primary text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{isSent ? 'check_circle' : 'sms'}</span>
                {isSent ? (lu ? 'Yatumiddwa' : 'Sent') : 'SMS'}
              </a>
              <a
                href={waHref(m.phone, body)}
                onClick={() => setSent((p) => ({ ...p, [m.id]: true }))}
                className="min-h-[44px] px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 bg-[#DCFCE7] text-[#166534] border border-[#86efac] active:scale-95"
              >
                WA
              </a>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || sentCount === withPhone.length}
          onClick={async () => {
            setBusy(true);
            setBulkNote(null);
            const result = await sendSmsBatchRemote({
              groupId,
              messages: withPhone.map((m) => ({ to: m.phone, message: receiptFor(m) })),
            });
            setBusy(false);
            if (result.ok) {
              setSent(Object.fromEntries(withPhone.map((m) => [m.id, true])));
              setBulkNote(
                lu ? `${result.sent} tumiddwa.` : `Sent to ${result.sent || 0} member(s) by SMS.`
              );
            } else if (result.notConfigured) {
              setBulkNote(
                lu
                  ? 'Tewali SMS gateway. Kansa SMS ku nsi oluza ku buli omu.'
                  : 'No SMS gateway on this server — use the SMS button under each member, one at a time.'
              );
            } else {
              setBulkNote(result.error || (lu ? 'Kikozese buli.' : 'Could not send. Try again.'));
            }
          }}
          className="flex-1 min-h-[52px] rounded-lg bg-[#006d30] text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-[0.99] disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[18px]">{busy ? 'progress_activity' : 'send'}</span>
          {busy ? (lu ? 'Kitumira…' : 'Sending…') : lu ? 'Sindika SMS bonna' : 'Send all by SMS'}
        </button>
        <button
          type="button"
          onClick={async () => {
            const all = withPhone.map(receiptFor).join('\n\n');
            try {
              await navigator.clipboard?.writeText(all);
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            } catch {
              setCopied(false);
            }
          }}
          className="min-h-[52px] px-3 rounded-lg bg-surface-container text-primary border border-border-strong font-bold text-xs flex items-center justify-center gap-1.5 active:scale-[0.99]"
        >
          <span className="material-symbols-outlined text-[18px]">{copied ? 'check' : 'content_copy'}</span>
          {copied ? (lu ? 'Kikiri ku disimu' : 'Copied') : lu ? 'Kikira bonna' : 'Copy all'}
        </button>
        <button
          type="button"
          onClick={() => setSent(Object.fromEntries(withPhone.map((m) => [m.id, true])))}
          className="min-h-[52px] px-3 rounded-lg bg-surface-card text-primary border border-border-strong font-bold text-xs active:scale-[0.99]"
        >
          {lu ? 'Bonna okumalidde' : 'Mark all done'}
        </button>
      </div>

      {bulkNote && (
        <p
          className={`text-[11px] font-bold ${bulkNote.startsWith('Sent') || bulkNote.includes('tumiddwa') ? 'text-status-ok-tx' : 'text-status-warn-tx'}`}
        >
          {bulkNote}
        </p>
      )}

      {withoutPhone > 0 && (
        <p className="text-[11px] font-bold text-status-warn-tx">
          {lu
            ? `${withoutPhone} tebali kizimbe. Bateekke ku Members.`
            : `${withoutPhone} member(s) have no phone saved — add it in Members.`}
        </p>
      )}
    </section>
  );
};
