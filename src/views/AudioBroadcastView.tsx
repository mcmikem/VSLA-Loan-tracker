import React, { useState } from 'react';
import { ScreenId } from '../types';

interface AudioBroadcastViewProps {
  onNavigate: (screen: ScreenId) => void;
  boxCashBalance?: number;
  meetingNumber?: number;
  membersCount?: number;
}

export const AudioBroadcastView: React.FC<AudioBroadcastViewProps> = ({
  onNavigate,
  boxCashBalance = 1420000,
  meetingNumber = 28,
  membersCount = 30,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'EN' | 'LU'>('LU');

  const formattedCash = boxCashBalance.toLocaleString('en-US');

  const lugandaText = `Olukuŋŋaana #${meetingNumber} lwa Bakwata lufundikiddwa. Ssente eziri mu sanduuko ziri shillingi za Uganda emitwalo ${Math.round(boxCashBalance / 10000)} (UGX ${formattedCash}). Bammemba ${membersCount} beetabye. Sanduuko esibiddwa n'ekkufulu essatu ez'abakwasi b'ebisumuluzo.`;

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

  const reminderText = `[BAKWATA VSLA] Reminder: Meeting #${meetingNumber + 1} is this Friday 4PM at Kalerwe Market. Bring your passbook + shares. Okujjukiza: Olukuŋŋaana lujja ku Lwokutaano 4pm.`;
  const reminderSmsHref = `sms:?body=${encodeURIComponent(reminderText)}`;
  const reminderWaHref = `https://wa.me/?text=${encodeURIComponent(reminderText)}`;

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
