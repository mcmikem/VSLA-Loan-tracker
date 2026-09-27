import React, { useState } from 'react';
import { Language, Member, ScreenId } from '../types';
import { DEFAULT_BORROW_MULTIPLIER, DEFAULT_LOAN_MINIMUM, DEFAULT_LOAN_RATES, DEFAULT_REQUIRED_GUARANTORS, loanRateForTerm } from '../utils/policy';
import { InfoTip } from '../components/InfoTip';
import { smsHref, waHref } from '../utils/smsReminders';

interface NewLoanRequestViewProps {
  members?: Member[];
  onNavigate: (screen: ScreenId) => void;
  requestAsMemberNo?: string;
  language?: Language;
  requiredGuarantors?: number;
  borrowMultiplier?: number;
  loanMinimum?: number;
  loanRates?: typeof DEFAULT_LOAN_RATES;
  secretaryName?: string;
  secretaryPhone?: string;
  onSubmitLoan: (loan: {
    memberName: string;
    memberNo: string;
    amount: number;
    term: string;
    serviceFee: number;
    purpose: string;
    guarantorNos: string[];
    phone: string;
    provider: 'MTN' | 'Airtel';
  }) => void;
}

export const NewLoanRequestView: React.FC<NewLoanRequestViewProps> = ({
  members = [],
  onNavigate,
  requestAsMemberNo,
  language = 'EN',
  requiredGuarantors = DEFAULT_REQUIRED_GUARANTORS,
  borrowMultiplier = DEFAULT_BORROW_MULTIPLIER,
  loanMinimum = DEFAULT_LOAN_MINIMUM,
  loanRates = DEFAULT_LOAN_RATES,
  secretaryName = 'Group secretary',
  secretaryPhone = '',
  onSubmitLoan,
}) => {
  const roster = members;
  const lockedNo = requestAsMemberNo && roster.some((m) => m.no === requestAsMemberNo) ? requestAsMemberNo : undefined;
  const initialNo = lockedNo || roster[0]?.no || '';
  const [selectedNo, setSelectedNo] = useState(initialNo);
  const [guarantorNos, setGuarantorNos] = useState<string[]>([]);
  const fullMember = (roster.find((m) => m.no === selectedNo) || roster[0]) as Member;
  const str = (en: string, lu: string) => (language === 'LU' ? lu : en);

  const shares = fullMember?.sharesTotal || 0;
  const maxLimit = fullMember?.maxBorrowLimit || shares * borrowMultiplier;
  const loanBalance = fullMember?.loanBalance || 0;
  const activeLoanBalance =
    fullMember?.activeLoan && typeof fullMember.activeLoan.balance === 'number'
      ? fullMember.activeLoan.balance
      : loanBalance;
  const hasActiveLoan = activeLoanBalance > 0 || loanBalance > 0;

  const [requestedAmount, setRequestedAmount] = useState(() =>
    Math.min(600000, Math.max(0, maxLimit))
  );
  const [term, setTerm] = useState('3 months');
  const [purpose, setPurpose] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const selectMember = (no: string) => {
    setSelectedNo(no);
    setGuarantorNos([]);
    setIsSubmitted(false);
    const m = roster.find((x) => x.no === no);
    if (m) {
      const newMax = m.maxBorrowLimit || (m.sharesTotal || 0) * borrowMultiplier;
       setRequestedAmount((prev) => Math.min(prev, Math.max(newMax, loanMinimum)));
    }
  };

  const interestFee = requestedAmount * (loanRateForTerm(term, loanRates) / 100);
  const totalRepayable = requestedAmount + interestFee;
  const overLimit = requestedAmount > maxLimit;
  const underMin = requestedAmount < loanMinimum;
  const guarantorsReady = guarantorNos.length >= requiredGuarantors;
  const purposeReady = purpose.trim().length > 0;
  const eligible = !!fullMember && !hasActiveLoan && !overLimit && !underMin && guarantorsReady && purposeReady;
  const blockReason = !fullMember
    ? str('Add a member to this group before requesting a loan.', 'Yongera omukiise mu kibiina nga tannasaba ekyewolo.')
    : hasActiveLoan
      ? str(`Blocked: ${fullMember.name} has an active loan balance of UGX ${activeLoanBalance.toLocaleString('en-US')}. Repay it fully before a new loan.`, `Kikwene: ${fullMember.name} alina bbanja ly'ekyewolo erisigadde. Asasula bulungi ng'akaseera okusaba enda.`)
      : overLimit
        ? str(`Blocked: UGX ${requestedAmount.toLocaleString('en-US')} exceeds the ${borrowMultiplier}× limit of UGX ${maxLimit.toLocaleString('en-US')}.`, `Kikwene: UGX ${requestedAmount.toLocaleString('en-US')} kikira ekkano ly'${borrowMultiplier}× ekigwanga UGX ${maxLimit.toLocaleString('en-US')}.`)
        : underMin
          ? str(`Blocked: minimum loan is UGX ${loanMinimum.toLocaleString('en-US')}.`, `Kikwene: ekyewolo ekikomo kya UGX ${loanMinimum.toLocaleString('en-US')}.`)
          : !guarantorsReady
            ? str(`Choose ${requiredGuarantors} real confirmer${requiredGuarantors === 1 ? '' : 's'}.`, `Londa abakkiriza ${requiredGuarantors} abakozesa b’ekibiina.`)
            : !purposeReady
              ? str('Tell the group what the loan is for.', 'Buulira ekibiina lwaki ekyewolo esabikwa.')
              : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eligible || !fullMember) return;
    onSubmitLoan({
      memberName: fullMember.name,
      memberNo: fullMember.no,
      amount: requestedAmount,
      term,
      serviceFee: interestFee,
      purpose: purpose.trim(),
      guarantorNos,
      phone: fullMember.phone,
      provider: (fullMember.provider === 'Airtel' ? 'Airtel' : 'MTN') as 'MTN' | 'Airtel',
    });
    setIsSubmitted(true);
  };

  const phoneRequestText = fullMember
    ? str(`Loan request from ${fullMember.name}: UGX ${requestedAmount.toLocaleString()} for ${purpose.trim() || 'a group-approved purpose'}. Please review it in the VSLA app.`, `Okusaba ekyewolo okuva ku ${fullMember.name}: UGX ${requestedAmount.toLocaleString()} ku ${purpose.trim() || 'ensonga ekkirizidwa'}. Kebera mu app ya VSLA.`)
    : str('Please review this loan request in the VSLA app.', 'Kebera okusaba kino mu app ya VSLA.');

  if (roster.length === 0) {
    return (
      <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-12 flex-1 space-y-4">
        <button onClick={() => onNavigate('home')} className="w-9 h-9 rounded-lg bg-surface-card border border-border-strong flex items-center justify-center text-primary" type="button">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
        </button>
        <section className="bg-surface-card border border-border-line rounded-xl p-5 text-center space-y-3">
          <span className="material-symbols-outlined text-4xl text-secondary">group_add</span>
           <h1 className="text-headline-md font-bold text-primary">{str('No members yet', 'Tewali mukiise')}</h1>
           <p className="text-sm text-text-muted">{str('Add the first real member before requesting a loan.', 'Yongera omukiise ow’ekisooka nga tannasaba ekyewolo.')}</p>
           <button onClick={() => onNavigate('member_passbook')} className="min-h-[48px] px-5 bg-primary text-white rounded-lg font-bold" type="button">{str('Add a member', 'Yongera omukiise')}</button>
        </section>
      </main>
    );
  }

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
               {str('Request a Loan', 'Saba ekyewolo')}
             </h1>
             <p className="text-xs text-text-muted">{str('VSLA Loan Appraisal & Confirmers', 'Okupima ekyewolo n’abakkiriza')}</p>
          </div>
        </div>
         <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-status-ok-bg text-status-ok-tx text-xs font-bold font-mono">
           {str('GROUP RULE', 'EKIGENDERWA')}: {borrowMultiplier}× {str('SAVINGS', 'YEEBIRI')}
            <InfoTip language={language} label={str('About the group rule', 'Kikwata ekigendererwa')} >{str('The secretary sets this rule in Group Settings.', 'Omuwandiisi ayoza eki kizibu mu Group Settings.')}</InfoTip>
         </span>
      </div>

      {isSubmitted ? (
        <section className="bg-status-ok-bg border-2 border-secondary rounded-xl p-6 text-center space-y-3">
          <span className="material-symbols-outlined text-4xl text-secondary">verified</span>
           <h2 className="text-headline-md font-bold text-status-ok-tx">{str('Loan request submitted!', 'Okusaba ekyewolo kwaweeredwa!')}</h2>
           <p className="text-xs text-emerald-800">
             {str(`Request for UGX ${requestedAmount.toLocaleString('en-US')} was sent to the approvals queue. Two different officers must each turn a key.`, `Okusaba UGX ${requestedAmount.toLocaleString('en-US')} kugenda mu kizibu ky’ebisanyizo. Abakozesa babiri bayo baetaagisa okuyoola ebisumuluzo.`)}
           </p>
          <div className="pt-2 flex gap-2">
            <button
               onClick={() => onNavigate(requestAsMemberNo ? 'member_home' : 'approvals')}
               className="flex-1 py-2.5 bg-secondary text-white text-xs font-bold rounded-lg"
             >
               {str(requestAsMemberNo ? 'Track my request' : 'Open Approvals Queue', requestAsMemberNo ? 'Ssoma ekigendererwa kange' : 'Sula ekizibu')}
            </button>
            <button
              onClick={() => setIsSubmitted(false)}
              className="py-2.5 px-3 bg-white border border-border-strong text-primary text-xs font-semibold rounded-lg"
            >
               {str('New request', 'Okusaba kukya')}
            </button>
          </div>
        </section>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Member Card */}
          <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                 {str('Applying member', 'Omukiise asaba')}
              </span>
              {lockedNo ? (
                <span className="px-2 py-0.5 rounded bg-status-ok-bg text-status-ok-tx text-xs font-bold">
                   {str('You', 'Gwe')} — #{lockedNo}
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
                     {str('No.', 'Namba')} {fullMember.no} · {fullMember.provider} {fullMember.phone}
                  </span>
                </div>
              </div>
              <div className="text-right">
                 <span className="text-[11px] text-text-muted block">{str('Shares saved', 'Emigabo ateredwa')}</span>
                <span className="font-mono text-xs font-bold text-primary">
                  UGX {shares.toLocaleString('en-US')}
                </span>
              </div>
            </div>

            {/* {borrowMultiplier}x borrowing limit banner */}
            <div className="bg-status-ok-bg/50 border border-secondary/30 rounded-lg p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-status-ok-tx font-medium">
                <span className="material-symbols-outlined text-base">rule</span>
                 <span>{str('Maximum allowed', 'Ekkano ekikomo')} ({borrowMultiplier}× {str('savings', 'nterekanya')}):</span>
              </div>
              <span className="font-mono font-bold text-secondary text-sm">
                UGX {maxLimit.toLocaleString('en-US')}
              </span>
            </div>

            {/* Eligibility display: {borrowMultiplier}x rule + one-active-loan, evaluated before submit */}
            <div className={`rounded-lg border p-3 space-y-2 text-xs ${eligible ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <p className="font-bold text-primary uppercase tracking-wider text-[11px] flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">fact_check</span>
                 {str('Eligibility check', 'Kukebera k’ekikomo')} ({str('before submit', 'nga tannasubira')})
              </p>
              <div className="flex items-center justify-between">
                 <span className="text-text-muted">1. {borrowMultiplier}× {str('savings rule', 'ekigendererwa kya nterekanya')}: UGX {shares.toLocaleString('en-US')} × {borrowMultiplier} = UGX {maxLimit.toLocaleString('en-US')}</span>
                <span className={`px-2 py-0.5 rounded font-bold ${overLimit ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                   {overLimit ? str('FAIL', 'Kikwene') : str('PASS', 'Mukiko')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">
                   2. {str('One active loan', 'Ekyewolo kimwe ekiri')} : {hasActiveLoan ? str(`UGX ${activeLoanBalance.toLocaleString('en-US')} outstanding`, `UGX ${activeLoanBalance.toLocaleString('en-US')} erisigadde`) : str('no active loan', 'tewali kikwene kya kuyoola')}
                </span>
                <span className={`px-2 py-0.5 rounded font-bold ${hasActiveLoan ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                   {hasActiveLoan ? str('BLOCKED', 'Kikwene') : str('CLEAR', 'Bulungi')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                 <span className="text-text-muted">3. {str('Amount within limit', 'Omuwendo mu kkano')}: UGX {requestedAmount.toLocaleString('en-US')}</span>
                <span className={`px-2 py-0.5 rounded font-bold ${eligible ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                   {eligible ? str('ELIGIBLE', 'Asabwa') : str('NOT ELIGIBLE', 'Terasoboka')}
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
               {str('Loan amount & term', 'Omuwendo gw’ekyewolo n’obutikidde') }
            </label>

            <div>
              <div className="flex items-baseline justify-between mb-1">
                 <span className="text-xs text-text-muted">{str('Requested amount', 'Omuwendo oguusaba')}</span>
                <span className="font-mono text-currency-lg text-primary font-bold">
                  UGX {requestedAmount.toLocaleString('en-US')}
                </span>
              </div>
              <input
                type="range"
                 min={loanMinimum}
                 max={Math.max(maxLimit, loanMinimum)}
                 step="50000"
                 value={Math.min(requestedAmount, Math.max(maxLimit, loanMinimum))}
                onChange={(e) => setRequestedAmount(Number(e.target.value))}
                className="w-full h-2 bg-canvas-bg rounded-lg appearance-none cursor-pointer accent-secondary"
              />
              <div className="flex justify-between text-[11px] text-text-muted font-mono mt-1">
                <span>UGX {loanMinimum.toLocaleString()}</span>
                 <span>{str('Max', 'Ekkano')}: UGX {maxLimit.toLocaleString('en-US')}</span>
              </div>
            </div>

            {/* Term Options */}
            <div>
               <span className="text-xs font-semibold text-text-muted block mb-1.5">{str('Repayment term', 'Obudde bwo okusasula')}</span>
              <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                {[
                   { id: '1 month', label: str('1 Month', 'Mwezi 1'), rate: `${loanRateForTerm('1 month', loanRates)}% (UGX ${Math.round(requestedAmount * loanRateForTerm('1 month', loanRates) / 100).toLocaleString('en-US')})` },
                   { id: '2 months', label: str('2 Months', 'Mwezi 2'), rate: `${loanRateForTerm('2 months', loanRates)}% (UGX ${Math.round(requestedAmount * loanRateForTerm('2 months', loanRates) / 100).toLocaleString('en-US')})` },
                   { id: '3 months', label: str('3 Months', 'Mwezi 3'), rate: `${loanRateForTerm('3 months', loanRates)}% (UGX ${Math.round(requestedAmount * loanRateForTerm('3 months', loanRates) / 100).toLocaleString('en-US')})` },
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
               <span className="text-xs font-semibold text-text-muted block mb-1">{str('Loan purpose', 'Ensonga y’ekyewolo')}</span>
              <input
                type="text"
                 value={purpose}
                 onChange={(e) => setPurpose(e.target.value)}
                 placeholder={str('What will you use the loan for?', 'Okwagenda ki?')}
                 className="w-full py-2 px-3 bg-canvas-bg border border-border-strong rounded-lg text-xs text-primary font-medium"
               />
               {secretaryPhone && (
                 <div className="mt-2 border-t border-border-line pt-2">
                   <p className="text-[11px] font-bold text-primary">{str('Need to ask by phone?', 'Tulina okubuuliza essimu?')}</p>
                   <div className="grid grid-cols-2 gap-1.5 mt-1">
                     <a href={smsHref(secretaryPhone, phoneRequestText)} className="min-h-[40px] rounded-lg bg-primary-container text-white text-[11px] font-bold flex items-center justify-center gap-1">SMS secretary</a>
                     <a href={waHref(secretaryPhone, phoneRequestText)} target="_blank" rel="noreferrer" className="min-h-[40px] rounded-lg bg-secondary text-white text-[11px] font-bold flex items-center justify-center gap-1">WhatsApp</a>
                   </div>
                   <p className="text-[10px] text-text-muted mt-1">Open the message, check it, then send it to {secretaryName}.</p>
                 </div>
               )}
             </div>
           </section>

          <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-secondary">verified_user</span>
                 {str('Confirmers', 'Abakkiriza')}
              </h3>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${guarantorsReady ? 'bg-status-ok-bg text-status-ok-tx' : 'bg-status-warn-bg text-status-warn-tx'}`}>
                {guarantorNos.length}/{requiredGuarantors}
              </span>
            </div>
            {requiredGuarantors === 0 ? (
               <p className="text-xs text-text-muted">{str('This group does not require confirmers for a loan.', 'Ekibiina kino tekiganda abakkiriza eri kigendererwa.')}</p>
            ) : (
              <>
                 <p className="text-[11px] text-text-muted">{str('Choose real members who agree to confirm this loan.', 'Londa abakiise abakwawa okukkiriza ekyewolo kino.')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {roster.filter((m) => m.no !== fullMember.no).map((m) => {
                    const selected = guarantorNos.includes(m.no);
                    return (
                      <button
                        key={m.no}
                        type="button"
                        onClick={() => setGuarantorNos((current) => selected ? current.filter((no) => no !== m.no) : [...current, m.no])}
                        className={`p-2 rounded-lg border text-left ${selected ? 'bg-primary-container text-white border-primary-container' : 'bg-canvas-bg border-border-line'}`}
                      >
                        <span className="font-bold block text-xs">#{m.no} {m.name.split(' ')[0]}</span>
                         <span className="text-[10px] opacity-80">UGX {m.sharesTotal.toLocaleString()} {str('saved', 'ziteredwa')}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* Summary Box */}
          <section className="bg-canvas-bg border border-border-line rounded-xl p-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between text-text-muted">
               <span>{str('Principal', 'Madda')}:</span>
              <span className="font-mono font-semibold text-primary">UGX {requestedAmount.toLocaleString('en-US')}</span>
            </div>
            <div className="flex justify-between text-text-muted">
               <span>{str('Service fee', 'Omuwendo ogw\'ekikola')} ({term}):</span>
              <span className="font-mono font-semibold text-primary">UGX {interestFee.toLocaleString('en-US')}</span>
            </div>
            <div className="flex justify-between font-bold text-primary pt-1.5 border-t border-border-line text-sm">
               <span>{str('Total repayable', 'Zonna ezikusoboka okusasula')}:</span>
              <span className="font-mono text-secondary">UGX {totalRepayable.toLocaleString('en-US')}</span>
            </div>
          </section>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={!eligible}
             title={blockReason || str('Submit loan request', 'Weereza okusaba kw’ekyewolo')}
            className={`w-full min-h-[52px] font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-sm active:scale-[0.99] transition ${eligible ? 'bg-[#15803D] hover:bg-[#0B3D2E] text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
          >
            <span className="material-symbols-outlined text-xl">send</span>
             <span>{eligible ? str('Submit loan request', 'Weereza okusaba kw’ekyewolo') : str('Blocked — see the checks above', 'Kikwene — kukebera ebiri wansi')}</span>
          </button>
        </form>
      )}
    </main>
  );
};
