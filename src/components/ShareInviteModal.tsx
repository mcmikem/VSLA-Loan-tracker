import React, { useState } from 'react';
import { Language } from '../types';

interface ShareInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
  groupName: string;
  boxIdentifier: string;
  inviteCode: string;
  location?: string;
}

export const ShareInviteModal: React.FC<ShareInviteModalProps> = ({
  isOpen,
  onClose,
  language = 'EN',
  groupName,
  boxIdentifier,
  inviteCode,
  location = 'Uganda',
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSMS, setCopiedSMS] = useState(false);
  const str = (en: string, lu: string) => language === 'LU' ? lu : en;

  if (!isOpen) return null;

  const smsText = language === 'LU'
    ? `Habari! Walakubwa okuyingira mu ${groupName} (${boxIdentifier}) ku Bakwata VSLA Platform. Koodi y'Ekibiina: ${inviteCode}. Koresa koodi kino okulaba ppaasibuku yo n'ebitabo by'olukuŋŋaana.`
    : `Habari! You have been invited to join ${groupName} (${boxIdentifier}) on the Bakwata VSLA Platform. Group Code: ${inviteCode}. Use this code to view your digital passbook and weekly records.`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    language === 'LU'
      ? `*Invitation to ${groupName} (${boxIdentifier})*\n\nJja! Walakandiziddwa mu Mbuyatano w'Abantuze wetu w'Ensimbi n'Ebyewolo.\n\nKoresa Koodi y'Ekibiina: *${inviteCode}*\nLaba ppaasibuku yo, ekyewolo n'ebikwata mu nkalu online oba offline.`
      : `*Invitation to ${groupName} (${boxIdentifier})*\n\nHello! You have been registered for our Village Savings and Loan Association.\n\nUse Group Code: *${inviteCode}*\nAccess your digital passbook, loan approvals, and cash balances online or offline.`
  )}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopySMS = () => {
    navigator.clipboard.writeText(smsText);
    setCopiedSMS(true);
    setTimeout(() => setCopiedSMS(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-surface-card w-full max-w-md rounded-2xl shadow-2xl border border-border-strong overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-line bg-primary text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <span className="material-symbols-outlined text-[20px] text-secondary">share</span>
            </div>
            <div>
              <h2 className="text-title-md font-bold leading-tight">{str('Member Invite Kit', 'Kikono ky\'Okuyingiza Abakiise')}</h2>
              <p className="text-[11px] text-white/80">{groupName} • {boxIdentifier}</p>
            </div>
          </div>
           <button
             type="button"
             aria-label={str('Close member invite kit', 'Ggalawo kikono ky\'okuyingiza abakiise')}
             onClick={onClose}
             className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Group Code Card */}
          <div className="bg-canvas-bg border-2 border-dashed border-primary/40 rounded-xl p-4 text-center space-y-2">
             <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
               {str('Shareable Group Code', 'Koodi y\'Ekibiina Ezaasibwa')}
             </span>
            <div className="text-display-sm font-mono font-bold tracking-widest text-primary">
              {inviteCode}
            </div>
             <p className="text-xs text-text-muted">
               {str('New members can open the app, tap "Join with Code" and enter this code to enroll.', 'Abakiise bampya bayanga okuggunja App, bayogola "Yingira ku Koodi" nokuyingiza koodi kino.')}
             </p>
            <button
              type="button"
              onClick={handleCopyCode}
              className="mt-1 px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 hover:bg-primary/90 transition active:scale-95 shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">
                {copiedCode ? 'done' : 'content_copy'}
              </span>
               <span>{copiedCode ? str('Code Copied!', 'Koodi ekikoppolwedde!') : str('Copy Invite Code', 'Koppa koodi y\'okuyingiza')}</span>
            </button>
          </div>

          {/* Direct Share Options */}
          <div className="space-y-2">
             <span className="text-xs font-bold text-on-surface">{str('1-Tap Distribution:', 'Okusambaza k\'okukoma koonya:')}</span>
            <div className="grid grid-cols-2 gap-2.5">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 bg-[#25D366] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs hover:brightness-105 transition"
              >
                <span className="material-symbols-outlined text-[18px]">chat</span>
                 {str('Send via WhatsApp', 'Ohereza ku WhatsApp')}
              </a>

              <a
                href={`sms:?body=${encodeURIComponent(smsText)}`}
                className="py-2.5 px-3 bg-primary text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs hover:bg-primary/90 transition"
              >
                <span className="material-symbols-outlined text-[18px]">sms</span>
                 {str('Send via SMS', 'Ohereza ku SMS')}
              </a>
            </div>
          </div>

          {/* Pre-formatted Message for Copying */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                 <span className="text-xs font-bold text-on-surface">{str('Standard SMS Broadcast Text:', 'Tekateeka y\'SMS esinga:')}</span>
              <button
                type="button"
                onClick={handleCopySMS}
                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {copiedSMS ? 'done' : 'content_copy'}
                </span>
                 {copiedSMS ? str('Copied', 'Ekikoppolwedde') : str('Copy Message', 'Koppa ebbali')}
              </button>
            </div>
            <div className="p-3 bg-surface-container rounded-lg border border-border-line text-xs font-mono text-on-surface select-all leading-relaxed">
              {smsText}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border-line bg-surface-container-low shrink-0 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-surface-card hover:bg-surface-container border border-border-strong rounded-xl text-xs font-bold text-primary transition"
          >
             {str('Close', 'Ggalawo')}

          </button>
        </div>
      </div>
    </div>
  );
};
