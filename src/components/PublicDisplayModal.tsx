import React from 'react';
import { VSLAState } from '../types';
import { buildMeetingSms, smsLink, waLink } from '../utils/summary';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  state: VSLAState;
}

/**
 * Public display: huge high-contrast figures readable from 3m.
 * No personal data. For shouting-free verification under the tree.
 * Plus one-tap SMS/WhatsApp summary for feature-phone members.
 */
export const PublicDisplayModal: React.FC<Props> = ({ isOpen, onClose, state }) => {
  if (!isOpen) return null;
  const sms = buildMeetingSms(state);
  return (
    <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white text-black rounded-2xl max-w-md w-full p-6 space-y-4 print-area"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center text-xs font-bold tracking-widest">PUBLIC — SHOW TO ALL MEMBERS</p>
        <h2 className="text-center text-xl font-bold">{state.groupName} · Mtg #{state.recentMeetingsCount}</h2>
        <div className="space-y-2 text-center">
          <div className="border-2 border-black rounded-xl p-3">
            <p className="text-sm font-bold">BOX CASH</p>
            <p className="text-4xl font-mono font-bold">UGX {state.boxCashBalance.toLocaleString()}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="border border-black rounded-xl p-2">
              <p className="text-xs font-bold">LOAN FUND</p>
              <p className="text-lg font-mono font-bold">UGX {state.loanFundBalance.toLocaleString()}</p>
            </div>
            <div className="border border-black rounded-xl p-2">
              <p className="text-xs font-bold">WELFARE</p>
              <p className="text-lg font-mono font-bold">UGX {state.welfareFundBalance.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-sm">{state.members.length} members · Paper stamp = proof</p>
        </div>
        <p className="text-xs font-mono bg-gray-100 p-2 rounded">{sms}</p>
        <div className="flex gap-2 no-print">
          <a href={smsLink(sms)} className="flex-1 text-center py-2.5 bg-black text-white rounded-lg text-sm font-bold">
            Send SMS
          </a>
          <a href={waLink(sms)} target="_blank" rel="noreferrer" className="flex-1 text-center py-2.5 bg-[#006d30] text-white rounded-lg text-sm font-bold">
            WhatsApp
          </a>
          <button type="button" onClick={() => window.print()} className="flex-1 py-2.5 border-2 border-black rounded-lg text-sm font-bold">
            Print
          </button>
        </div>
        <button type="button" onClick={onClose} className="w-full py-2 text-sm font-bold underline no-print">
          Close
        </button>
      </div>
    </div>
  );
};
