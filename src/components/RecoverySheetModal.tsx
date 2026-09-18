import React from 'react';
import { VSLAState } from '../types';
import { ledgerHash } from '../utils/ledgerHash';

interface RecoverySheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: VSLAState;
  language?: string;
}

/**
 * One printed page that brings the books back if the secretary's phone dies.
 * Numbers are a same-day reference (verify box cash on restore); the JSON
 * backup file itself must travel separately (WhatsApp it to 2 officers).
 */
export const RecoverySheetModal: React.FC<RecoverySheetModalProps> = ({
  isOpen,
  onClose,
  state,
  language = 'EN',
}) => {
  if (!isOpen) return null;
  const lu = language === 'LU';
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const steps: [string, string][] = [
    ['1', lu ? 'Teeka app ku ssimu empya (link yemu / Add to Home Screen).' : 'Install the app on the new phone (same link / Add to Home Screen).'],
    ['2', lu ? 'Genda mu Backup → Restore tab.' : 'Open Backup → Restore tab.'],
    ['3', lu ? 'Teekamu fayiro ya backup (JSON) — eri ku WhatsApp y\'abakulu babiri.' : 'Upload the JSON backup file — kept on 2 officers’ WhatsApp.'],
    ['4', lu ? 'Kakasa nti ssente mu sanduuko ziringa ennamba wansi.' : 'Confirm the box cash matches the numbers below.'],
  ];

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white text-black rounded-2xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto print-area"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center border-b-2 border-black pb-3">
          <p className="text-xs font-bold tracking-widest">*** {lu ? 'OLUPAPULA LW\'OKUZZAAWO' : 'RECOVERY SHEET'} ***</p>
          <h2 className="text-xl font-bold">{state.groupName}</h2>
          <p className="text-xs font-mono">{state.boxIdentifier} · {lu ? 'Lukubiddwa' : 'Printed'} {today}</p>
        </div>

        <div className="font-mono text-sm space-y-1">
          <div className="flex justify-between"><span>{lu ? 'Koodi y\'ekibiina:' : 'Invite code:'}</span><strong>{state.inviteCode || state.groupProfile?.inviteCode || '-'}</strong></div>
          <div className="flex justify-between"><span>{lu ? 'Abakiise:' : 'Members:'}</span><strong>{state.members.length}</strong></div>
          <div className="flex justify-between"><span>{lu ? 'Olukuŋŋaana:' : 'Meeting:'}</span><strong>#{state.recentMeetingsCount}</strong></div>
          <div className="flex justify-between"><span>{lu ? 'Ssente mu sanduuko:' : 'Box cash:'}</span><strong>UGX {state.boxCashBalance.toLocaleString()}</strong></div>
          <div className="flex justify-between"><span>{lu ? 'Ebyewolo:' : 'Loan fund:'}</span><strong>UGX {state.loanFundBalance.toLocaleString()}</strong></div>
          <div className="flex justify-between"><span>{lu ? 'Obuyambi:' : 'Welfare:'}</span><strong>UGX {state.welfareFundBalance.toLocaleString()}</strong></div>
          <div className="flex justify-between"><span>{lu ? 'Ennamba y\'ekitabo:' : 'Ledger hash:'}</span><strong>{ledgerHash(state.members)}</strong></div>
        </div>

        <ol className="space-y-2 text-sm border-t border-dashed border-gray-400 pt-3">
          {steps.map(([n, text]) => (
            <li key={n} className="flex gap-2">
              <span className="w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center shrink-0">{n}</span>
              <span>{text}</span>
            </li>
          ))}
        </ol>

        <p className="text-[11px] text-center border border-black rounded-lg p-2 font-bold">
          {lu
            ? 'Kweka olupapula luno mu sanduuko oba ew\'omukuumi w\'ebisumuluzo. Tolukweka mu ssimu yokka.'
            : 'Keep this sheet in the box or with a keyholder. Never only on the phone.'}
        </p>

        <div className="flex gap-2 no-print">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 py-2.5 bg-black text-white rounded-lg text-sm font-bold"
          >
            {lu ? 'Kuba / Chapisha' : 'Print'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border-2 border-black rounded-lg text-sm font-bold"
          >
            {lu ? 'Ggalawo' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
