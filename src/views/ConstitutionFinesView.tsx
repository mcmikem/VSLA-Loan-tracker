import React, { useState } from 'react';
import { PendingFine, ScreenId } from '../types';

interface ConstitutionFinesViewProps {
  fines: PendingFine[];
  onCollectFine: (id: string) => void;
  onWaiveFine: (id: string) => void;
  onLevyFine: (fine: PendingFine) => void;
  onNavigate: (screen: ScreenId) => void;
}

export const ConstitutionFinesView: React.FC<ConstitutionFinesViewProps> = ({
  fines,
  onCollectFine,
  onWaiveFine,
  onLevyFine,
  onNavigate,
}) => {
  const [selectedMember, setSelectedMember] = useState('Kato Moses');
  const [selectedMemberNo, setSelectedMemberNo] = useState('12');
  const [selectedInfraction, setSelectedInfraction] = useState('Late Arrival (>10:15 AM)');
  const [fineAmount, setFineAmount] = useState(2000);
  const [customNote, setCustomNote] = useState('Arrived after opening prayer');

  const handleInfractionChange = (infr: string, cost: number) => {
    setSelectedInfraction(infr);
    setFineAmount(cost);
  };

  const handleLevySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newFine: PendingFine = {
      id: 'fine-' + Date.now(),
      memberNo: selectedMemberNo,
      memberName: selectedMember,
      reason: selectedInfraction + ' · ' + customNote,
      amount: fineAmount,
      timeNote: 'Meeting #28',
      meetingRef: 'Meeting #28',
      status: 'pending',
    };
    onLevyFine(newFine);
  };

  return (
    <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-12 flex-1 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('home')}
            className="w-9 h-9 rounded-lg bg-surface-card border border-border-strong flex items-center justify-center text-primary"
            type="button"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <div>
            <h1 className="text-headline-md font-headline-md text-primary font-bold">
              Ssemateeka n'Emisoso
            </h1>
            <p className="text-xs text-text-muted">VSLA Constitution Rules & Fines Ledger</p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded bg-status-warn-bg text-status-warn-tx text-xs font-bold font-mono">
          DISCIPLINE
        </span>
      </div>

      {/* Pending Fines Queue */}
      <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-status-warn-tx">gavel</span>
            Pending Uncollected Fines
          </h3>
          <span className="text-xs font-bold bg-status-bad-bg text-status-bad-tx px-2 py-0.5 rounded font-mono">
            {fines.filter((f) => f.status === 'pending').length} Unpaid
          </span>
        </div>

        <div className="space-y-2 text-xs">
          {fines.filter((f) => f.status === 'pending').length === 0 ? (
            <p className="text-text-muted py-2 text-center">All fines collected or settled.</p>
          ) : (
            fines
              .filter((f) => f.status === 'pending')
              .map((fine) => (
                <div
                  key={fine.id}
                  className="p-3 bg-canvas-bg rounded-lg border border-border-line space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-primary block">
                        {fine.memberName} (#{fine.memberNo})
                      </span>
                      <p className="text-[11px] text-text-muted">{fine.reason}</p>
                    </div>
                    <span className="font-mono font-bold text-status-bad-tx text-sm">
                      UGX {fine.amount.toLocaleString('en-US')}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-1 border-t border-border-line">
                    <button
                      onClick={() => onCollectFine(fine.id)}
                      className="flex-1 py-1.5 bg-secondary text-white font-bold rounded text-[11px] flex items-center justify-center gap-1 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-xs">payments</span>
                      Collect Cash
                    </button>
                    <button
                      onClick={() => onWaiveFine(fine.id)}
                      className="px-2.5 py-1.5 bg-surface-card border border-border-strong text-text-muted hover:text-primary rounded text-[11px] font-semibold"
                    >
                      Waive
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </section>

      {/* Quick Levy Fine Tool */}
      <form
        onSubmit={handleLevySubmit}
        className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-3"
      >
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
          Levy Instant Meeting Fine
        </h3>

        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1">Offending Member</label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setSelectedMember('Kato Moses');
                setSelectedMemberNo('12');
              }}
              className={`p-2 rounded-lg border text-left ${
                selectedMemberNo === '12'
                  ? 'bg-primary-container text-white border-primary-container font-bold'
                  : 'bg-canvas-bg'
              }`}
            >
              #12 Kato Moses
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedMember('Prossy Namutebi');
                setSelectedMemberNo('07');
              }}
              className={`p-2 rounded-lg border text-left ${
                selectedMemberNo === '07'
                  ? 'bg-primary-container text-white border-primary-container font-bold'
                  : 'bg-canvas-bg'
              }`}
            >
              #07 Prossy Namutebi
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1">Infraction Category</label>
          <div className="space-y-1 text-xs">
            {[
              { text: 'Late Arrival (>10:15 AM)', cost: 2000 },
              { text: 'Absent Without Prior Apology', cost: 5000 },
              { text: 'Phone Ringing in Prayer/Meeting', cost: 1000 },
              { text: 'Side Whispering / Disruption', cost: 1000 },
            ].map((inf) => (
              <button
                key={inf.text}
                type="button"
                onClick={() => handleInfractionChange(inf.text, inf.cost)}
                className={`w-full p-2 rounded-lg border flex items-center justify-between text-left ${
                  selectedInfraction === inf.text
                    ? 'bg-primary-container text-white border-primary-container font-bold'
                    : 'bg-canvas-bg text-on-surface'
                }`}
              >
                <span>{inf.text}</span>
                <span className="font-mono font-bold">UGX {inf.cost.toLocaleString('en-US')}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full min-h-[44px] bg-primary text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
        >
          <span className="material-symbols-outlined text-base">add_circle</span>
          <span>Record Fine in Meeting Ledger</span>
        </button>
      </form>

      {/* Constitution Rules Reference Table */}
      <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-2">
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
          Bakwata Adopted Constitution Bylaws
        </h3>
        <ul className="text-xs space-y-1.5 text-text-muted list-disc pl-4 leading-relaxed">
          <li>Every member must purchase minimum 1 share (UGX 10,000) and maximum 5 shares weekly.</li>
          <li>Welfare contribution of UGX 2,000 is mandatory at each sitting for emergency coverage.</li>
          <li>Loans are appraised strictly up to 3x cumulative shares savings of the borrower.</li>
          <li>All box openings and closings require the physical presence and keys of all 3 keyholders.</li>
        </ul>
      </section>
    </main>
  );
};
