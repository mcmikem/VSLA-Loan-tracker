import React, { useMemo, useState } from 'react';
import { Language, Member, ScreenId } from '../types';
import {
  ReminderLang,
  buildBalanceSnapshot,
  buildMeetingReminder,
  buildRepaymentReminder,
  isSingleSms,
  smsHref,
  waHref,
} from '../utils/smsReminders';

interface AudioBroadcastViewProps {
  onNavigate: (screen: ScreenId) => void;
  boxCashBalance?: number;
  meetingNumber?: number;
  membersCount?: number;
  members?: Member[];
  groupName?: string;
  language?: Language;
  onReminderLogged?: (memberId: string, channel: 'SMS' | 'WhatsApp', kind: 'repayment' | 'balance' | 'meeting') => void;
}

export const AudioBroadcastView: React.FC<AudioBroadcastViewProps> = ({
  onNavigate,
  boxCashBalance = 1420000,
  meetingNumber = 28,
  membersCount = 30,
  members = [],
  groupName = 'Bakwata',
  language = 'LU',
  onReminderLogged,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'EN' | 'LU'>(language);
  const [reminderKind, setReminderKind] = useState<'repayment' | 'balance'>('repayment');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [bulkCopied, setBulkCopied] = useState(false);

  const debtors = useMemo(() => members.filter((m) => (m.loanBalance || 0) > 0), [members]);
  const lang = selectedLanguage as ReminderLang;
  const nextMeeting = meetingNumber + 1;

  const formattedCash = boxCashBalance.toLocaleString('en-US');

  const lugandaText = `Lukuŋŋaana #${meetingNumber} lwa Bakwata luwedde. Ensimbi eziri mu Akasanduuko ziri UGX ${formattedCash}. Members ${membersCount} baabaddewo. Akasanduuko kasibiddwa.`;

  const englishText = `Bakwata Village Savings meeting number ${meetingNumber} has adjourned. The verified physical cash in the safe box is Uganda Shillings ${formattedCash}. All ${membersCount} members accounted for. The box has been locked with 3 padlocks by the appointed keyholders.`;

  const handleTogglePlay = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      if ('speechSynthesis' in window) {
        const text = selectedLanguage === 'LU' ? lugandaText : englishText;
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.9;
        utter.onend = () => setIsPlaying(false);
        utter.onerror = () => setIsPlaying(false);
        window.speechSynthesis.speak(utter);
      } else {
        setTimeout(() => setIsPlaying(false), 5000);
      }
    } else {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
    }
  };

  const reminderText = buildMeetingReminder({ groupName, meetingNo: nextMeeting, lang });
  const reminderSmsHref = smsHref('', reminderText);
  const reminderWaHref = waHref('', reminderText);

  const messageFor = (m: Member) =>
    reminderKind === 'repayment'
      ? buildRepaymentReminder(m, { groupName, meetingNo: nextMeeting, lang })
      : buildBalanceSnapshot(m, { groupName, lang });

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAll = async () => {
    if (debtors.length === 0) return;
    const all = debtors.map((m) => `To ${m.phone} — ${m.name}:\n${messageFor(m)}`).join('\n\n---\n\n');
    await copyText('__all__', all);
    setBulkCopied(true);
    setTimeout(() => setBulkCopied(false), 2500);
  };

  return (
    <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-14 flex-1 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('meeting_close')}
            className="w-9 h-9 rounded-lg bg-surface-card border border-border-strong flex items-center justify-center text-primary"
            type="button"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <div>
            <h1 className="text-headline-md font-headline-md text-primary font-bold">
              Audio Broadcast & SMS
            </h1>
            <p className="text-xs text-text-muted">Omubazi Ayogera · Community Loudspeaker</p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded bg-status-ok-bg text-status-ok-tx text-xs font-bold font-mono">
          SPEECH SYNTH
        </span>
      </div>

      {/* Voice Readout Player Card */}
      <section className="bg-primary-container text-white rounded-xl p-5 shadow-[0px_4px_12px_rgba(11,61,46,0.18)] space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-primary-fixed flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">record_voice_over</span>
            Meeting #{meetingNumber} Public Readout
          </span>
          <div className="flex gap-1 bg-black/20 p-1 rounded-lg">
            <button
              onClick={() => setSelectedLanguage('LU')}
              className={`px-2.5 py-0.5 rounded text-xs font-bold transition ${
                selectedLanguage === 'LU' ? 'bg-secondary text-white shadow' : 'text-[#c0c8c3]'
              }`}
              type="button"
            >
              Luganda
            </button>
            <button
              onClick={() => setSelectedLanguage('EN')}
              className={`px-2.5 py-0.5 rounded text-xs font-bold transition ${
                selectedLanguage === 'EN' ? 'bg-secondary text-white shadow' : 'text-[#c0c8c3]'
              }`}
              type="button"
            >
              English
            </button>
          </div>
        </div>

        {/* Readout Text Preview */}
        <div className="bg-black/20 rounded-lg p-3 text-xs leading-relaxed text-[#e0e7e3] font-medium border border-white/10">
          <p className="italic">
            "{selectedLanguage === 'LU' ? lugandaText : englishText}"
          </p>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleTogglePlay}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-95 ${
              isPlaying
                ? 'bg-status-bad-tx text-white animate-pulse'
                : 'bg-secondary text-white hover:bg-emerald-700'
            }`}
          >
            <span className="material-symbols-outlined text-xl">
              {isPlaying ? 'stop_circle' : 'volume_up'}
            </span>
            <span>{isPlaying ? 'Pause Readout (Yimiriza)' : 'Broadcast Readout Aloud'}</span>
          </button>
        </div>
      </section>

      {/* Meeting reminders: real SMS / WhatsApp deep links */}
      <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-3">
        <div>
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-secondary text-base">notifications_active</span>
            Meeting Reminders
          </h3>
          <p className="text-[11px] text-text-muted mt-0.5">
            Opens your SMS / WhatsApp with the reminder pre-written — just pick members and send.
          </p>
        </div>
        <div className="p-3 bg-canvas-bg rounded-lg border border-border-line text-xs font-mono space-y-1">
          <div className="text-[10px] text-text-muted uppercase font-bold">Reminder preview:</div>
          <p className="text-on-surface text-[11px]">{reminderText}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <a
            href={reminderSmsHref}
            className="py-2.5 bg-primary-container text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95"
          >
            <span className="material-symbols-outlined text-base">sms</span>
            <span>SMS App</span>
          </a>
          <a
            href={reminderWaHref}
            target="_blank"
            rel="noreferrer"
            className="py-2.5 bg-secondary text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95"
          >
            <span className="material-symbols-outlined text-base">chat</span>
            <span>WhatsApp</span>
          </a>
        </div>
      </section>

      {/* Loan repayment reminders: per-debtor SMS, zero gateway cost */}
      <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary text-base">mark_as_unread</span>
              Repayment Reminders ({debtors.length})
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              {selectedLanguage === 'LU'
                ? 'Buli bbanja lifuna SMS eyakyo — namba ne muwendo biggyiddwa mu kitabo. Tekikosa ssente.'
                : 'Each debtor gets a personal SMS — number and balance pulled from the book. Costs you nothing extra.'}
            </p>
          </div>
        </div>

        <div className="flex bg-canvas-bg p-1 rounded-lg border border-border-line text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setReminderKind('repayment')}
            className={`flex-1 py-1.5 rounded-md transition ${reminderKind === 'repayment' ? 'bg-primary-container text-white shadow-sm' : 'text-text-muted'}`}
          >
            {selectedLanguage === 'LU' ? 'Okujjukiza bbanja' : 'Repayment nudge'}
          </button>
          <button
            type="button"
            onClick={() => setReminderKind('balance')}
            className={`flex-1 py-1.5 rounded-md transition ${reminderKind === 'balance' ? 'bg-primary-container text-white shadow-sm' : 'text-text-muted'}`}
          >
            {selectedLanguage === 'LU' ? 'Ekipimo kya ssente' : 'Balance snapshot'}
          </button>
        </div>

        {debtors.length === 0 ? (
          <p className="text-xs text-status-ok-tx bg-status-ok-bg rounded-lg p-3 font-semibold">
            {selectedLanguage === 'LU' ? 'Tewali bbanja! Byonna birungi!' : 'No outstanding loans. All clean!'}
          </p>
        ) : (
          <>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={copyAll}
                className="px-2.5 py-1.5 bg-canvas-bg border border-border-strong rounded-lg text-[11px] font-bold text-primary active:scale-95"
              >
                {bulkCopied || copiedId === '__all__' ? '✓ Copied all!' : `Copy all ${debtors.length} reminders`}
              </button>
            </div>
            <div className="space-y-2">
              {debtors.map((m) => {
                const text = messageFor(m);
                const single = isSingleSms(text);
                return (
                  <div key={m.id} className="p-3 bg-canvas-bg rounded-lg border border-border-line space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-primary truncate">
                        {m.name} <span className="font-mono text-text-muted">#{m.no}</span>
                      </p>
                      <p className="font-mono text-xs font-bold text-status-bad-tx shrink-0">
                        UGX {(m.loanBalance || 0).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-[11px] font-mono text-on-surface leading-relaxed">{text}</p>
                    <p className="text-[10px] text-text-muted font-mono">
                      To {m.phone || '— no number —'} · {text.length} chars · {single ? '1 SMS' : `${Math.ceil(text.length / 153)} SMS`}
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      <a
                        href={smsHref(m.phone || '', text)}
                        onClick={() => onReminderLogged?.(m.id, 'SMS', reminderKind)}
                        className="py-2 bg-primary-container text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[16px]">sms</span> SMS
                      </a>
                      <a
                        href={waHref(m.phone || '', text)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => onReminderLogged?.(m.id, 'WhatsApp', reminderKind)}
                        className="py-2 bg-secondary text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[16px]">chat</span> WhatsApp
                      </a>
                      <button
                        type="button"
                        onClick={() => copyText(m.id, text)}
                        className="py-2 bg-surface-card border border-border-strong rounded-lg font-bold text-[11px] text-primary active:scale-95"
                      >
                        {copiedId === m.id ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-text-muted leading-relaxed">
              {selectedLanguage === 'LU'
                ? 'SMS eggulawo app yo eya SMS ng’obubaka buwandiikiddwa dda — olonda n’osindika. Tewali gateway, tewali fee.'
                : 'SMS opens your own SMS app with the text pre-written — you just hit send. No gateway, no fee, works offline.'}
            </p>
          </>
        )}
      </section>

      {/* Village Meeting Protocol Guidelines */}
      <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-2">
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
          Community Transparency Standards
        </h3>
        <ul className="text-xs text-text-muted space-y-1.5 list-disc pl-4">
          <li>The loudspeaker readout must be heard by all sitting members before keys are handed back.</li>
          <li>Any member has the constitutional right to ask for a cash recount before final departure.</li>
          <li>The cashbox is transported by the Box Keeper under armed or elder community escort.</li>
        </ul>
      </section>
    </main>
  );
};
