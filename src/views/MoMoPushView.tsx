import React, { useState, useEffect } from 'react';
import { ScreenId } from '../types';

interface MoMoPushViewProps {
  onNavigate: (screen: ScreenId) => void;
  onSuccessTransaction?: (amount: number, desc: string) => void;
}

export const MoMoPushView: React.FC<MoMoPushViewProps> = ({
  onNavigate,
  onSuccessTransaction,
}) => {
  const [network, setNetwork] = useState<'MTN' | 'Airtel'>('MTN');
  const [phoneNumber, setPhoneNumber] = useState('0772-123-456');
  const [memberName, setMemberName] = useState('Sarah Nabukalu');
  const [purpose, setPurpose] = useState('Loan Repayment (Okusasula Ebanja)');
  const [amount, setAmount] = useState('50,000');
  const [status, setStatus] = useState<'idle' | 'pushing' | 'waiting_pin' | 'confirmed' | 'failed'>('idle');
  const [timerSeconds, setTimerSeconds] = useState(60);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'waiting_pin') {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setStatus('confirmed');
            const numericAmt = parseInt(amount.replace(/,/g, ''), 10) || 50000;
            if (onSuccessTransaction) {
              onSuccessTransaction(numericAmt, `${purpose} for ${memberName}`);
            }
            return 0;
          }
          if (prev === 52) {
            // Auto complete in simulation after 8 seconds
            setStatus('confirmed');
            const numericAmt = parseInt(amount.replace(/,/g, ''), 10) || 50000;
            if (onSuccessTransaction) {
              onSuccessTransaction(numericAmt, `${purpose} for ${memberName}`);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, amount, purpose, memberName, onSuccessTransaction]);

  const handleSendPush = () => {
    setStatus('waiting_pin');
    setTimerSeconds(60);
  };

  const handleReset = () => {
    setStatus('idle');
    setTimerSeconds(60);
  };

  return (
    <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-12 flex-1 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('member_passbook')}
            className="w-9 h-9 rounded-lg bg-surface-card border border-border-strong flex items-center justify-center text-primary"
            type="button"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <div>
            <h1 className="text-headline-md font-headline-md text-primary font-bold">
              Sindiika MoMo Push
            </h1>
            <p className="text-xs text-text-muted">Send Mobile Money Collection Prompt</p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded bg-status-ok-bg text-status-ok-tx text-xs font-bold font-mono">
          API: LIVE
        </span>
      </div>

      {/* Network & Recipient Selector Card */}
      <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-3">
        <label className="text-xs font-bold text-primary block uppercase tracking-wider">
          Recipient Telecom Network
        </label>

        {/* Network Radios */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              setNetwork('MTN');
              setPhoneNumber('0772-123-456');
            }}
            className={`p-3 rounded-lg border-2 flex items-center gap-2.5 transition ${
              network === 'MTN'
                ? 'border-[#EAB308] bg-[#FEF9C3] shadow-sm'
                : 'border-border-line bg-canvas-bg hover:bg-surface-container'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-[#EAB308] text-white flex items-center justify-center font-bold text-xs">
              M
            </div>
            <div className="text-left">
              <span className="font-bold text-sm text-primary block">MTN MoMo</span>
              <span className="text-[11px] text-text-muted">*165# Prompt</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setNetwork('Airtel');
              setPhoneNumber('0701-987-654');
            }}
            className={`p-3 rounded-lg border-2 flex items-center gap-2.5 transition ${
              network === 'Airtel'
                ? 'border-[#DC2626] bg-[#FEE2E2] shadow-sm'
                : 'border-border-line bg-canvas-bg hover:bg-surface-container'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-[#DC2626] text-white flex items-center justify-center font-bold text-xs">
              A
            </div>
            <div className="text-left">
              <span className="font-bold text-sm text-primary block">Airtel Money</span>
              <span className="text-[11px] text-text-muted">*185# Prompt</span>
            </div>
          </button>
        </div>

        {/* Member Input */}
        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1">Member Name & Number</label>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              className="col-span-2 py-2 px-3 bg-canvas-bg border border-border-strong rounded-lg text-sm text-primary font-semibold"
            />
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="py-2 px-3 bg-canvas-bg border border-border-strong rounded-lg text-xs font-mono text-primary font-bold text-center"
            />
          </div>
        </div>
      </section>

      {/* Purpose & Amount */}
      <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-3">
        <label className="text-xs font-bold text-primary block uppercase tracking-wider">
          Transaction Purpose (Ensonga)
        </label>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            'Share Purchase (Okugula Emigabo)',
            'Loan Repayment (Okusasula Ebanja)',
            "Welfare Contrib. (Enkoba y'Obuyambi)",
            "Late Fine (Omusango gw'Okukerewa)",
          ].map((purp) => (
            <button
              key={purp}
              type="button"
              onClick={() => setPurpose(purp)}
              className={`p-2 rounded-lg border text-left font-medium active:scale-95 transition ${
                purpose === purp
                  ? 'bg-primary-container text-white border-primary-container shadow-sm'
                  : 'bg-canvas-bg text-on-surface border-border-line hover:border-border-strong'
              }`}
            >
              {purp}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div className="pt-2 border-t border-border-line">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-primary">Amount to Push (UGX)</label>
            <div className="flex gap-1">
              {['10,000', '20,000', '50,000', '100,000'].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val)}
                  className="px-2 py-0.5 rounded bg-surface-container text-primary text-[11px] font-mono font-bold hover:bg-surface-container-high"
                >
                  {val.replace(',000', 'k')}
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex items-center rounded-lg border-2 border-primary shadow-sm bg-white overflow-hidden">
            <span className="bg-canvas-bg px-3.5 py-2.5 border-r border-border-strong text-sm font-bold font-mono text-primary">
              UGX
            </span>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full py-2.5 px-3 text-headline-md font-mono font-bold text-primary border-0 focus:ring-0"
            />
          </div>
        </div>
      </section>

      {/* Push State Screen / Simulation */}
      {status === 'waiting_pin' && (
        <section className="bg-status-warn-bg border-2 border-amber-300 rounded-xl p-4 shadow-md space-y-3 animate-in fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-700 text-2xl animate-spin">
                sync
              </span>
              <div>
                <h3 className="font-bold text-amber-900 text-sm">USSD Push Sent to Member Phone</h3>
                <p className="text-xs text-amber-800">
                  Waiting for {memberName} to enter Mobile Money PIN...
                </p>
              </div>
            </div>
            <span className="font-mono text-lg font-bold text-amber-900 bg-white/80 px-2 py-0.5 rounded border border-amber-300">
              {timerSeconds}s
            </span>
          </div>

          {/* Simulated phone screen preview */}
          <div className="bg-[#1E293B] text-white rounded-lg p-3 font-mono text-xs space-y-1 shadow-inner">
            <p className="text-yellow-400 font-bold">{network} MoMo Payment Request:</p>
            <p>Pay UGX {amount} to Bakwata Savings Group?</p>
            <p className="text-slate-400">Ref: {purpose.split(' ')[0]}</p>
            <div className="flex items-center justify-between pt-1 border-t border-slate-700 text-[11px]">
              <span className="text-emerald-400">1. Enter PIN to Authorize</span>
              <button
                onClick={() => {
                  setStatus('confirmed');
                  const numericAmt = parseInt(amount.replace(/,/g, ''), 10) || 50000;
                  if (onSuccessTransaction) {
                    onSuccessTransaction(numericAmt, `${purpose} for ${memberName}`);
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-0.5 rounded font-bold"
              >
                Simulate PIN Entry (Instant)
              </button>
            </div>
          </div>
        </section>
      )}

      {status === 'confirmed' && (
        <section className="bg-status-ok-bg border-2 border-secondary rounded-xl p-4 shadow-md space-y-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">check</span>
            </div>
            <div>
              <h3 className="font-bold text-status-ok-tx text-base">MoMo Transaction Confirmed!</h3>
              <p className="text-xs text-emerald-800">
                UGX {amount} credited directly to Bakwata Group strongbox ledger.
              </p>
            </div>
          </div>
          <div className="bg-white/90 p-2.5 rounded-lg border border-emerald-200 text-xs font-mono flex justify-between">
            <span>Txn ID: MM-98421034</span>
            <span className="text-secondary font-bold">STATUS: SUCCESS</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onNavigate('member_passbook')}
              className="flex-1 py-2.5 bg-secondary text-white text-xs font-bold rounded-lg"
            >
              View in Passbook
            </button>
            <button
              onClick={handleReset}
              className="py-2.5 px-4 bg-white border border-border-strong text-primary text-xs font-semibold rounded-lg"
            >
              New Push
            </button>
          </div>
        </section>
      )}

      {/* Primary Action Button */}
      {status === 'idle' && (
        <button
          onClick={handleSendPush}
          className="w-full min-h-[52px] bg-primary-container hover:bg-[#06241a] text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-sm active:scale-[0.99] transition"
          type="button"
        >
          <span className="material-symbols-outlined text-xl">send_to_mobile</span>
          <span>Send MoMo Push Prompt ({network === 'MTN' ? '*165#' : '*185#'})</span>
        </button>
      )}

      {/* Recent MoMo Activity Ledger */}
      <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-2.5">
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
          Recent MoMo Collections Today
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2 bg-canvas-bg rounded-lg border border-border-line">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-momo-mtn" />
              <div>
                <span className="font-bold text-primary block">Joseph Mukasa</span>
                <span className="text-[11px] text-text-muted">3 Shares purchase · 09:28 AM</span>
              </div>
            </div>
            <div className="text-right font-mono">
              <span className="font-bold text-secondary block">+UGX 30,000</span>
              <span className="text-[10px] text-text-muted">MTN-88410</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-2 bg-canvas-bg rounded-lg border border-border-line">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-momo-airtel" />
              <div>
                <span className="font-bold text-primary block">Peter Ssemwogerere</span>
                <span className="text-[11px] text-text-muted">Welfare Contrib. · 08:45 AM</span>
              </div>
            </div>
            <div className="text-right font-mono">
              <span className="font-bold text-secondary block">+UGX 5,000</span>
              <span className="text-[10px] text-text-muted">AIR-77192</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
