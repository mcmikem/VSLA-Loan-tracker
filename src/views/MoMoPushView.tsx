import React, { useRef, useState, useEffect } from 'react';
import { Language, ScreenId } from '../types';
import { feeNotice } from '../utils/momoFees';
import { apiFetch } from '../utils/api';

interface MoMoPushViewProps {
  onNavigate: (screen: ScreenId) => void;
  onSuccessTransaction?: (amount: number, desc: string) => void;
  language?: Language;
}

export const MoMoPushView: React.FC<MoMoPushViewProps> = ({
  onNavigate,
  onSuccessTransaction,
  language = 'EN',
}) => {
  const [network, setNetwork] = useState<'MTN' | 'Airtel'>('MTN');
  const [phoneNumber, setPhoneNumber] = useState('0772-123-456');
  const [memberName, setMemberName] = useState('Sarah Nabukalu');
  const [purpose, setPurpose] = useState('Loan Repayment (Okusasula Ebanja)');
  const [amount, setAmount] = useState('50,000');
  const [status, setStatus] = useState<'idle' | 'pushing' | 'waiting_pin' | 'confirmed' | 'failed'>('idle');
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [momoMode, setMomoMode] = useState<'sandbox' | 'live'>('sandbox');
  const [momoHint, setMomoHint] = useState<string | null>(null);
  const [txnId, setTxnId] = useState('MM-98421034');
  const [providerTransactionId, setProviderTransactionId] = useState<string | null>(null);
  const [momoError, setMomoError] = useState<string | null>(null);
  const settledRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/api/momo/config');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.mode === 'live') setMomoMode('live');
        if (data.hint) setMomoHint(data.hint);
      } catch {
        // Offline: stay in sandbox simulation mode.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== 'waiting_pin') return undefined;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    const numericAmt = parseInt(amount.replace(/,/g, ''), 10) || 50000;
    const complete = () => {
      if (cancelled || settledRef.current) return;
      settledRef.current = true;
      setStatus('confirmed');
      onSuccessTransaction?.(numericAmt, `${purpose} for ${memberName}`);
    };

    if (momoMode === 'sandbox') {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1 || prev === 52) {
            complete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (providerTransactionId) {
      const poll = async () => {
        try {
          const res = await apiFetch(
            `/api/momo/status?network=${encodeURIComponent(network)}&transactionId=${encodeURIComponent(providerTransactionId)}`
          );
          const data = await res.json().catch(() => ({}));
          if (cancelled) return;
          if (data.status === 'confirmed') complete();
          else if (data.status === 'failed') {
            setMomoError('The mobile-money request was declined or expired. No money was taken.');
            setStatus('failed');
          }
        } catch {
          // Keep polling until the visible 60-second window expires.
        }
      };
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setMomoError('No confirmation arrived within 60 seconds. Check the member phone before retrying.');
            setStatus('failed');
            return 0;
          }
          return prev - 1;
        });
        void poll();
      }, 3000);
      void poll();
    }

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [status, momoMode, providerTransactionId, network, amount, purpose, memberName, onSuccessTransaction]);

  const handleSendPush = () => {
    setStatus('pushing');
    setMomoError(null);
    setProviderTransactionId(null);
    settledRef.current = false;
    const numericAmt = parseInt(amount.replace(/,/g, ''), 10) || 50000;
    apiFetch('/api/momo/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ network, phone: phoneNumber, amount: numericAmt, memberName, purpose }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) throw new Error(data.error || 'MoMo request failed. No money was taken.');
        return data;
      })
      .then((data) => {
        setTxnId(data.transactionId);
        setProviderTransactionId(data.mode === 'live' ? data.transactionId : null);
        setMomoMode(data.mode === 'live' ? 'live' : 'sandbox');
        setTimerSeconds(60);
        setStatus('waiting_pin');
      })
      .catch((error: Error) => {
        setMomoError(error.message || 'MoMo request failed. No money was taken.');
        setStatus('failed');
      });
  };

  const handleReset = () => {
    setStatus('idle');
    setTimerSeconds(60);
    setProviderTransactionId(null);
    setMomoError(null);
    settledRef.current = false;
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
        <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${momoMode === 'live' ? 'bg-status-ok-bg text-status-ok-tx' : 'bg-amber-100 text-amber-900 border border-amber-300'}`}>
          {momoMode === 'live' ? 'API: LIVE' : 'API: SANDBOX'}
        </span>
      </div>
      {momoMode === 'sandbox' && (
        <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
          {momoHint || 'Sandbox simulation — no real money moves. Add both provider credentials and MOMO_LIVE=1 to go live.'}
        </p>
      )}

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
          <p className="text-[11px] text-text-muted bg-canvas-bg border border-border-line rounded-lg p-2 mt-2">
            {feeNotice(parseInt(amount.replace(/,/g, ''), 10) || 0, network)} Prefer cash under UGX 500,000 — zero fee.
          </p>
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
                <h3 className="font-bold text-amber-900 text-sm">
                  {momoMode === 'live' ? 'Live MoMo Prompt Sent' : 'USSD Push Sent to Member Phone'}
                </h3>
                <p className="text-xs text-amber-800">
                  {momoMode === 'live'
                    ? `Waiting for ${memberName} to approve the prompt on their phone...`
                    : `Waiting for ${memberName} to enter Mobile Money PIN...`}
                </p>
              </div>
            </div>
            <span className="font-mono text-lg font-bold text-amber-900 bg-white/80 px-2 py-0.5 rounded border border-amber-300">
              {timerSeconds}s
            </span>
          </div>

          {momoMode === 'live' ? (
            <div className="bg-white/80 rounded-lg p-3 text-xs text-amber-900 border border-amber-200 space-y-1">
              <p className="font-bold">Ask the member to approve the prompt on their phone.</p>
              <p className="font-mono text-[11px] break-all">Reference: {providerTransactionId || txnId}</p>
              <p className="text-[11px]">The ledger updates only after the provider confirms payment.</p>
            </div>
          ) : (
            <div className="bg-[#1E293B] text-white rounded-lg p-3 font-mono text-xs space-y-1 shadow-inner">
              <p className="text-yellow-400 font-bold">{network} MoMo Payment Request:</p>
              <p>Pay UGX {amount} to Bakwata Savings Group?</p>
              <p className="text-slate-400">Ref: {purpose.split(' ')[0]}</p>
              <div className="flex items-center justify-between pt-1 border-t border-slate-700 text-[11px]">
                <span className="text-emerald-400">{language === 'LU' ? 'Yingiza koodi' : '1. Enter PIN to Authorize'}</span>
                <button
                  onClick={() => {
                    if (settledRef.current) return;
                    settledRef.current = true;
                    setStatus('confirmed');
                    const numericAmt = parseInt(amount.replace(/,/g, ''), 10) || 50000;
                    onSuccessTransaction?.(numericAmt, `${purpose} for ${memberName}`);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-0.5 rounded font-bold"
                >
                  Simulate PIN Entry (Instant)
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {status === 'failed' && (
        <section className="bg-red-50 border-2 border-red-200 rounded-xl p-4 shadow-sm space-y-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-red-700 text-2xl">error</span>
            <div>
              <h3 className="font-bold text-red-900 text-sm">MoMo collection not confirmed</h3>
              <p className="text-xs text-red-800">{momoError || 'No money was taken. Check the phone and try again.'}</p>
            </div>
          </div>
          <button type="button" onClick={handleReset} className="w-full py-2.5 bg-white border border-red-300 text-red-900 text-xs font-bold rounded-lg">
            Try Again
          </button>
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
            <span>Txn ID: {txnId}</span>
            <span className="text-secondary font-bold">STATUS: SUCCESS · {momoMode === 'sandbox' ? 'SANDBOX' : 'LIVE'}</span>
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
      {(status === 'idle' || status === 'pushing') && (
        <button
          onClick={handleSendPush}
          disabled={status === 'pushing'}
          className="w-full min-h-[52px] bg-primary-container hover:bg-[#06241a] text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-sm active:scale-[0.99] transition disabled:opacity-60"
          type="button"
        >
          <span className="material-symbols-outlined text-xl">send_to_mobile</span>
          <span>{status === 'pushing' ? 'Contacting MoMo…' : (language === 'LU' ? 'Sindika ensimbi' : `Send MoMo Push Prompt (${network === 'MTN' ? '*165#' : '*185#'})`)}</span>
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
