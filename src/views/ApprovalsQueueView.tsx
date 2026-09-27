import React, { useState } from 'react';
import { ApprovalItem, Language, Member, UserAccount } from '../types';
import { isSameOfficer } from '../utils/dualApproval';
import { estimateMoMoFee, netAfterFee } from '../utils/momoFees';
import { findMemberPhoto } from '../utils/photo';
import { ledgerHash } from '../utils/ledgerHash';
import { MemberAvatar } from '../components/MemberAvatar';
import { ApprovalsKeyModal } from '../components/ApprovalsKeyModal';
import { PromptDialog } from '../components/ConfirmDialog';
import { KeyStepper } from '../components/KeyStepper';
import { smsHref, waHref } from '../utils/smsReminders';

export interface ApprovalCodeResult {
  code: string;
  phone: string;
  officerName: string;
  expiresAt?: string;
}

interface ApprovalsQueueViewProps {
  approvals: ApprovalItem[];
  /** Returns an error message, or null when the key turned. */
  onApprove: (id: string, payoutMethod?: string, key?: { officerId: string; pin: string }) => string | null;
  onRequestApprovalCode: (id: string, officerId: string) => Promise<ApprovalCodeResult | null>;
  onApproveWithCode: (id: string, code: string, payoutMethod?: string) => Promise<string | null>;
  onConfirmPayout: (id: string, method?: string) => string | null;
  onReject: (id: string, reason?: string) => void;
  dualAuth?: boolean;
  currentUserName?: string;
  /** Member directory for face photos (low-literacy verification). */
  members?: Member[];
  /** Accounts allowed to turn keys (verified by their own PIN). */
  officers?: UserAccount[];
  loanFundBalance?: number;
  welfareFundBalance?: number;
  boxCashBalance?: number;
  momoBalance?: number;
  language?: Language;
}

export const ApprovalsQueueView: React.FC<ApprovalsQueueViewProps> = ({
  approvals,
  onApprove,
  onRequestApprovalCode,
  onApproveWithCode,
  onConfirmPayout,
  onReject,
  dualAuth,
  currentUserName = '',
  members = [],
  officers = [],
  loanFundBalance = 0,
  welfareFundBalance = 0,
  boxCashBalance = 0,
  momoBalance = 0,
  language = 'EN',
}) => {
  const str = (en: string, lu: string) => (language === 'LU' ? lu : en);
  const [filter, setFilter] = useState<'all' | 'vsla_loan' | 'savings_withdrawal' | 'welfare_grant'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; name: string } | null>(null);
  const [payoutMethods, setPayoutMethods] = useState<Record<string, string>>({});
  const [keyTargetId, setKeyTargetId] = useState<string | null>(null);
  const [codeTargetId, setCodeTargetId] = useState<string | null>(null);
  const [codeInfo, setCodeInfo] = useState<ApprovalCodeResult | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeBusyId, setCodeBusyId] = useState<string | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  const payoutFor = (item: ApprovalItem) =>
    payoutMethods[item.id] || item.provider || (item.type === 'welfare_grant' ? 'Cash' : 'MTN');
  const welfareAvailabilityLabel = (item: ApprovalItem) =>
    (item.welfareAvailable ?? welfareFundBalance) >= item.amount
      ? str('Available', 'Ziri')
      : str('Too low', 'Tezingaffe');
  const payoutLabel = (method: string) => (method === 'Cash' ? str('Cash', 'Ssente nkalu') : method);
  const feeText = (amount: number, network: 'MTN' | 'Airtel' | 'Cash') => {
    if (network === 'Cash') return str('Cash handover — no fee.', 'Okuyisa ssente nkalu — nno mufee.');
    const fee = estimateMoMoFee(amount, network);
    const net = netAfterFee(amount, network);
    return str(
      `Est. ${network} fee ~UGX ${fee.toLocaleString()} · member receives ~UGX ${net.toLocaleString()}. Cash = 0 fee.`,
      `Mu fee wa ${network} kasinga oba UGX ${fee.toLocaleString()} · omukiise alafuna oba UGX ${net.toLocaleString()}. Ssente nkalu = fee 0.`
    );
  };

  const termLabel = (term: string) => {
    if (language !== 'LU') return term;
    const match = /^(\d+)\s+months?$/.exec(term);
    return match ? `${match[1]} ${match[1] === '1' ? 'mwezi' : 'emyezi'}` : term;
  };

  const decisionDate = (value: string) => {
    const date = new Date(value);
    if (language === 'LU') {
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const photoFor = (item: ApprovalItem) => findMemberPhoto(members, item.memberNo, item.memberName);
  const memberFor = (item: ApprovalItem) => members.find((member) => member.no === item.memberNo || member.name === item.memberName);
  const loanMember = (item: ApprovalItem) => memberFor(item);
  const loanIsCurrentlyEligible = (item: ApprovalItem) => {
    const member = loanMember(item);
    const maxBorrowable = member?.maxBorrowLimit ?? item.maxBorrowable ?? 0;
    const payout = payoutFor(item);
    const payoutBalance = payout === 'Cash' ? boxCashBalance : momoBalance;
    return !!member && (member.loanBalance || 0) <= 0 && maxBorrowable >= item.amount && loanFundBalance >= item.amount && payoutBalance >= item.amount;
  };

  const filteredApprovals = approvals.filter((app) => {
    if (app.status !== 'pending') return false;
    if (filter === 'all') return true;
    return app.type === filter;
  });

  const pendingCount = approvals.filter((a) => a.status === 'pending').length;
  const loanCount = approvals.filter((a) => a.type === 'vsla_loan' && a.status === 'pending').length;
  const withdrawalCount = approvals.filter((a) => a.type === 'savings_withdrawal' && a.status === 'pending').length;
  const welfareCount = approvals.filter((a) => a.type === 'welfare_grant' && a.status === 'pending').length;
  const sumBy = (t: ApprovalItem['type']) =>
    approvals.filter((a) => a.type === t && a.status === 'pending').reduce((s, a) => s + a.amount, 0);
  const loanTotal = sumBy('vsla_loan');
  const withdrawalTotal = sumBy('savings_withdrawal');
  const welfareTotal = sumBy('welfare_grant');
  const queueTotal = loanTotal + withdrawalTotal + welfareTotal;

  const handleAction = (id: string, action: 'approve' | 'reject', name: string) => {
    if (action === 'approve') {
      // Key ceremony: the officer holding the phone proves who they are.
      setKeyTargetId(id);
    } else {
      setRejectTarget({ id, name });
    }
  };

  const keyTarget = approvals.find((a) => a.id === keyTargetId) || null;
  const codeTarget = approvals.find((a) => a.id === codeTargetId) || null;

  const handleKeyConfirm = (officerId: string, pin: string): string | null => {
    if (!keyTarget) return str('Request expired. Close it and try again.', 'Olusaba lwadde. Ggalawo era gezaako.');
    const method = payoutFor(keyTarget);
    const wasSecondKey = !!keyTarget.firstApprovedBy;
    const err = onApprove(keyTarget.id, method, { officerId, pin });
    if (err) return err;
    setKeyTargetId(null);
    showToast(
      str(
        wasSecondKey
          ? `Key 2/2 approved — confirm the ${method} payout for ${keyTarget.memberName}.`
          : `Key 1/2 recorded for ${keyTarget.memberName} — a different officer must turn key 2/2.`,
        wasSecondKey
          ? `Kisumuluzo 2/2 kikkiriziddwa — kakasa okuyisa ${payoutLabel(method)} kwa ${keyTarget.memberName}.`
          : `Kisumuluzo 1/2 kikisegajjiddwa kwa ${keyTarget.memberName} — omukulu omulala aleeta okuyoola kisumuluzo 2/2.`
      )
    );
    return null;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const requestCode = async (item: ApprovalItem, officerId: string) => {
    setCodeError(null);
    setCodeBusyId(item.id);
    try {
      const result = await onRequestApprovalCode(item.id, officerId);
      if (!result) {
        setCodeError(str('Could not create an approval code.', 'Tessobola kukola koodi y’okukkiriza.'));
        return;
      }
      setCodeTargetId(item.id);
      setCodeInfo(result);
      setCodeInput('');
    } finally {
      setCodeBusyId(null);
    }
  };

  const submitCode = async (item: ApprovalItem) => {
    setCodeError(null);
    setCodeBusyId(item.id);
    try {
      const error = await onApproveWithCode(item.id, codeInput.trim(), item.payoutMethod || item.provider || 'Cash');
      if (error) {
        setCodeError(error);
        return;
      }
      setCodeTargetId(null);
      setCodeInfo(null);
      setCodeInput('');
      showToast(str('Phone confirmation recorded as key 1/2.', 'Ekikakateeko kya ssimu kikisegajjiddwa ku kisumuluzo 1/2.'));
    } finally {
      setCodeBusyId(null);
    }
  };

  const confirmPayout = (item: ApprovalItem) => {
    setPayoutError(null);
    const payoutMethod = item.payoutMethod || item.provider || 'Cash';
    const error = onConfirmPayout(item.id, payoutMethod);
    if (error) {
      setPayoutError(error);
      return;
    }
    showToast(
      str(
        `${item.memberName}'s ${item.payoutMethod || 'cash'} payout was confirmed.`,
        `Okuyisa kwa ${item.memberName} ku ${payoutLabel(payoutMethod)} kwakakasebwa.`
      )
    );
  };

  return (
    <main className="w-full max-w-lg mx-auto px-4 pt-4 flex-1 space-y-4 pb-12">
      {/* Toast */}
       {toastMessage && (
         <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-primary text-white text-xs px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 border border-border-strong animate-in fade-in">
           <span className="material-symbols-outlined text-secondary-fixed text-base">check_circle</span>
           <span>{toastMessage}</span>
         </div>
       )}
        {payoutError && <div className="bg-status-bad-bg border border-status-bad-tx/40 text-status-bad-tx text-xs font-bold rounded-lg p-3">{payoutError}</div>}
        {codeError && !codeTarget && <div className="bg-status-bad-bg border border-status-bad-tx/40 text-status-bad-tx text-xs font-bold rounded-lg p-3">{codeError}</div>}

      {/* STICKY QUEUE TITLE & RECONCILIATION SUMMARY BAR */}
      <div className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-headline-lg font-headline-lg text-primary tracking-tight font-bold">
              {str('Approvals Queue', 'Ebisanyizo birindiririra')}
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm font-label-sm bg-status-warn-bg text-status-warn-tx font-semibold border border-amber-300 text-xs">
              <span className="material-symbols-outlined text-[14px]">pending</span>
              {pendingCount} {str('Pending', 'birindirira')}
            </span>
          </div>
          <div className="text-right">
            <span className="text-label-sm font-label-sm text-text-muted block text-xs">
              {str('Queue Total', 'Omugatte w’ebisanyizo')}
            </span>
            <span className="font-mono text-currency-sm font-bold text-primary">
              UGX {queueTotal.toLocaleString('en-US')}
            </span>
          </div>
        </div>

        {/* Grouped counts + totals by type */}
        <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
          <div className="bg-canvas-bg border border-border-line rounded-lg p-2">
            <span className="block font-bold text-primary">{str('Loans', 'Ebyewolo')} · {loanCount}</span>
            <span className="font-mono text-text-muted">UGX {loanTotal.toLocaleString('en-US')}</span>
          </div>
          <div className="bg-canvas-bg border border-border-line rounded-lg p-2">
            <span className="block font-bold text-primary">{str('Withdrawals', 'Okuggyamu nterekanya')} · {withdrawalCount}</span>
            <span className="font-mono text-text-muted">UGX {withdrawalTotal.toLocaleString('en-US')}</span>
          </div>
          <div className="bg-canvas-bg border border-border-line rounded-lg p-2">
            <span className="block font-bold text-primary">{str('Welfare', 'Obuyambi')} · {welfareCount}</span>
            <span className="font-mono text-text-muted">UGX {welfareTotal.toLocaleString('en-US')}</span>
          </div>
        </div>

        {/* Security / Audit Banner */}
        <div className="bg-surface-container-low border border-border-line rounded-lg p-2.5 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
          <p className="text-label-sm font-label-sm text-text-muted leading-snug text-xs">
            {str(
              'Two-key rule: 2 DIFFERENT officers must approve. Each turns their key with their own PIN — hand the phone over.',
              'Mateeka ga bisumuluzo emitendera: abakozesa ABAALI BWE BAKUJAANIDDWA balina okukkiriza. Buli mukulu ayoola kisumuluzo kye akakola n’ebikwate bye akawa — muke ssimu eri omukulu.'
            )}
            {dualAuth
              ? str(' Sign-in is enforced. Every key is stamped with the officer’s name below.', ' Okuyingira kukakibwa. Kisumuluzo kya buli mukulu kikinyooledwa eri emmala ey’akakulembera wansi.')
              : str(' Single-device mode: switch account between key 1 and key 2.', ' Enkola y’ekitundu kimu: kyusa akawunti wakati wa kisumuluzo 1 n’ekisumuluzo 2.')}
          </p>
        </div>
      </div>

      {/* HORIZONTAL FILTER TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
        <button
          onClick={() => setFilter('all')}
          className={`whitespace-nowrap px-3.5 py-2 rounded-lg text-label-md font-label-md font-semibold min-h-[44px] flex items-center gap-1.5 active:scale-95 transition-all text-xs ${
            filter === 'all'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface-card text-text-muted hover:text-primary border border-border-line'
          }`}
          type="button"
        >
          <span>{str('All', 'Byonna')} ({pendingCount})</span>
        </button>

        <button
          onClick={() => setFilter('vsla_loan')}
          className={`whitespace-nowrap px-3.5 py-2 rounded-lg text-label-md font-label-md font-medium min-h-[44px] flex items-center gap-1.5 active:scale-95 transition-all text-xs ${
            filter === 'vsla_loan'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface-card text-text-muted hover:text-primary border border-border-line'
          }`}
          type="button"
        >
          <span>{str('VSLA Loans', 'Ebyewolo bya VSLA')} ({loanCount})</span>
        </button>

        <button
          onClick={() => setFilter('savings_withdrawal')}
          className={`whitespace-nowrap px-3.5 py-2 rounded-lg text-label-md font-label-md font-medium min-h-[44px] flex items-center gap-1.5 active:scale-95 transition-all text-xs ${
            filter === 'savings_withdrawal'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface-card text-text-muted hover:text-primary border border-border-line'
          }`}
          type="button"
        >
          <span>{str('Savings Withdrawals', 'Okuggyamu nnterekanya')} ({withdrawalCount})</span>
        </button>

        <button
          onClick={() => setFilter('welfare_grant')}
          className={`whitespace-nowrap px-3.5 py-2 rounded-lg text-label-md font-label-md font-medium min-h-[44px] flex items-center gap-1.5 active:scale-95 transition-all text-xs ${
            filter === 'welfare_grant'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface-card text-text-muted hover:text-primary border border-border-line'
          }`}
          type="button"
        >
          <span>{str('Welfare Grants', 'Mikisa y’obuyambi')} ({welfareCount})</span>
        </button>
      </div>

      {/* PENDING APPROVAL CARDS CONTAINER */}
      <div className="space-y-4">
        {filteredApprovals.length === 0 ? (
          <div className="bg-surface-card border border-border-line rounded-xl p-8 text-center space-y-2">
            <span className="material-symbols-outlined text-4xl text-secondary">
              check_circle
            </span>
            <h3 className="font-bold text-primary">{str('Queue All Cleared', 'Ebisanyizo byonna bimaze')}</h3>
            <p className="text-xs text-text-muted">
              {str(
                'No pending approvals require an executive signature under this filter.',
                'Tewali bisanyizo birindirira ebikwata omukono w’abakiriza mu lukiiso luno.'
              )}
            </p>
          </div>
        ) : (
          filteredApprovals.map((item) => {
            if (item.type === 'vsla_loan') {
              return (
                <div
                  key={item.id}
                  className="bg-surface-card border border-border-line rounded-xl shadow-[0px_1px_3px_rgba(0,0,0,0.08)] overflow-hidden transition-all"
                >
                  <div className="bg-surface-container-low px-4 py-2.5 border-b border-border-line flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-label-sm font-semibold bg-primary text-primary-fixed border border-primary text-xs">
                        <span className="material-symbols-outlined text-[14px]">account_balance</span>
{str('VSLA Loan', 'Ekyewolo kya VSLA')}
                      </span>
                      <span className="text-xs text-text-muted font-mono">{item.reqNumber}</span>
                    </div>
                    <span className="text-xs text-text-muted flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      {item.timeText}
                    </span>
                  </div>

                  <div className="p-4 space-y-3.5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <MemberAvatar name={item.memberName} photoUrl={photoFor(item)} sizeClass="w-11 h-11 text-sm" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-headline-sm text-primary">
                              {item.memberName}
                            </span>
                            <span className="text-xs bg-border-line text-text-muted font-bold px-1.5 py-0.5 rounded">
                              {str('No.', 'Namba')} {item.memberNo}
                            </span>
                          </div>
                          {item.phone && (
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-text-muted">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-900 font-bold border border-yellow-300 text-[11px]">
                                {item.provider} MoMo
                              </span>
                              <span className="font-mono text-on-surface">{item.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-text-muted block">{str('Initiator', 'Omutandika')}</span>
                        <span className="text-xs font-semibold text-primary">{item.initiator}</span>
                       </div>
                       {item.purpose && <p className="text-[11px] text-text-muted mt-1">{str('Purpose:', 'Ensonga:')} {item.purpose}</p>}
                     </div>

                     <div className="bg-surface p-3 rounded-lg border border-border-line">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-text-muted">{str('Loan Principal', 'Nkusunkulwa k\'ekyewolo')}</span>
                        <div className="text-right">
                          <span className="font-mono text-currency-display text-primary leading-none text-xl font-bold">
                            UGX {item.amount.toLocaleString('en-US')}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-border-line flex items-center justify-between text-xs text-text-muted">
                        <span>
                          {str('Term:', 'Kiseeko:')} <strong className="text-primary">{termLabel(item.term)}</strong>
                        </span>
                        <span>
                          {str('Service Fee:', 'Nkusunkulwa k\'omulimu:')}{' '}
                          <strong className="text-primary font-mono">
                            UGX {(item.serviceFee || 0).toLocaleString('en-US')}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <details className={`rounded-lg border ${loanIsCurrentlyEligible(item) ? 'bg-status-ok-bg/40 border-emerald-200' : 'bg-status-warn-bg border-amber-200'}`}>
                      <summary className="p-3 flex items-center justify-between cursor-pointer list-none">
                        <span className={`flex items-center gap-1.5 text-xs font-semibold ${loanIsCurrentlyEligible(item) ? 'text-status-ok-tx' : 'text-status-warn-tx'}`}>
                          <span className="material-symbols-outlined text-[18px]">{loanIsCurrentlyEligible(item) ? 'check_circle' : 'warning'}</span>
                          {loanIsCurrentlyEligible(item)
                            ? str('Current checks pass', 'Ebiseeko bya kino biri bulungi')
                            : str('Check before approving', 'Kebeera nga tosasanya')}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${loanIsCurrentlyEligible(item) ? 'bg-status-ok-bg text-status-ok-tx border-emerald-300' : 'bg-white text-status-warn-tx border-amber-300'}`}>
                          {loanIsCurrentlyEligible(item) ? str('PASS', 'KIRINGANA') : str('REVIEW', 'KEBERA')}
                        </span>
                      </summary>
                      <div className="px-3 pb-3 space-y-1.5">
                        <div className="text-xs text-on-surface grid grid-cols-2 gap-2 pt-1 border-t border-border-line">
                          <div>
                            <span className="block text-text-muted">{str('Live savings:', 'Nnterekanya ez\'ekirabira:')}</span>
                            <span className="font-mono font-semibold">UGX {(loanMember(item)?.sharesTotal ?? item.totalSavings ?? 0).toLocaleString('en-US')}</span>
                          </div>
                          <div>
                            <span className="block text-text-muted">{str('Loan fund available:', 'Ssente z\'ebyewolo eziri:')}</span>
                            <span className="font-mono font-semibold">UGX {loanFundBalance.toLocaleString('en-US')}</span>
                          </div>
                        </div>
                        {!loanIsCurrentlyEligible(item) && (
                          <p className="text-[11px] font-bold text-status-warn-tx">{str('One or more current checks need attention before approval.', 'Kimu ku ebiseeko bino bisobola kukikwata mukulembera w’okukkiriza.')}</p>
                        )}
                      </div>
                     </details>

                     <div className="rounded-lg border border-border-line bg-canvas-bg p-2.5 space-y-2">
                       <div className="flex items-center justify-between gap-2">
                         <span className="text-[11px] font-bold text-primary">{str('Approve from another phone', 'Kkiriza okuva ku ssimu enda')}</span>
                         <button
                           type="button"
                            disabled={codeBusyId === item.id || officers.filter((officer) => officer.permissions.canApproveLoans).length === 0}
                            onClick={() => {
                              const officer = officers.find((candidate) => candidate.permissions.canApproveLoans);
                              if (officer) void requestCode(item, officer.id);
                            }}
                            className="min-h-[40px] px-3 rounded-lg bg-primary text-white text-[11px] font-bold disabled:opacity-40"
                          >
                            {codeBusyId === item.id ? str('Wait…', 'Ggula…') : str('Get code', 'Kola koodi')}
                         </button>
                       </div>
                       {codeTarget?.id === item.id && codeInfo && (
                         <div className="space-y-2 border-t border-border-line pt-2">
                             <p className="text-[11px] text-text-muted">
                               {str(
                                 `Open a message to ${codeInfo.officerName} and send this code. It expires shortly${codeInfo.expiresAt ? ` at ${new Date(codeInfo.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}.`,
                                 `Sindika koodi eno eri ${codeInfo.officerName} mu ssimu${codeInfo.expiresAt ? ` ku ${new Date(codeInfo.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}.`
                               )}
                             </p>
                           <p className="font-mono text-xl font-bold tracking-[0.35em] text-primary">{codeInfo.code}</p>
                           <div className="grid grid-cols-2 gap-1.5">
                             <a href={smsHref(codeInfo.phone, str(`Loan approval ${item.reqNumber}: enter code ${codeInfo.code} in the VSLA app.`, `Okukkiriza ekyewolo ${item.reqNumber}: yingiza koodi ${codeInfo.code} mu VSLA.`))} className="min-h-[40px] rounded-lg bg-[#0b3d2e] text-white text-[11px] font-bold flex items-center justify-center gap-1">{str('SMS code', 'Koodi mu SMS')}</a>
                             <a href={waHref(codeInfo.phone, str(`Loan approval ${item.reqNumber}: enter code ${codeInfo.code} in the VSLA app.`, `Okukkiriza ekyewolo ${item.reqNumber}: yingiza koodi ${codeInfo.code} mu VSLA.`))} target="_blank" rel="noreferrer" className="min-h-[40px] rounded-lg bg-[#006d30] text-white text-[11px] font-bold flex items-center justify-center gap-1">WhatsApp</a>
                           </div>
                           <div className="flex gap-1.5">
                             <input value={codeInput} onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder={str('Enter code', 'Yingiza koodi')} aria-label={str('Approval code', 'Koodi y’okukkiriza')} className="flex-1 min-h-[40px] border border-border-line rounded-lg px-2 text-sm font-mono" />
                              <button type="button" disabled={codeBusyId === item.id} onClick={() => void submitCode(item)} className="min-h-[40px] px-3 rounded-lg bg-primary text-white text-[11px] font-bold disabled:opacity-40">{codeBusyId === item.id ? str('Wait…', 'Ggula…') : str('Use code', 'Kozesa koodi')}</button>
                           </div>
                           {codeError && <p className="text-[11px] font-bold text-status-bad-tx">{codeError}</p>}
                         </div>
                       )}
                     </div>
                     <KeyStepper firstBy={item.firstApprovedBy} language={language} />
                    {currentUserName && item.firstApprovedBy && isSameOfficer(item, currentUserName) && (
                      <p className="text-[11px] text-status-bad-tx bg-status-bad-bg border border-red-200 rounded-lg p-2">
                        {str(
                          'You turned key 1/2. A DIFFERENT officer must turn key 2/2 — switching account is required.',
                          'Wookola kisumuluzo 1/2. Omukulu OMULALA aleeta okuyoola kisumuluzo 2/2 — okusengukuka mu akawuntu kukuluwa.'
                        )}
                      </p>
                    )}
                    <p className="text-[11px] text-text-muted bg-canvas-bg border border-border-line rounded-lg p-2">
                      {feeText(item.amount, (payoutFor(item) as 'MTN' | 'Airtel' | 'Cash') || 'Cash')}
                    </p>

                    <div className="flex items-center justify-between gap-2 bg-canvas-bg border border-border-line rounded-lg p-2.5">
                      <span className="text-[11px] font-bold text-primary uppercase">{str('Payout method', 'Enkola yokuyisa ssente')}</span>
                      <div className="flex gap-1.5">
                        {(['MTN', 'Airtel', 'Cash'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPayoutMethods((p) => ({ ...p, [item.id]: m }))}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border min-h-[36px] ${payoutFor(item) === m ? 'bg-primary text-white border-primary' : 'bg-white text-text-muted border-border-line'}`}
                          >
                            {payoutLabel(m)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <button
                        onClick={() => handleAction(item.id, 'reject', item.memberName)}
                        className="min-h-[56px] px-3 bg-status-bad-bg border-2 border-status-bad-tx text-status-bad-tx text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform hover:bg-red-100"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                        <span>{str('Reject', 'Gana')}</span>
                      </button>
                      <button
                        onClick={() => handleAction(item.id, 'approve', item.memberName)}
                        className="min-h-[56px] px-3 bg-[#15803D] hover:bg-[#0B3D2E] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-sm focus:ring-4 focus:ring-emerald-200"
                      >
                        <span className="material-symbols-outlined text-[18px]">key</span>
                        <span>{item.firstApprovedBy ? str('Turn key 2/2 — release', 'Yoola kisumuluzo 2/2 — funyuzya') : str('Turn key 1/2', 'Yoola kisumuluzo 1/2')} ({payoutLabel(payoutFor(item))})</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            if (item.type === 'welfare_grant') {
              return (
                <div
                  key={item.id}
                  className="bg-surface-card border border-border-line rounded-xl shadow-[0px_1px_3px_rgba(0,0,0,0.08)] overflow-hidden transition-all"
                >
                  <div className="bg-surface-container-low px-4 py-2.5 border-b border-border-line flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-tertiary-container text-tertiary-fixed border border-tertiary">
                        <span className="material-symbols-outlined text-[14px]">health_and_safety</span>
                        {str('Welfare Emergency Grant', 'Mikisa y’obuyambi mu buzibu')}
                      </span>
                      <span className="text-xs text-text-muted">{str('Non-Repayable', 'Tekasasulwa')}</span>
                    </div>
                    <span className="text-xs text-text-muted flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      {item.timeText}
                    </span>
                  </div>

                  <div className="p-4 space-y-3.5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <MemberAvatar name={item.memberName} photoUrl={photoFor(item)} sizeClass="w-11 h-11 text-sm" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-headline-sm text-primary">
                              {item.memberName}
                            </span>
                            <span className="text-xs bg-border-line text-text-muted font-bold px-1.5 py-0.5 rounded">
                              {str('No.', 'Namba')} {item.memberNo}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-text-muted flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px] text-red-600">
                              local_hospital
                            </span>
                            <span className="font-medium text-primary">{item.reason}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-text-muted block">{str('Initiator', 'Omutandika')}</span>
                        <span className="text-xs font-semibold text-primary">{item.initiator}</span>
                      </div>
                    </div>

                    <div className="bg-surface p-3 rounded-lg border border-border-line flex items-center justify-between">
                      <span className="text-xs text-text-muted">{str('Approved Grant Sum', 'Omugatte gw’mikisa ekikkiriziddwa')}</span>
                      <span className="font-mono text-currency-lg text-primary font-bold">
                        UGX {item.amount.toLocaleString('en-US')}
                      </span>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-status-ok-tx text-[18px]">
                          account_balance_wallet
                        </span>
                        <div className="text-xs">
                          <span className="text-text-muted block">{str('Welfare Box Available', 'Enkoba y’obuyambi eri mu sanduuko')}</span>
                          <span className="font-mono font-bold text-status-ok-tx">
                            UGX {(item.welfareAvailable ?? welfareFundBalance).toLocaleString('en-US')}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold bg-status-ok-bg text-status-ok-tx px-2 py-0.5 rounded border border-emerald-300">
                         {welfareAvailabilityLabel(item)}
                      </span>
                    </div>

                    <KeyStepper firstBy={item.firstApprovedBy} language={language} />
                    <p className="text-[11px] text-text-muted bg-canvas-bg border border-border-line rounded-lg p-2">
                      {feeText(item.amount, (payoutFor(item) as 'MTN' | 'Airtel' | 'Cash') || 'Cash')}
                    </p>

                    <div className="flex items-center justify-between gap-2 bg-canvas-bg border border-border-line rounded-lg p-2.5">
                      <span className="text-[11px] font-bold text-primary uppercase">{str('Payout method', 'Enkola yokuyisa ssente')}</span>
                      <div className="flex gap-1.5">
                        {(['Cash', 'MTN', 'Airtel'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPayoutMethods((p) => ({ ...p, [item.id]: m }))}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border min-h-[36px] ${payoutFor(item) === m ? 'bg-primary text-white border-primary' : 'bg-white text-text-muted border-border-line'}`}
                          >
                            {payoutLabel(m)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <button
                        onClick={() => handleAction(item.id, 'reject', item.memberName)}
                        className="min-h-[56px] px-3 bg-status-bad-bg border-2 border-status-bad-tx text-status-bad-tx text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform hover:bg-red-100"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                        <span>{str('Reject', 'Gana')}</span>
                      </button>
                      <button
                        onClick={() => handleAction(item.id, 'approve', item.memberName)}
                        className="min-h-[56px] px-3 bg-[#15803D] hover:bg-[#0B3D2E] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-sm focus:ring-4 focus:ring-emerald-200"
                      >
                        <span className="material-symbols-outlined text-[18px]">key</span>
                        <span>{item.firstApprovedBy ? str('Key 2/2 — release', 'Kisumuluzo 2/2 — funyuzya') : str('Key 1/2', 'Kisumuluzo 1/2')} ({payoutLabel(payoutFor(item))})</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            if (item.type === 'savings_withdrawal') {
              return (
                <div
                  key={item.id}
                  className="bg-surface-card border border-border-line rounded-xl shadow-[0px_1px_3px_rgba(0,0,0,0.08)] overflow-hidden transition-all"
                >
                  <div className="bg-surface-container-low px-4 py-2.5 border-b border-border-line flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-surface-container-highest text-primary border border-border-strong">
                        <span className="material-symbols-outlined text-[14px]">savings</span>
                        {str('Savings Withdrawal', 'Okuggyamu nterekanya')} ({item.reqNumber})
                      </span>
                    </div>
                    <span className="text-xs text-text-muted flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      {item.timeText}
                    </span>
                  </div>

                  <div className="p-4 space-y-3.5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <MemberAvatar name={item.memberName} photoUrl={photoFor(item)} sizeClass="w-11 h-11 text-sm" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-headline-sm text-primary">
                              {item.memberName}
                            </span>
                            <span className="text-xs bg-border-line text-text-muted font-bold px-1.5 py-0.5 rounded">
                              {str('No.', 'Namba')} {item.memberNo}
                            </span>
                          </div>
                          {item.phone && (
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-text-muted">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-900 font-bold border border-red-300 text-[11px]">
                                {item.provider} MoMo
                              </span>
                              <span className="font-mono text-on-surface">{item.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-text-muted block">{str('Account Balance', 'Oluzibwa mu akawunti')}</span>
                        <span className="font-mono text-xs font-bold text-primary">
                          UGX {(item.accountBalance ?? loanMember(item)?.sharesTotal ?? 0).toLocaleString('en-US')}
                        </span>
                      </div>
                    </div>

                    <div className="bg-surface p-3 rounded-lg border border-border-line flex items-center justify-between">
                      <span className="text-xs text-text-muted">{str('Requested Payout', 'Ssente ezikusabidwa')}</span>
                      <div className="text-right">
                        <span className="font-mono text-currency-lg text-primary font-bold">
                          UGX {item.amount.toLocaleString('en-US')}
                        </span>
                        <span className="text-xs text-text-muted block">
                          {str('Balance after withdrawal:', 'Oluzibwa oluza okuggya:')} UGX {Math.max(0, (item.accountBalance ?? loanMember(item)?.sharesTotal ?? 0) - item.amount).toLocaleString('en-US')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-canvas-bg border border-border-line rounded-lg p-2.5">
                      <span className="text-[11px] font-bold text-primary uppercase">{str('Payout method', 'Enkola yokuyisa ssente')}</span>
                      <div className="flex gap-1.5">
                        {(['Airtel', 'MTN', 'Cash'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPayoutMethods((p) => ({ ...p, [item.id]: m }))}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border min-h-[36px] ${payoutFor(item) === m ? 'bg-primary text-white border-primary' : 'bg-white text-text-muted border-border-line'}`}
                          >
                            {payoutLabel(m)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <KeyStepper firstBy={item.firstApprovedBy} language={language} />

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <button
                        onClick={() => handleAction(item.id, 'reject', item.memberName)}
                        className="min-h-[56px] px-3 bg-status-bad-bg border-2 border-status-bad-tx text-status-bad-tx text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform hover:bg-red-100"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                        <span>{str('Reject', 'Gana')}</span>
                      </button>
                      <button
                        onClick={() => handleAction(item.id, 'approve', item.memberName)}
                        className="min-h-[56px] px-3 bg-[#15803D] hover:bg-[#0B3D2E] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-sm focus:ring-4 focus:ring-emerald-200"
                      >
                        <span className="material-symbols-outlined text-[18px]">key</span>
                        <span>{item.firstApprovedBy ? str('Key 2/2 — release', 'Kisumuluzo 2/2 — funyuzya') : str('Key 1/2', 'Kisumuluzo 1/2')} ({payoutLabel(payoutFor(item))})</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return null;
          })
        )}
      </div>

      {/* DECIDED HISTORY — who approved/rejected, when, through which channel */}
      {(() => {
        const decided = approvals.filter((a) => a.status !== 'pending').slice(0, 10);
        if (decided.length === 0) return null;
        return (
          <section className="bg-surface-card border border-border-line rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
              {str('Recently decided', 'Ebiyaliwo ekiguddwa')} ({decided.length})
            </h3>
            {decided.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-2 p-2 bg-canvas-bg rounded-lg border border-border-line text-xs">
                <div className="min-w-0 flex items-center gap-2">
                  <MemberAvatar name={d.memberName} photoUrl={photoFor(d)} sizeClass="w-8 h-8 text-[11px]" />
                  <div className="min-w-0">
                    <span className="font-bold text-primary block truncate">
                      {d.memberName} <span className="font-mono text-text-muted">#{d.memberNo}</span>
                    </span>
                    <span className="text-[11px] text-text-muted block truncate">
                      {d.reqNumber} · {d.decidedBy ? str(`by ${d.decidedBy}`, `eri ${d.decidedBy}`) : str('by officer', 'eri omukulu')}
                      {d.decidedAt ? ` · ${decisionDate(d.decidedAt)}` : ''}
                      {d.payoutMethod ? ` · ${str('via', 'ku')} ${payoutLabel(d.payoutMethod)}` : ''}
                      {d.status === 'rejected' && d.rejectReason ? ` · "${d.rejectReason}"` : ''}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-primary block">UGX {d.amount.toLocaleString('en-US')}</span>
                     <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${d.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                       {d.status === 'approved' && d.payoutStatus === 'confirmed'
                         ? str('PAID', 'EDIDDWA')
                         : d.status === 'approved'
                           ? str('APPROVED', 'KUKKIRIZIDDWA')
                           : d.status === 'rejected'
                             ? str('REJECTED', 'KUGANYIDDWA')
                             : str(d.status.toUpperCase(), d.status)}
                     </span>
                     {d.status === 'approved' && d.payoutStatus !== 'confirmed' && (
                       <button type="button" onClick={() => confirmPayout(d)} className="mt-1 min-h-[36px] px-2 rounded-lg bg-primary text-white text-[10px] font-bold">{str('Confirm payout', 'Kakasa okuyisa')}</button>
                     )}
                </div>
              </div>
            ))}
          </section>
        );
      })()}

      {/* PERSISTENT RECONCILIATION SUMMARY BOTTOM DOCK */}
      <div className="p-3 bg-white border border-border-line rounded-lg text-center shadow-sm">
        <p className="text-xs text-text-muted flex items-center justify-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-primary">
            sync_saved_locally
          </span>
          {str('Offline Sync Ready • Group Ledger Hash:', 'Tewali mu mutimbagano • Koodi y’ekitabo ky’ekibiina:')} {' '}
          <span className="font-mono text-primary font-semibold">{ledgerHash(approvals)}</span>
        </p>
      </div>

      {keyTarget && (
        <ApprovalsKeyModal
          isOpen={!!keyTarget}
           keyLabel={keyTarget.firstApprovedBy ? str('Key 2/2 — approve payout', 'Kisumuluzo 2/2 — kkiriza okuyisa') : str('Key 1/2', 'Kisumuluzo 1/2')}
          memberLine={`${keyTarget.memberName} (#${keyTarget.memberNo})`}
          amountText={`UGX ${keyTarget.amount.toLocaleString('en-US')}`}
          officers={officers}
          excludeName={keyTarget.firstApprovedBy}
          onCancel={() => setKeyTargetId(null)}
          onConfirm={handleKeyConfirm}
        />
      )}
      <PromptDialog
        isOpen={!!rejectTarget}
        title={rejectTarget
          ? str(`Why is ${rejectTarget.name}'s request being rejected?`, `Lwaki olusaba lwa ${rejectTarget.name} lungaganyiddwa?`)
          : str('Reject request', 'Gana olusaba')}
        placeholder={str('Reason (optional — shown in history)', 'Ensonga (kirii ky’ekitundu — kikwonekera mu byafaayo)')}
        confirmLabel={str('Reject request', 'Gana olusaba')}
        language={language}
        onSubmit={(reason) => {
          if (reason !== null && rejectTarget) {
            onReject(rejectTarget.id, reason.trim() || undefined);
            showToast(str(`Request for ${rejectTarget.name} rejected.`, `Olusaba lwa ${rejectTarget.name} luganyiddwa.`));
          }
          setRejectTarget(null);
        }}
      />
    </main>
  );
};
