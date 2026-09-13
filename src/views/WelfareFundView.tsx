import React, { useState } from 'react';
import { Member, ScreenId, WelfareGrant } from '../types';

interface WelfareFundViewProps {
  welfareBalance: number;
  grants: WelfareGrant[];
  members?: Member[];
  onDisburseGrant: (grant: WelfareGrant) => void;
  onNavigate: (screen: ScreenId) => void;
}

export const WelfareFundView: React.FC<WelfareFundViewProps> = ({
  welfareBalance,
  grants,
  members = [],
  onDisburseGrant,
  onNavigate,
}) => {
  const initialMember = members[3] || members[0] || { name: 'Prossy Namutebi', no: '07' };
  const [beneficiaryName, setBeneficiaryName] = useState(initialMember.name);
  const [beneficiaryNo, setBeneficiaryNo] = useState(initialMember.no);
  const [grantCategory, setGrantCategory] = useState<'medical' | 'bereavement' | 'other'>('medical');
  const [amount, setAmount] = useState('100,000');
  const [reason, setReason] = useState('Emergency clinic admission for malaria treatment');
  const [isDisbursedSuccess, setIsDisbursedSuccess] = useState(false);

  const handleDisburse = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(amount.replace(/,/g, ''), 10) || 100000;
    const newGrant: WelfareGrant = {
      id: 'grant-' + Date.now(),
      memberNo: beneficiaryNo,
      memberName: beneficiaryName,
      reason,
      amount: num,
      paymentMethod: 'Cash Handover witnessed by Keyholders',
      date: 'Today',
      minutesRef: 'Minutes ref #M-28',
      type: grantCategory,
    };
    onDisburseGrant(newGrant);
    setIsDisbursedSuccess(true);
    setTimeout(() => setIsDisbursedSuccess(false), 4000);
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
              Enkoba y'Obuyambi
            </h1>
            <p className="text-xs text-text-muted">Welfare Emergency Fund & Social Protection</p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded bg-status-ok-bg text-status-ok-tx text-xs font-bold font-mono">
          NON-REPAYABLE
        </span>
      </div>

      {/* Welfare Vault Balance Card */}
      <section className="bg-[#003E2B] text-white rounded-xl p-4 shadow-[0px_4px_12px_rgba(0,62,43,0.18)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-tertiary-fixed font-bold uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">health_and_safety</span>
            Available Emergency Buffer
          </span>
          <span className="text-[11px] bg-white/15 px-2 py-0.5 rounded text-white">
            UGX 2,000 / member / wk
          </span>
        </div>

        <div>
          <span className="text-xs text-[#c0c8c3] block mb-0.5">Physical Cash in Red Metal Tray</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-tertiary-fixed text-lg font-bold font-mono">UGX</span>
            <span className="font-mono text-[28px] font-bold text-white tracking-tight">
              {welfareBalance.toLocaleString('en-US')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/20 text-center text-xs">
          <div className="bg-white/10 p-2 rounded">
            <span className="text-[10px] text-[#c0c8c3] block">Hospital Max</span>
            <span className="font-bold text-white font-mono">150k</span>
          </div>
          <div className="bg-white/10 p-2 rounded">
            <span className="text-[10px] text-[#c0c8c3] block">Bereavement</span>
            <span className="font-bold text-white font-mono">200k</span>
          </div>
          <div className="bg-white/10 p-2 rounded">
            <span className="text-[10px] text-[#c0c8c3] block">Calamity</span>
            <span className="font-bold text-white font-mono">100k</span>
          </div>
        </div>
      </section>

      {/* Success Toast */}
      {isDisbursedSuccess && (
        <div className="bg-status-ok-bg border border-secondary text-status-ok-tx p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>Emergency grant recorded and deducted from welfare box!</span>
        </div>
      )}

      {/* Request New Grant Form */}
      <form
        onSubmit={handleDisburse}
        className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-3"
      >
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm text-secondary">emergency</span>
          Request Emergency Welfare Grant
        </h3>

        {/* Member selection */}
        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1">Beneficiary Member</label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(members.length > 0 ? members : [
              { no: '07', name: 'Prossy Namutebi', zone: 'Zone B' },
              { no: '14', name: 'John Baptist Walusimbi', zone: 'Zone A' },
              { no: '02', name: 'Joseph Mukasa', zone: 'Zone C' },
            ]).map((m) => (
              <button
                key={m.no}
                type="button"
                onClick={() => {
                  setBeneficiaryName(m.name);
                  setBeneficiaryNo(m.no);
                }}
                className={`p-2 rounded-lg border text-left transition ${
                  beneficiaryNo === m.no
                    ? 'bg-primary-container text-white border-primary-container'
                    : 'bg-canvas-bg text-on-surface hover:border-primary'
                }`}
              >
                <span className="font-bold block text-xs">#{m.no} {m.name}</span>
                <span className="text-[10px] opacity-80 block">{m.zone || 'Kalerwe'} · Up to date</span>
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1">Grant Category</label>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {[
              { id: 'medical', label: 'Medical / Surgery', max: 'UGX 150k' },
              { id: 'bereavement', label: 'Bereavement (Mabugo)', max: 'UGX 200k' },
              { id: 'other', label: 'Disaster / Fire', max: 'UGX 100k' },
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setGrantCategory(c.id as any)}
                className={`p-2 rounded-lg border text-center ${
                  grantCategory === c.id
                    ? 'bg-primary-container text-white border-primary-container font-bold'
                    : 'bg-canvas-bg text-on-surface'
                }`}
              >
                <span className="block text-[11px]">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1">Grant Amount (UGX)</label>
          <div className="relative flex items-center rounded-lg border border-border-strong overflow-hidden">
            <span className="bg-canvas-bg px-3 py-2 text-xs font-mono font-bold text-primary border-r border-border-strong">
              UGX
            </span>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full py-2 px-3 text-sm font-mono font-bold text-primary border-0 focus:ring-0"
            />
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1">
            Reason & Supporting Details
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full py-2 px-3 text-xs bg-canvas-bg border border-border-strong rounded-lg text-primary"
          />
        </div>

        <button
          type="submit"
          className="w-full min-h-[48px] bg-secondary text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 active:scale-95 transition"
        >
          <span className="material-symbols-outlined text-base">payments</span>
          <span>Disburse Emergency Grant Now (Cash Handover)</span>
        </button>
      </form>

      {/* Disbursed History */}
      <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-2.5">
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
          Approved Grants History (Cycle 1)
        </h3>
        <div className="space-y-2 text-xs">
          {grants.map((g) => (
            <div key={g.id} className="p-3 bg-canvas-bg rounded-lg border border-border-line space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary">
                  {g.memberName} (#{g.memberNo})
                </span>
                <span className="font-mono font-bold text-status-bad-tx">
                  -UGX {g.amount.toLocaleString('en-US')}
                </span>
              </div>
              <p className="text-text-muted text-[11px]">{g.reason}</p>
              <div className="flex justify-between pt-1 border-t border-border-line text-[10px] text-text-muted">
                <span>{g.date} · {g.minutesRef}</span>
                <span className="text-secondary font-semibold">{g.paymentMethod}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};
