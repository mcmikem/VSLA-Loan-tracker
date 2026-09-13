import React, { useState } from 'react';
import { Member, ScreenId } from '../types';
import { MemberPayout, ShareOutResult, computeShareOut } from '../utils/shareout';

interface CycleShareOutViewProps {
  members?: Member[];
  loanFundBalance?: number;
  finesCollected?: number;
  onNavigate: (screen: ScreenId) => void;
  onExecuteShareOut?: (result: ShareOutResult) => void;
}

export const CycleShareOutView: React.FC<CycleShareOutViewProps> = ({
  members = [],
  loanFundBalance = 8750000,
  finesCollected = 750000,
  onNavigate,
  onExecuteShareOut,
}) => {
  const [disbursalMode, setDisbursalMode] = useState<'cash' | 'momo'>('cash');
  const [isSimulated, setIsSimulated] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'roster'>('overview');
  const [confirmExecute, setConfirmExecute] = useState(false);
  const [executed, setExecuted] = useState(false);

  // Real engine: identical math for preview and execution
  const result = computeShareOut(members, loanFundBalance, finesCollected);
  const {
    totalSharesSold,
    totalShareCapital,
    interestEarned,
    totalPool,
    valuePerShare,
    profitPercentage,
  } = result;

  const handlePrintSlips = () => {
    window.print();
  };

  const handleExecute = () => {
    if (!onExecuteShareOut) return;
    onExecuteShareOut(result);
    setExecuted(true);
    setConfirmExecute(false);
  };

  return (
    <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-14 flex-1 space-y-4">
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
              Cycle 1 Share-Out
            </h1>
            <p className="text-xs text-text-muted">Okugaba Emigabo n'Amagoba (Dividends)</p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded bg-status-ok-bg text-status-ok-tx text-xs font-bold font-mono">
          CYCLE MATURITY
        </span>
      </div>

      {/* Hero Financial Projection */}
      <section className="bg-primary-container text-white rounded-xl p-5 shadow-[0px_4px_12px_rgba(11,61,46,0.18)] space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-primary-fixed">
            Total Share-Out Pool
          </span>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded text-white font-mono">
            Full Cycle Payout
          </span>
        </div>

        <div>
          <span className="text-xs text-[#c0c8c3] block mb-1">Total Group Capital to Distribute</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-primary-fixed text-lg font-bold font-mono">UGX</span>
            <span className="font-mono text-[28px] font-bold text-white tracking-tight">
              {totalPool.toLocaleString('en-US')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-white/20">
          <div className="bg-white/10 rounded-lg p-2.5">
            <span className="text-[11px] text-[#c0c8c3] block">Calculated Share Value</span>
            <span className="font-mono text-base font-bold text-white">
              UGX {valuePerShare.toLocaleString('en-US')}
            </span>
            <span className="text-[10px] text-secondary-fixed block mt-0.5 font-bold">
              +{profitPercentage}% Dividend Return
            </span>
          </div>

          <div className="bg-white/10 rounded-lg p-2.5">
            <span className="text-[11px] text-[#c0c8c3] block">Base Share Price</span>
            <span className="font-mono text-base font-bold text-white">UGX 10,000</span>
            <span className="text-[10px] text-[#c0c8c3] block mt-0.5">{totalSharesSold} Total Shares</span>
          </div>
        </div>
      </section>

      {/* Navigation Pills */}
      <div className="flex bg-surface-card p-1 rounded-xl border border-border-strong text-xs font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 rounded-lg transition ${
            activeTab === 'overview'
              ? 'bg-primary-container text-white shadow-sm'
              : 'text-text-muted hover:text-primary'
          }`}
          type="button"
        >
          Profit Breakdown
        </button>
        <button
          onClick={() => setActiveTab('roster')}
          className={`flex-1 py-2 rounded-lg transition ${
            activeTab === 'roster'
              ? 'bg-primary-container text-white shadow-sm'
              : 'text-text-muted hover:text-primary'
          }`}
          type="button"
        >
          All Member Payouts ({members.length})
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Profit Breakdown */}
          <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-2.5">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
              Profit Sources Breakdown (Amagoba)
            </h3>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2 bg-canvas-bg rounded-lg border border-border-line">
                <span className="text-on-surface font-sans">Member Savings Capital ({totalSharesSold} shares):</span>
                <span className="font-bold text-primary">UGX {totalShareCapital.toLocaleString('en-US')}</span>
              </div>
              <div className="flex justify-between p-2 bg-canvas-bg rounded-lg border border-border-line">
                <span className="text-on-surface font-sans">Accumulated Loan Interest (10% fee):</span>
                <span className="font-bold text-secondary">+UGX {interestEarned.toLocaleString('en-US')}</span>
              </div>
              <div className="flex justify-between p-2 bg-canvas-bg rounded-lg border border-border-line">
                <span className="text-on-surface font-sans">Constitutional Late Fines Collected:</span>
                <span className="font-bold text-secondary">+UGX {finesCollected.toLocaleString('en-US')}</span>
              </div>
            </div>
          </section>

          {/* Disbursal Mode & Action */}
          <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-3">
            <label className="text-xs font-bold text-primary block uppercase tracking-wider">
              Share-Out Ceremony Protocol
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDisbursalMode('cash')}
                className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  disbursalMode === 'cash'
                    ? 'bg-primary-container text-white border-primary-container'
                    : 'bg-canvas-bg text-on-surface border-border-line'
                }`}
              >
                <span className="material-symbols-outlined text-sm">payments</span>
                <span>Physical Cash Handover</span>
              </button>
              <button
                type="button"
                onClick={() => setDisbursalMode('momo')}
                className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  disbursalMode === 'momo'
                    ? 'bg-primary-container text-white border-primary-container'
                    : 'bg-canvas-bg text-on-surface border-border-line'
                }`}
              >
                <span className="material-symbols-outlined text-sm">send_to_mobile</span>
                <span>Bulk MoMo Push</span>
              </button>
            </div>

            {isSimulated ? (
              <div className="p-3 bg-status-ok-bg border border-secondary rounded-lg text-center space-y-2 animate-in zoom-in-95">
                <span className="text-xs font-bold text-status-ok-tx block">
                  Share-Out Ceremony Prepared Successfully!
                </span>
                <p className="text-[11px] text-emerald-800">
                  Calculated payouts for all {members.length} members with official passbook closing sign-offs.
                </p>
                <button
                  onClick={handlePrintSlips}
                  className="w-full py-2 bg-secondary text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1"
                  type="button"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  Print Full Share-Out Audit Roster
                </button>
                {onExecuteShareOut && !executed && !confirmExecute && (
                  <button
                    onClick={() => setConfirmExecute(true)}
                    className="w-full py-2.5 bg-primary-container text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-sm">payments</span>
                    Execute Share-Out (posts to ledgers)
                  </button>
                )}
                {confirmExecute && !executed && (
                  <div className="p-3 bg-white border-2 border-primary rounded-lg space-y-2">
                    <p className="text-xs font-bold text-primary">
                      Pay UGX {result.totalNetPayout.toLocaleString('en-US')} to {members.length} members?
                      UGX {result.totalDeductedLoans.toLocaleString('en-US')} in loans will be deducted first.
                      Shares reset for the new cycle. This cannot be undone — take a snapshot first.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleExecute}
                        className="flex-1 py-2 bg-primary-container text-white font-bold text-xs rounded-lg"
                        type="button"
                      >
                        Confirm Payout
                      </button>
                      <button
                        onClick={() => setConfirmExecute(false)}
                        className="flex-1 py-2 bg-canvas-bg border border-border-line font-bold text-xs rounded-lg"
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {executed && (
                  <p className="text-xs font-bold text-status-ok-tx">
                    Share-out executed and posted to every passbook. New cycle started.
                  </p>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsSimulated(true)}
                className="w-full min-h-[48px] bg-secondary hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 active:scale-95 transition shadow"
              >
                <span className="material-symbols-outlined text-base">calculate</span>
                <span>Simulate Share-Out Protocol & Generate Slips</span>
              </button>
            )}
          </section>
        </div>
      )}

      {activeTab === 'roster' && (
        <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
                Member Payout Registry
              </h3>
              <p className="text-[11px] text-text-muted">Proportional to shares saved</p>
            </div>
            <button
              onClick={handlePrintSlips}
              className="text-xs font-bold text-secondary flex items-center gap-1 hover:underline"
              type="button"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              Print
            </button>
          </div>

          <div className="space-y-2 text-xs max-h-[420px] overflow-y-auto pr-1">
            {result.payouts.map((p: MemberPayout) => {

              return (
                <div
                  key={p.memberId}
                  className="p-2.5 bg-canvas-bg rounded-lg border border-border-line flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-primary">{p.memberName}</span>
                      <span className="text-[10px] font-mono bg-white px-1 py-0.2 rounded border">
                        #{p.memberNo}
                      </span>
                    </div>
                    <span className="text-[11px] text-text-muted">
                      {p.shares} shares · Saved UGX {p.saved.toLocaleString('en-US')}
                      {p.deductedLoan > 0 && ` · Loan deducted UGX ${p.deductedLoan.toLocaleString('en-US')}`}
                    </span>
                  </div>
                  <div className="text-right font-mono shrink-0">
                    <span className="font-bold text-secondary text-sm block">
                      UGX {p.netPayout.toLocaleString('en-US')}
                    </span>
                    <span className="text-[10px] text-status-ok-tx font-bold font-sans">
                      +UGX {p.profit.toLocaleString('en-US')} profit
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
};
