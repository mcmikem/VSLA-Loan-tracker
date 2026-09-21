import React, { useState } from 'react';
import { Member, ScreenId } from '../types';

interface NewLoanRequestViewProps {
  members?: Member[];
  onNavigate: (screen: ScreenId) => void;
  /** When a member requests on their own phone, lock the form to them. */
  requestAsMemberNo?: string;
  onSubmitLoan: (loan: {
    memberName: string;
    memberNo: string;
    amount: number;
    term: string;
    serviceFee: number;
    phone: string;
    provider: 'MTN' | 'Airtel';
  }) => void;
}

export const NewLoanRequestView: React.FC<NewLoanRequestViewProps> = ({
  members = [],
  onNavigate,
  requestAsMemberNo,
  onSubmitLoan,
}) => {
  const fallbackList: Member[] = [
    { id: '1', name: 'Joseph Mukasa', no: '02', sharesTotal: 280000, maxBorrowLimit: 840000, phone: '0772-123-456', provider: 'MTN', initials: 'JM', zone: '', attendance: '', sharesCount: 0, loanBalance: 0, welfareBalance: 0, isKeyholder: false, stamps: [], ledger: [] } as Member,
    { id: '2', name: 'Sarah Nabukalu', no: '01', sharesTotal: 450000, maxBorrowLimit: 1350000, phone: '0772-123-456', provider: 'MTN', initials: 'SN', zone: '', attendance: '', sharesCount: 0, loanBalance: 0, welfareBalance: 0, isKeyholder: false, stamps: [], ledger: [] } as Member,
    { id: '3', name: 'Peter Ssemwogerere', no: '04', sharesTotal: 320000, maxBorrowLimit: 960000, phone: '0752-987-654', provider: 'Airtel', initials: 'PS', zone: '', attendance: '', sharesCount: 0, loanBalance: 0, welfareBalance: 0, isKeyholder: false, stamps: [], ledger: [] } as Member,
  ];
  const roster = members.length > 0 ? members : fallbackList;

  const lockedNo = requestAsMemberNo && roster.some((m) => m.no === requestAsMemberNo) ? requestAsMemberNo : undefined;
  const initialNo = lockedNo || roster[1]?.no || roster[0]?.no || '02';
  const [selectedNo, setSelectedNo] = useState(initialNo);
  const fullMember: Member =
    roster.find((m) => m.no === selectedNo) || roster[1] || roster[0];

  const shares = fullMember.sharesTotal || 0;
  const maxLimit = fullMember.maxBorrowLimit || shares * 3;
  const loanBalance = fullMember.loanBalance || 0;
  const activeLoanBalance =
    fullMember.activeLoan && typeof fullMember.activeLoan.balance === 'number'
      ? fullMember.activeLoan.balance
      : loanBalance;
  const hasActiveLoan = activeLoanBalance > 0 || loanBalance > 0;

  const [requestedAmount, setRequestedAmount] = useState(() =>
    Math.min(600000, maxLimit || 600000)
  );
  const [term, setTerm] = useState('3 months');
  const [purpose, setPurpose] = useState('Agricultural Seeds & Produce Buying');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const selectMember = (no: string) => {
    setSelectedNo(no);
    setIsSubmitted(false);
    const m = roster.find((x) => x.no === no);
    if (m) {
      const newMax = m.maxBorrowLimit || (m.sharesTotal || 0) * 3;
      setRequestedAmount((prev) => Math.min(prev, Math.max(newMax, 100000)));
    }
  };

  const interestFee = term === '1 month' ? requestedAmount * 0.05 : term === '2 months' ? requestedAmount * 0.08 : requestedAmount * 0.10;
  const totalRepayable = requestedAmount + interestFee;
  const overLimit = requestedAmount > maxLimit;
  const underMin = requestedAmount < 100000;
  const eligible = !hasActiveLoan && !overLimit && !underMin;
  const blockReason = hasActiveLoan
    ? `Blocked: ${fullMember.name} has an active loan balance of UGX ${activeLoanBalance.toLocaleString('en-US')}. Repay it fully before a new loan.`
    : overLimit
      ? `Blocked: UGX ${requestedAmount.toLocaleString('en-US')} exceeds the 3× limit of UGX ${maxLimit.toLocaleString('en-US')}.`
      : underMin
        ? 'Blocked: minimum loan is UGX 100,000.'
        : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eligible) return;
    onSubmitLoan({
      memberName: fullMember.name,
      memberNo: fullMember.no,
      amount: requestedAmount,
      term,
      serviceFee: interestFee,
      phone: fullMember.phone,
      provider: (fullMember.provider === 'Airtel' ? 'Airtel' : 'MTN') as 'MTN' | 'Airtel',
    });
    setIsSubmitted(true);
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
              Saba Ebanja (Request Loan)
            </h1>
            <p className="text-xs text-text-muted">VSLA Loan Appraisal & Guarantor Verification</p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded bg-status-ok-bg text-status-ok-tx text-xs font-bold font-mono">
          RULE: 3X SHARES
        </span>
      </div>

      {isSubmitted ? (
        <section className="bg-status-ok-bg border-2 border-secondary rounded-xl p-6 text-center space-y-3">
          <span className="material-symbols-outlined text-4xl text-secondary">verified</span>
          <h2 className="text-headline-md font-bold text-status-ok-tx">Loan Request Submitted!</h2>
          <p className="text-xs text-emerald-800">
            Request for UGX {requestedAmount.toLocaleString('en-US')} forwarded to Executive Approvals Queue.
            Two different officers must each turn a key (0/2 → 1/2 → approved) — track it in My account.
          </p>
          <div className="pt-2 flex gap-2">
            <button
              onClick={() => onNavigate('approvals')}
              className="flex-1 py-2.5 bg-secondary text-white text-xs font-bold rounded-lg"
            >
              Open Approvals Queue
            </button>
            <button
              onClick={() => setIsSubmitted(false)}
              className="py-2.5 px-3 bg-white border border-border-strong text-primary text-xs font-semibold rounded-lg"
            >
              New Request
            </button>
          </div>
        </section>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Member Card */}
          <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                Applying Member
              </span>
              {lockedNo ? (
                <span className="px-2 py-0.5 rounded bg-status-ok-bg text-status-ok-tx text-xs font-bold">
                  You — #{lockedNo}
                </span>
              ) : (
              <div className="flex gap-1 overflow-x-auto max-w-[200px] no-scrollbar">
                {roster.map((m) => (
                  <button
                    key={m.no}
                    type="button"
                    onClick={() => selectMember(m.no)}
                    className={`px-2 py-0.5 rounded text-xs font-bold shrink-0 ${
                      selectedNo === m.no
                        ? 'bg-primary-container text-white'
                        : 'bg-canvas-bg text-text-muted border'
                    }`}
                  >
                    #{m.no} {m.name.split(' ')[1] || m.name.split(' ')[0]}
                  </button>
                ))}
              </div>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-canvas-bg rounded-lg border border-border-line">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center font-bold">
                  {fullMember.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <span className="font-bold text-sm text-primary block">{fullMember.name}</span>
                  <span className="text-xs text-text-muted">
                    No. {fullMember.no} · {fullMember.provider} {fullMember.phone}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-text-muted block">Shares Saved</span>
                <span className="font-mono text-xs font-bold text-primary">
                  UGX {shares.toLocaleString('en-US')}
                </span>
              </div>
            </div>

            {/* 3x borrowing limit banner */}
            <div className="bg-status-ok-bg/50 border border-secondary/30 rounded-lg p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-status-ok-tx font-medium">
                <span className="material-symbols-outlined text-base">rule</span>
                <span>Max Allowed (3x Shares):</span>
              </div>
              <span className="font-mono font-bold text-secondary text-sm">
                UGX {maxLimit.toLocaleString('en-US')}
              </span>
            </div>

            {/* Eligibility display: 3x rule + one-active-loan, evaluated before submit */}
            <div className={`rounded-lg border p-3 space-y-2 text-xs ${eligible ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <p className="font-bold text-primary uppercase tracking-wider text-[11px] flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">fact_check</span>
                Eligibility check (before submit)
              </p>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">1. 3× shares rule: UGX {shares.toLocaleString('en-US')} × 3 = UGX {maxLimit.toLocaleString('en-US')}</span>
                <span className={`px-2 py-0.5 rounded font-bold ${overLimit ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {overLimit ? 'FAIL' : 'PASS'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">
                  2. One active loan: {hasActiveLoan ? `has UGX ${activeLoanBalance.toLocaleString('en-US')} outstanding` : 'no active loan'}
                </span>
                <span className={`px-2 py-0.5 rounded font-bold ${hasActiveLoan ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {hasActiveLoan ? 'BLOCKED' : 'CLEAR'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">3. Amount within limit: UGX {requestedAmount.toLocaleString('en-US')}</span>
                <span className={`px-2 py-0.5 rounded font-bold ${eligible ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  {eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
                </span>
              </div>
              {blockReason && (
                <p className="text-[11px] font-bold text-red-800 bg-white/70 border border-red-200 rounded p-2">
                  {blockReason}
                </p>
              )}
            </div>
          </section>

          {/* Amount & Purpose */}
          <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-3">
            <label className="text-xs font-bold text-primary block uppercase tracking-wider">
              Loan Amount & Term
            </label>

            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs text-text-muted">Requested Principal</span>
                <span className="font-mono text-currency-lg text-primary font-bold">
                  UGX {requestedAmount.toLocaleString('en-US')}
                </span>
              </div>
              <input
                type="range"
                min="100000"
                max={Math.max(maxLimit, 100000)}
                step="50000"
                value={Math.min(requestedAmount, Math.max(maxLimit, 100000))}
                onChange={(e) => setRequestedAmount(Number(e.target.value))}
                className="w-full h-2 bg-canvas-bg rounded-lg appearance-none cursor-pointer accent-secondary"
              />
              <div className="flex justify-between text-[11px] text-text-muted font-mono mt-1">
                <span>UGX 100,000</span>
                <span>Max: UGX {maxLimit.toLocaleString('en-US')}</span>
              </div>
            </div>

            {/* Term Options */}
            <div>
              <span className="text-xs font-semibold text-text-muted block mb-1.5">Repayment Term</span>
              <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                {[
                  { id: '1 month', label: '1 Month', rate: '5% (UGX ' + (requestedAmount * 0.05).toLocaleString('en-US') + ')' },
                  { id: '2 months', label: '2 Months', rate: '8% (UGX ' + (requestedAmount * 0.08).toLocaleString('en-US') + ')' },
                  { id: '3 months', label: '3 Months', rate: '10% (UGX ' + (requestedAmount * 0.10).toLocaleString('en-US') + ')' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTerm(t.id)}
                    className={`p-2 rounded-lg border text-center transition ${
                      term === t.id
                        ? 'bg-primary-container text-white border-primary-container shadow-sm'
                        : 'bg-canvas-bg text-on-surface border-border-line hover:border-border-strong'
                    }`}
                  >
                    <span className="block">{t.label}</span>
                    <span className="text-[10px] font-normal opacity-90 block mt-0.5">{t.rate}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Purpose */}
            <div>
              <span className="text-xs font-semibold text-text-muted block mb-1">Loan Purpose</span>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full py-2 px-3 bg-canvas-bg border border-border-strong rounded-lg text-xs text-primary font-medium"
              />
            </div>
          </section>

          {/* 2 Guarantors Section */}
          <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-secondary">verified_user</span>
                2 Required Guarantors (Abayima)
              </h3>
              <span className="text-xs bg-status-ok-bg text-status-ok-tx font-bold px-2 py-0.5 rounded">
                100% PLEDGED
              </span>
            </div>
            <p className="text-[11px] text-text-muted">
              VSLA constitution mandates 2 active members with combined shares &ge; loan principal pledge guarantees.
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-canvas-bg rounded-lg border border-border-line flex items-center justify-between">
                <div>
                  <span className="font-bold text-primary block">Guarantor 1: Sarah Nabukalu (#01)</span>
                  <span className="text-[11px] text-text-muted">Shares: UGX 450,000 · Keyholder 1</span>
                </div>
                <span className="font-mono font-bold text-secondary">Pledged UGX 300,000</span>
              </div>

              <div className="p-2.5 bg-canvas-bg rounded-lg border border-border-line flex items-center justify-between">
                <div>
                  <span className="font-bold text-primary block">Guarantor 2: Peter Ssemwogerere (#04)</span>
                  <span className="text-[11px] text-text-muted">Shares: UGX 320,000 · Trader</span>
                </div>
                <span className="font-mono font-bold text-secondary">Pledged UGX 300,000</span>
              </div>
            </div>
          </section>

          {/* Summary Box */}
          <section className="bg-canvas-bg border border-border-line rounded-xl p-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between text-text-muted">
              <span>Principal:</span>
              <span className="font-mono font-semibold text-primary">UGX {requestedAmount.toLocaleString('en-US')}</span>
            </div>
            <div className="flex justify-between text-text-muted">
              <span>Service Fee ({term}):</span>
              <span className="font-mono font-semibold text-primary">UGX {interestFee.toLocaleString('en-US')}</span>
            </div>
            <div className="flex justify-between font-bold text-primary pt-1.5 border-t border-border-line text-sm">
              <span>Total Repayable:</span>
              <span className="font-mono text-secondary">UGX {totalRepayable.toLocaleString('en-US')}</span>
            </div>
          </section>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={!eligible}
            title={blockReason || 'Submit loan request'}
            className={`w-full min-h-[52px] font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-sm active:scale-[0.99] transition ${eligible ? 'bg-[#15803D] hover:bg-[#0B3D2E] text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
          >
            <span className="material-symbols-outlined text-xl">send</span>
            <span>{eligible ? 'Submit Loan Request to Executive Queue' : 'Blocked — see eligibility above'}</span>
          </button>
        </form>
      )}
    </main>
  );
};
