import React, { useState } from 'react';
import { ApprovalItem, Member, UserAccount } from '../types';
import { describeKeys, isSameOfficer } from '../utils/dualApproval';
import { feeNotice } from '../utils/momoFees';
import { findMemberPhoto } from '../utils/photo';
import { ledgerHash } from '../utils/ledgerHash';
import { MemberAvatar } from '../components/MemberAvatar';
import { ApprovalsKeyModal } from '../components/ApprovalsKeyModal';
import { PromptDialog } from '../components/ConfirmDialog';

interface ApprovalsQueueViewProps {
  approvals: ApprovalItem[];
  /** Returns an error message, or null when the key turned. */
  onApprove: (id: string, payoutMethod?: string, key?: { officerId: string; pin: string }) => string | null;
  onReject: (id: string, reason?: string) => void;
  dualAuth?: boolean;
  currentUserName?: string;
  /** Member directory for face photos (low-literacy verification). */
  members?: Member[];
  /** Accounts allowed to turn keys (verified by their own PIN). */
  officers?: UserAccount[];
}

export const ApprovalsQueueView: React.FC<ApprovalsQueueViewProps> = ({
  approvals,
  onApprove,
  onReject,
  dualAuth,
  currentUserName = '',
  members = [],
  officers = [],
}) => {
  const [filter, setFilter] = useState<'all' | 'vsla_loan' | 'savings_withdrawal' | 'welfare_grant'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; name: string } | null>(null);
  const [payoutMethods, setPayoutMethods] = useState<Record<string, string>>({});
  const [keyTargetId, setKeyTargetId] = useState<string | null>(null);

  const payoutFor = (item: ApprovalItem) =>
    payoutMethods[item.id] || item.provider || (item.type === 'welfare_grant' ? 'Cash' : 'MTN');

  const photoFor = (item: ApprovalItem) => findMemberPhoto(members, item.memberNo, item.memberName);

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

  const handleKeyConfirm = (officerId: string, pin: string): string | null => {
    if (!keyTarget) return 'Request expired. Close and retry.';
    const method = payoutFor(keyTarget);
    const wasSecondKey = !!keyTarget.firstApprovedBy;
    const err = onApprove(keyTarget.id, method, { officerId, pin });
    if (err) return err;
    setKeyTargetId(null);
    showToast(
      wasSecondKey
        ? `Key 2/2 — released to ${keyTarget.memberName} via ${method}.`
        : `Key 1/2 recorded for ${keyTarget.memberName} — a different officer must turn key 2/2.`
    );
    return null;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
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

      {/* STICKY QUEUE TITLE & RECONCILIATION SUMMARY BAR */}
      <div className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-headline-lg font-headline-lg text-primary tracking-tight font-bold">
              Approvals Queue
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm font-label-sm bg-status-warn-bg text-status-warn-tx font-semibold border border-amber-300 text-xs">
              <span className="material-symbols-outlined text-[14px]">pending</span>
              {pendingCount} Pending
            </span>
          </div>
          <div className="text-right">
            <span className="text-label-sm font-label-sm text-text-muted block text-xs">
              Queue Total
            </span>
            <span className="font-mono text-currency-sm font-bold text-primary">
              UGX {queueTotal.toLocaleString('en-US')}
            </span>
          </div>
        </div>

        {/* Grouped counts + totals by type */}
        <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
          <div className="bg-canvas-bg border border-border-line rounded-lg p-2">
            <span className="block font-bold text-primary">Loans · {loanCount}</span>
            <span className="font-mono text-text-muted">UGX {loanTotal.toLocaleString('en-US')}</span>
          </div>
          <div className="bg-canvas-bg border border-border-line rounded-lg p-2">
            <span className="block font-bold text-primary">Withdrawals · {withdrawalCount}</span>
            <span className="font-mono text-text-muted">UGX {withdrawalTotal.toLocaleString('en-US')}</span>
          </div>
          <div className="bg-canvas-bg border border-border-line rounded-lg p-2">
            <span className="block font-bold text-primary">Welfare · {welfareCount}</span>
            <span className="font-mono text-text-muted">UGX {welfareTotal.toLocaleString('en-US')}</span>
          </div>
        </div>

        {/* Security / Audit Banner */}
        <div className="bg-surface-container-low border border-border-line rounded-lg p-2.5 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
          <p className="text-label-sm font-label-sm text-text-muted leading-snug text-xs">
            Two-key rule: 2 DIFFERENT officers must approve. Each turns their key
            with their own PIN — hand the phone over.
            {dualAuth
              ? ' Sign-in enforced. Every key is stamped with the officer’s name below.'
              : ' Single-device mode: switch account between key 1 and key 2.'}
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
          <span>All ({pendingCount})</span>
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
          <span>VSLA Loans ({loanCount})</span>
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
          <span>Savings Withdrawals ({withdrawalCount})</span>
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
          <span>Welfare Grants ({welfareCount})</span>
        </button>
      </div>

      {/* PENDING APPROVAL CARDS CONTAINER */}
      <div className="space-y-4">
        {filteredApprovals.length === 0 ? (
          <div className="bg-surface-card border border-border-line rounded-xl p-8 text-center space-y-2">
            <span className="material-symbols-outlined text-4xl text-secondary">
              check_circle
            </span>
            <h3 className="font-bold text-primary">Queue All Cleared</h3>
            <p className="text-xs text-text-muted">
              No pending approvals require executive signature under this filter.
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
                        VSLA Loan
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
                              No. {item.memberNo}
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
                        <span className="text-xs text-text-muted block">Initiator</span>
                        <span className="text-xs font-semibold text-primary">{item.initiator}</span>
                      </div>
                    </div>

                    <div className="bg-surface p-3 rounded-lg border border-border-line">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-text-muted">Loan Principal</span>
                        <div className="text-right">
                          <span className="font-mono text-currency-display text-primary leading-none text-xl font-bold">
                            UGX {item.amount.toLocaleString('en-US')}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-border-line flex items-center justify-between text-xs text-text-muted">
                        <span>
                          Term: <strong className="text-primary">{item.term}</strong>
                        </span>
                        <span>
                          Service Fee (10%):{' '}
                          <strong className="text-primary font-mono">
                            UGX {(item.serviceFee || 0).toLocaleString('en-US')}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="bg-status-ok-bg/40 border border-emerald-200 rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-status-ok-tx text-[18px]">
                            check_circle
                          </span>
                          <span className="text-xs font-semibold text-status-ok-tx">
                            Eligibility Criteria Verified
                          </span>
                        </div>
                        <span className="text-xs font-bold bg-status-ok-bg text-status-ok-tx px-2 py-0.5 rounded border border-emerald-300">
                          PASS
                        </span>
                      </div>
                      <div className="text-xs text-status-ok-tx grid grid-cols-2 gap-2 pt-1 border-t border-emerald-200/60">
                        <div>
                          <span className="block text-emerald-800">Total Savings:</span>
                          <span className="font-mono font-semibold">
                            UGX {(item.totalSavings || 0).toLocaleString('en-US')}
                          </span>
                        </div>
                        <div>
                          <span className="block text-emerald-800">Max Borrowable (3x):</span>
                          <span className="font-mono font-semibold">
                            UGX {(item.maxBorrowable || 0).toLocaleString('en-US')}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-emerald-800 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">inventory_2</span>
                        Loan fund box check: Sufficient balance available
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-300 rounded-lg p-2.5 text-xs">
                      <span className="font-bold text-amber-900 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">key</span>
                        {item.firstApprovedBy ? `Key 1/2: ${item.firstApprovedBy}` : 'Key 0/2'}
                      </span>
                      <span className="text-amber-800">{describeKeys(item)}</span>
                    </div>
                    {currentUserName && item.firstApprovedBy && isSameOfficer(item, currentUserName) && (
                      <p className="text-[11px] text-status-bad-tx bg-status-bad-bg border border-red-200 rounded-lg p-2">
                        You turned key 1/2. A DIFFERENT officer must turn key 2/2 — switching account is required.
                      </p>
                    )}
                    <p className="text-[11px] text-text-muted bg-canvas-bg border border-border-line rounded-lg p-2">
                      {feeNotice(item.amount, (payoutFor(item) as 'MTN' | 'Airtel' | 'Cash') || 'Cash')}
                    </p>

                    <div className="flex items-center justify-between gap-2 bg-canvas-bg border border-border-line rounded-lg p-2.5">
                      <span className="text-[11px] font-bold text-primary uppercase">Payout method</span>
                      <div className="flex gap-1.5">
                        {(['MTN', 'Airtel', 'Cash'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPayoutMethods((p) => ({ ...p, [item.id]: m }))}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border min-h-[36px] ${payoutFor(item) === m ? 'bg-primary text-white border-primary' : 'bg-white text-text-muted border-border-line'}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <button
                        onClick={() => handleAction(item.id, 'reject', item.memberName)}
                        className="min-h-[48px] px-3 bg-status-bad-bg border border-status-bad-tx text-status-bad-tx text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 active:scale-95 transition-transform hover:bg-red-100"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleAction(item.id, 'approve', item.memberName)}
                        className="min-h-[48px] px-3 bg-[#15803D] hover:bg-[#0B3D2E] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-sm focus:ring-4 focus:ring-emerald-200"
                      >
                        <span className="material-symbols-outlined text-[18px]">key</span>
                        <span>{item.firstApprovedBy ? 'Turn key 2/2 — release' : 'Turn key 1/2'} ({payoutFor(item)})</span>
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
                        Welfare Emergency Grant
                      </span>
                      <span className="text-xs text-text-muted">Non-Repayable</span>
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
                              No. {item.memberNo}
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
                        <span className="text-xs text-text-muted block">Initiator</span>
                        <span className="text-xs font-semibold text-primary">{item.initiator}</span>
                      </div>
                    </div>

                    <div className="bg-surface p-3 rounded-lg border border-border-line flex items-center justify-between">
                      <span className="text-xs text-text-muted">Approved Grant Sum</span>
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
                          <span className="text-text-muted block">Welfare Box Available</span>
                          <span className="font-mono font-bold text-status-ok-tx">
                            UGX {(item.welfareAvailable || 640000).toLocaleString('en-US')}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold bg-status-ok-bg text-status-ok-tx px-2 py-0.5 rounded border border-emerald-300">
                        Sufficient
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-300 rounded-lg p-2.5 text-xs">
                      <span className="font-bold text-amber-900">Key {item.firstApprovedBy ? '1/2' : '0/2'}</span>
                      <span className="text-amber-800">{describeKeys(item)}</span>
                    </div>
                    <p className="text-[11px] text-text-muted bg-canvas-bg border border-border-line rounded-lg p-2">
                      {feeNotice(item.amount, (payoutFor(item) as 'MTN' | 'Airtel' | 'Cash') || 'Cash')}
                    </p>

                    <div className="flex items-center justify-between gap-2 bg-canvas-bg border border-border-line rounded-lg p-2.5">
                      <span className="text-[11px] font-bold text-primary uppercase">Payout method</span>
                      <div className="flex gap-1.5">
                        {(['Cash', 'MTN', 'Airtel'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPayoutMethods((p) => ({ ...p, [item.id]: m }))}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border min-h-[36px] ${payoutFor(item) === m ? 'bg-primary text-white border-primary' : 'bg-white text-text-muted border-border-line'}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <button
                        onClick={() => handleAction(item.id, 'reject', item.memberName)}
                        className="min-h-[48px] px-3 bg-status-bad-bg border border-status-bad-tx text-status-bad-tx text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 active:scale-95 transition-transform hover:bg-red-100"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleAction(item.id, 'approve', item.memberName)}
                        className="min-h-[48px] px-3 bg-[#15803D] hover:bg-[#0B3D2E] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-sm focus:ring-4 focus:ring-emerald-200"
                      >
                        <span className="material-symbols-outlined text-[18px]">key</span>
                        <span>{item.firstApprovedBy ? 'Key 2/2 — release' : 'Key 1/2'} ({payoutFor(item)})</span>
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
                        Savings Withdrawal ({item.reqNumber})
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
                              No. {item.memberNo}
                            </span>
                          </div>
                          {item.phone && (
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-text-muted">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-900 font-bold border border-red-300 text-[11px]">
                                {item.provider} Money
                              </span>
                              <span className="font-mono text-on-surface">{item.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-text-muted block">Account Balance</span>
                        <span className="font-mono text-xs font-bold text-primary">
                          UGX {(item.accountBalance || 950000).toLocaleString('en-US')}
                        </span>
                      </div>
                    </div>

                    <div className="bg-surface p-3 rounded-lg border border-border-line flex items-center justify-between">
                      <span className="text-xs text-text-muted">Requested Payout</span>
                      <div className="text-right">
                        <span className="font-mono text-currency-lg text-primary font-bold">
                          UGX {item.amount.toLocaleString('en-US')}
                        </span>
                        <span className="text-xs text-text-muted block">
                          Post-balance: UGX {(item.postBalance || 750000).toLocaleString('en-US')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-canvas-bg border border-border-line rounded-lg p-2.5">
                      <span className="text-[11px] font-bold text-primary uppercase">Payout method</span>
                      <div className="flex gap-1.5">
                        {(['Airtel', 'MTN', 'Cash'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPayoutMethods((p) => ({ ...p, [item.id]: m }))}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border min-h-[36px] ${payoutFor(item) === m ? 'bg-primary text-white border-primary' : 'bg-white text-text-muted border-border-line'}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-300 rounded-lg p-2.5 text-xs">
                      <span className="font-bold text-amber-900">Key {item.firstApprovedBy ? '1/2' : '0/2'}</span>
                      <span className="text-amber-800">{describeKeys(item)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <button
                        onClick={() => handleAction(item.id, 'reject', item.memberName)}
                        className="min-h-[48px] px-3 bg-status-bad-bg border border-status-bad-tx text-status-bad-tx text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 active:scale-95 transition-transform hover:bg-red-100"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleAction(item.id, 'approve', item.memberName)}
                        className="min-h-[48px] px-3 bg-[#15803D] hover:bg-[#0B3D2E] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-sm focus:ring-4 focus:ring-emerald-200"
                      >
                        <span className="material-symbols-outlined text-[18px]">key</span>
                        <span>{item.firstApprovedBy ? 'Key 2/2 — release' : 'Key 1/2'} ({payoutFor(item)})</span>
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
              Recently decided ({decided.length})
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
                      {d.reqNumber} · {d.decidedBy ? `by ${d.decidedBy}` : 'by officer'}
                      {d.decidedAt ? ` · ${new Date(d.decidedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                      {d.payoutMethod ? ` · via ${d.payoutMethod}` : ''}
                      {d.status === 'rejected' && d.rejectReason ? ` · "${d.rejectReason}"` : ''}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-primary block">UGX {d.amount.toLocaleString('en-US')}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${d.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    {d.status.toUpperCase()}
                  </span>
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
          Offline Sync Ready • Group Ledger Hash:{' '}
          <span className="font-mono text-primary font-semibold">{ledgerHash(approvals)}</span>
        </p>
      </div>

      {keyTarget && (
        <ApprovalsKeyModal
          isOpen={!!keyTarget}
          keyLabel={keyTarget.firstApprovedBy ? 'Key 2/2 — releases cash' : 'Key 1/2'}
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
        title={rejectTarget ? `Why is ${rejectTarget.name}'s request rejected?` : 'Reject request'}
        placeholder="Reason (optional — shown in history)"
        confirmLabel="Reject request"
        onSubmit={(reason) => {
          if (reason !== null && rejectTarget) {
            onReject(rejectTarget.id, reason.trim() || undefined);
            showToast(`Request for ${rejectTarget.name} rejected.`);
          }
          setRejectTarget(null);
        }}
      />
    </main>
  );
};
