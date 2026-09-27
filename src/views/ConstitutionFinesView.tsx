import React, { useState } from 'react';
import { Language, Member, PendingFine, ScreenId } from '../types';
import { displayFineReason } from '../utils/policy';
import { findMemberPhoto } from '../utils/photo';
import { MemberAvatar } from '../components/MemberAvatar';

interface ConstitutionFinesViewProps {
  fines: PendingFine[];
  onCollectFine: (id: string) => void;
  onWaiveFine: (id: string) => void;
  onLevyFine: (fine: PendingFine) => void;
  onNavigate: (screen: ScreenId) => void;
  language?: Language;
  meetingNumber?: number;
  /** Member directory for face photos (low-literacy verification). */
  members?: Member[];
}

const INFRACTIONS = [
  { en: 'Late Arrival (>10:15 AM)', cost: 2000 },
  { en: 'Absent Without Prior Apology', cost: 5000 },
  { en: 'Phone Ringing in Prayer/Meeting', cost: 1000 },
  { en: 'Side Whispering / Disruption', cost: 1000 },
];

export const ConstitutionFinesView: React.FC<ConstitutionFinesViewProps> = ({
  fines,
  onCollectFine,
  onWaiveFine,
  onLevyFine,
  onNavigate,
  language = 'EN',
  meetingNumber = 0,
  members = [],
}) => {
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedMemberNo, setSelectedMemberNo] = useState('');
  const [selectedInfraction, setSelectedInfraction] = useState('Late Arrival (>10:15 AM)');
  const [fineAmount, setFineAmount] = useState(2000);
  const [customNote, setCustomNote] = useState('');
  const str = (en: string, lu: string) => (language === 'LU' ? lu : en);

  const handleInfractionChange = (infr: string, cost: number) => {
    setSelectedInfraction(infr);
    setFineAmount(cost);
  };

  const handleLevySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberNo || !members.some((member) => member.no === selectedMemberNo)) return;
    const newFine: PendingFine = {
      id: 'fine-' + Date.now(),
      memberNo: selectedMemberNo,
      memberName: selectedMember,
      reason: selectedInfraction + ' · ' + customNote,
      amount: fineAmount,
       timeNote: `Meeting #${meetingNumber}`,
       meetingRef: `Meeting #${meetingNumber}`,
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
              aria-label={str('Go back', 'Ddayo')}
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_back</span>
          </button>
          <div>
            <h1 className="text-headline-md font-headline-md text-primary font-bold">
              {language === 'LU' ? 'Amateeka n’Amisango' : 'Ssemateeka n\'Emisoso'}
            </h1>
            <p className="text-xs text-text-muted">
              {str('VSLA Constitution Rules & Fines Ledger', 'Amateeka aga-VSLA n’ekitabo ky’amisango')}
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded bg-status-warn-bg text-status-warn-tx text-xs font-bold font-mono">
          {str('DISCIPLINE', 'KIKOLOTO')}
        </span>
      </div>

      {/* Pending Fines Queue */}
      <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-status-warn-tx" aria-hidden="true">gavel</span>
            {str('Pending Uncollected Fines', 'Amisango aga-akungwa')}
          </h3>
          <span className="text-xs font-bold bg-status-bad-bg text-status-bad-tx px-2 py-0.5 rounded font-mono">
            {fines.filter((f) => f.status === 'pending').length} {str('Unpaid', 'Tedda okusubiza')}
          </span>
        </div>

        <div className="space-y-2 text-xs">
          {fines.filter((f) => f.status === 'pending').length === 0 ? (
            <p className="text-text-muted py-2 text-center">
              {str('All fines collected or settled.', 'Byonna engassi zigyiddwa oba zigizudde.')}
            </p>
          ) : (
            fines
              .filter((f) => f.status === 'pending')
              .map((fine) => (
                <div
                  key={fine.id}
                  className="p-3 bg-canvas-bg rounded-lg border border-border-line space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <MemberAvatar
                        name={fine.memberName}
                        photoUrl={findMemberPhoto(members, fine.memberNo, fine.memberName)}
                        sizeClass="w-9 h-9 text-xs"
                      />
                      <div>
                        <span className="font-bold text-primary block">
                          {fine.memberName} (#{fine.memberNo})
                        </span>
                        <p className="text-[11px] text-text-muted">{displayFineReason(fine.reason, language)}</p>
                      </div>
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
                      <span className="material-symbols-outlined text-xs" aria-hidden="true">payments</span>
                      {str('Collect Cash', 'Giggya ssente')}
                    </button>
                    <button
                      onClick={() => onWaiveFine(fine.id)}
                      className="px-2.5 py-1.5 bg-surface-card border border-border-strong text-text-muted hover:text-primary rounded text-[11px] font-semibold"
                    >
                      {str('Waive', 'Sizaamu')}
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
          {str('Levy Instant Meeting Fine', 'Sazaamu engassi mu lukuŋŋaana')}
        </h3>

        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1">
            {str('Offending Member', 'Omukiise asubidwa')}
          </label>
           <div className="grid grid-cols-2 gap-2 text-xs">
             {members.map((member) => (
               <button
                 key={member.no}
                 type="button"
                 onClick={() => {
                   setSelectedMember(member.name);
                   setSelectedMemberNo(member.no);
                 }}
                 className={`p-2 rounded-lg border text-left ${selectedMemberNo === member.no ? 'bg-primary-container text-white border-primary-container font-bold' : 'bg-canvas-bg'}`}
               >
                 #{member.no} {member.name.split(' ')[0]}
               </button>
             ))}
           </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1">
            {str('Infraction Category', 'Kikomo ky’ekyalo')}
          </label>
          <div className="space-y-1 text-xs">
            {INFRACTIONS.map((inf) => (
              <button
                key={inf.en}
                type="button"
                onClick={() => handleInfractionChange(inf.en, inf.cost)}
                className={`w-full p-2 rounded-lg border flex items-center justify-between text-left ${
                  selectedInfraction === inf.en
                    ? 'bg-primary-container text-white border-primary-container font-bold'
                    : 'bg-canvas-bg text-on-surface'
                }`}
              >
                <span>{displayFineReason(inf.en, language)}</span>
                <span className="font-mono font-bold">UGX {inf.cost.toLocaleString('en-US')}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full min-h-[44px] bg-primary text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">add_circle</span>
          <span>{str('Record Fine in Meeting Ledger', 'Yika engassi mu kitabo ky’olukuŋŋaana')}</span>
        </button>
      </form>

      {/* Constitution Rules Reference Table */}
      <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-2">
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
          {str('Bakwata Adopted Constitution Bylaws', 'Amateeka aga Bakwata gaakamatakulatwa')}
        </h3>
        <ul className="text-xs space-y-1.5 text-text-muted list-disc pl-4 leading-relaxed">
          <li>
            {str(
              'Every member must purchase minimum 1 share (UGX 10,000) and maximum 5 shares weekly.',
              'Buli mukiise alina okugula omugabo 1 (UGX 10,000) n’akakali ku 5 buli wiiki.'
            )}
          </li>
          <li>
            {str(
              'Welfare contribution of UGX 2,000 is mandatory at each sitting for emergency coverage.',
              'Okuyingiza UGX 2,000 mu buyambi kwa kikomo buli lukuŋŋaana kwa kuyamba mu kemergesi.'
            )}
          </li>
          <li>
            {str(
              'Loans are appraised strictly up to 3x cumulative shares savings of the borrower.',
              'Ebbanja biguliriza nga 3× nterekanya y’emigabo gy’omukwatta gy’omuyoola.'
            )}
          </li>
          <li>
            {str(
              'All box openings and closings require the physical presence and keys of all 3 keyholders.',
              'Buli lufumba n’okuggya kasanduuko byona bimina abakwasi batatu okubikira ku mubali ne bisumuluzo byabwe.'
            )}
          </li>
        </ul>
      </section>
    </main>
  );
};
