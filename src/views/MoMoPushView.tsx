import React, { useRef, useState, useEffect } from 'react';
import { Language, ScreenId } from '../types';
import { estimateMoMoFee, feeNotice, netAfterFee } from '../utils/momoFees';
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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [memberName, setMemberName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'idle' | 'pushing' | 'waiting_pin' | 'confirmed' | 'failed'>('idle');
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [momoMode, setMomoMode] = useState<'sandbox' | 'live'>('sandbox');
  const [momoHint, setMomoHint] = useState<string | null>(null);
  const [txnId, setTxnId] = useState('MM-98421034');
  const [providerTransactionId, setProviderTransactionId] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [momoError, setMomoError] = useState<string | null>(null);
  const settledRef = useRef(false);
  const str = (en: string, lu: string) => (language === 'LU' ? lu : en);

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
    const numericAmt = parseInt(amount.replace(/,/g, ''), 10) || 0;
    const complete = () => {
      if (cancelled || settledRef.current) return;
      settledRef.current = true;
      setStatus('confirmed');
      onSuccessTransaction?.(numericAmt, language === 'LU' ? `${purpose} ku ${memberName}` : `${purpose} for ${memberName}`);
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
            setMomoError(
              language === 'LU'
                ? 'Olunaku lw’okukwatagana nsimbi n’umulimu ntolwaliragala oba ngakaba. Tewali nsimbi nga zigibiddwa.'
                : 'The mobile-money request was declined or expired. No money was taken.'
            );
            setStatus('failed');
          }
        } catch {
          // Keep polling until the visible 60-second window expires.
        }
      };
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setMomoError(
              language === 'LU'
                ? 'Tewali kkakaseera mu kaseera 60. Kebera essimu y’omukiise nga otandika okudiddwa.'
                : 'No confirmation arrived within 60 seconds. Check the member phone before retrying.'
            );
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
  }, [status, momoMode, providerTransactionId, network, amount, purpose, memberName, onSuccessTransaction, language]);

  const handleSendPush = () => {
    const numericAmount = parseInt(amount.replace(/,/g, ''), 10) || 0;
    if (!memberName.trim() || phoneNumber.replace(/\D/g, '').length < 9 || numericAmount <= 0 || !purpose.trim()) {
      setMomoError(
        language === 'LU'
          ? 'Yingiza erinnya ly’omukiise, namba ya simu, ensonga n’ensimbi ezikwata ku ziba.'
          : 'Enter the member name, phone number, purpose, and amount.'
      );
      setStatus('idle');
      return;
    }
    setStatus('pushing');
    setMomoError(null);
    setProviderTransactionId(null);
    setRedirectUrl(null);
    settledRef.current = false;
    const numericAmt = parseInt(amount.replace(/,/g, ''), 10) || 0;
    apiFetch('/api/momo/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ network, phone: phoneNumber, amount: numericAmount, memberName, purpose }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          throw new Error(
            language === 'LU'
              ? 'Olunaku lwa MoMo lwalwako. Tewali nsimbi nga zigibiddwa.'
              : data.error || 'MoMo request failed. No money was taken.'
          );
        }
        return data;
      })
      .then((data) => {
        setTxnId(data.transactionId);
        setProviderTransactionId(data.mode === 'live' ? data.transactionId : null);
        setRedirectUrl(data.mode === 'live' && data.redirectUrl ? data.redirectUrl : null);
        setMomoMode(data.mode === 'live' ? 'live' : 'sandbox');
        setTimerSeconds(60);
        setStatus('waiting_pin');
      })
      .catch((error: Error) => {
        setMomoError(
          language === 'LU'
            ? 'Olunaku lwa MoMo lwalwako. Tewali nsimbi nga zigibiddwa.'
            : error.message || 'MoMo request failed. No money was taken.'
        );
        setStatus('failed');
      });
  };

  const handleReset = () => {
    setStatus('idle');
    setTimerSeconds(60);
    setProviderTransactionId(null);
    setRedirectUrl(null);
    setMomoError(null);
    settledRef.current = false;
  };

  const canSend = memberName.trim().length > 0 && phoneNumber.replace(/\D/g, '').length >= 9 && (parseInt(amount.replace(/,/g, ''), 10) || 0) > 0 && purpose.trim().length > 0;
  const approvalMessage =
    language === 'LU'
      ? `Muzize ensimbi yo UGX ${amount} wano: ${redirectUrl || ''}`
      : `Approve your payment of UGX ${amount} here: ${redirectUrl || ''}`;

  return (
    <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-12 flex-1 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('member_passbook')}
            className="w-9 h-9 rounded-lg bg-surface-card border border-border-strong flex items-center justify-center text-primary"
            type="button"
            aria-label={str('Go back', 'Ddayo')}
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_back</span>
          </button>
          <div>
            <h1 className="text-headline-md font-headline-md text-primary font-bold">
              {language === 'LU' ? 'Sindika MoMo' : 'Sindiika MoMo Push'}
            </h1>
            <p className="text-xs text-text-muted">
              {str('Send Mobile Money Collection Prompt', 'Sindika obujjukiza bwo kufuna ensimbi n’umulimu')}
            </p>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${momoMode === 'live' ? 'bg-status-ok-bg text-status-ok-tx' : 'bg-amber-100 text-amber-900 border border-amber-300'}`}>
          {momoMode === 'live' ? 'API: LIVE' : 'API: SANDBOX'}
        </span>
      </div>
      {momoMode === 'sandbox' && (
        <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
          {language === 'EN'
            ? momoHint || 'Sandbox simulation — no real money moves. Add both provider credentials and MOMO_LIVE=1 to go live.'
            : 'Mu SANDBOX ttoisobola — tegwanga nsimbi ddala. Yangeramo credentials zonna za provider n’MOMO_LIVE=1 okutandika LIVE.'}
        </p>
      )}

      {/* Network & Recipient Selector Card */}
      <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-3">
        <label className="text-xs font-bold text-primary block uppercase tracking-wider">
          {str('Recipient Telecom Network', 'Ettembeko ly’omukiise mu nsi y’olumuliro')}
        </label>

        {/* Network Radios */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
             onClick={() => setNetwork('MTN')}
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
              <span className="text-[11px] text-text-muted">{str('*165# Prompt', 'Koodi ya USSD *165#')}</span>
            </div>
          </button>

          <button
            type="button"
             onClick={() => setNetwork('Airtel')}
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
              <span className="text-[11px] text-text-muted">{str('*185# Prompt', 'Koodi ya USSD *185#')}</span>
            </div>
          </button>
        </div>

        {/* Member Input */}
        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1">{str('Member Name & Number', 'Erinnya n’Nnamba y’omukiise')}</label>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              aria-label={str('Member name', 'Erinnya ly’omukiise')}
              className="col-span-2 py-2 px-3 bg-canvas-bg border border-border-strong rounded-lg text-sm text-primary font-semibold"
            />
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              aria-label={str('Member phone number', 'Namba ya simu y’omukiise')}
              className="py-2 px-3 bg-canvas-bg border border-border-strong rounded-lg text-xs font-mono text-primary font-bold text-center"
            />
          </div>
        </div>
      </section>

      {/* Purpose & Amount */}
      <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-3">
        <label className="text-xs font-bold text-primary block uppercase tracking-wider">
          {str('Transaction Purpose (Ensonga)', 'Ensonga y’ebuzibaa')}
        </label>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { en: 'Share Purchase (Okugula Emigabo)', lu: 'Okugula emigabo' },
            { en: 'Loan Repayment (Okusasula Ebanja)', lu: 'Okusasula ebanja' },
            { en: "Welfare Contrib. (Enkoba y'Obuyambi)", lu: 'Enkoba y’obuyambi' },
            { en: "Late Fine (Omusango gw'Okukerewa)", lu: 'Omusango gw’okukerewa' },
          ].map((purp) => {
            const label = language === 'LU' ? purp.lu : purp.en;
            return (
            <button
              key={purp.en}
              type="button"
              onClick={() => setPurpose(label)}
              className={`p-2 rounded-lg border text-left font-medium active:scale-95 transition ${
                purpose === label
                  ? 'bg-primary-container text-white border-primary-container shadow-sm'
                  : 'bg-canvas-bg text-on-surface border-border-line hover:border-border-strong'
              }`}
            >
              {label}
            </button>
            );
          })}
        </div>

        {/* Amount */}
        <div className="pt-2 border-t border-border-line">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-primary">{str('Amount to Push (UGX)', 'Ensimbi ezikusindikwa (UGX)')}</label>
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
              aria-label={str('Amount in UGX', 'Ensimbi mu UGX')}
              className="w-full py-2.5 px-3 text-headline-md font-mono font-bold text-primary border-0 focus:ring-0"
            />
          </div>
          <p className="text-[11px] text-text-muted bg-canvas-bg border border-border-line rounded-lg p-2 mt-2">
            {language === 'LU' ? (
              <>
                Okuyogerako kwa {network}: kikomo UGX {estimateMoMoFee(parseInt(amount.replace(/,/g, ''), 10) || 0, network).toLocaleString()} · omukiise alaba kikomo UGX {netAfterFee(parseInt(amount.replace(/,/g, ''), 10) || 0, network).toLocaleString()}. Ssente za mu kukwata = engassi 0.
              </>
            ) : (
              <>
                {feeNotice(parseInt(amount.replace(/,/g, ''), 10) || 0, network)} Prefer cash under UGX 500,000 — zero fee.
              </>
            )}
          </p>
        </div>
      </section>

      {/* Push State Screen / Simulation */}
      {status === 'waiting_pin' && (
        <section className="bg-status-warn-bg border-2 border-amber-300 rounded-xl p-4 shadow-md space-y-3 animate-in fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-700 text-2xl animate-spin" aria-hidden="true">
                sync
              </span>
              <div>
                <h3 className="font-bold text-amber-900 text-sm">
                  {momoMode === 'live'
                    ? str('Live MoMo Prompt Sent', 'Koodi ya MoMo esindiddwa mu LIVE')
                    : str('USSD Push Sent to Member Phone', 'Koodi ya USSD esindiddwa ku ssimu y’omukiise')}
                </h3>
                <p className="text-xs text-amber-800">
                  {momoMode === 'live'
                    ? str(`Waiting for ${memberName} to approve the prompt on their phone...`, `Tulindiriza ${memberName} okukkiriza koodi ku ssimu ye...`)
                    : str(`Waiting for ${memberName} to enter Mobile Money PIN...`, `Tulindiriza ${memberName} okuyingiza PIN ya nsimbi...`)}
                </p>
              </div>
            </div>
            <span className="font-mono text-lg font-bold text-amber-900 bg-white/80 px-2 py-0.5 rounded border border-amber-300">
              {timerSeconds}s
            </span>
          </div>

          {momoMode === 'live' ? (
            <div className="bg-white/80 rounded-lg p-3 text-xs text-amber-900 border border-amber-200 space-y-1">
              <p className="font-bold">{str('Ask the member to approve the prompt on their phone.', 'Buuliza omukiise okukkiriza koodi ku ssimu ye.')}</p>
              <p className="font-mono text-[11px] break-all">{str('Reference:', 'Kikwatagana:')} {providerTransactionId || txnId}</p>
              <p className="text-[11px]">{str('The ledger updates only after the provider confirms payment.', 'Ekitabo kikikora buli ng’ebanga provider ekakwatagana n’okutuddwa kw’ensimbi.')}</p>
              {redirectUrl && (
                <div className="pt-1 space-y-1.5">
                  <p className="font-bold text-[11px]">{str('Member can\'t find the prompt? Send the approval link:', 'Omukiise tasobola kulaba koodi? Sendera olunyene lokukkiriza:')}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <a
                      href={`sms:${phoneNumber.replace(/\s/g, '')}?body=${encodeURIComponent(approvalMessage)}`}
                      className="py-2 bg-primary-container text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">sms</span> {str('SMS link', 'Olunyene lwa SMS')}
                    </a>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(approvalMessage)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-2 bg-secondary text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">chat</span> WhatsApp
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#1E293B] text-white rounded-lg p-3 font-mono text-xs space-y-1 shadow-inner">
              <p className="text-yellow-400 font-bold">{str(`${network} MoMo Payment Request:`, `Olunaku lwa MoMo lwa ${network}:`)}</p>
              <p>{str(`Pay UGX ${amount} to Bakwata Savings Group?`, `Ssa UGX ${amount} eri Ekibiina ky’Okutereka eby’aloba Bakwata?`)}</p>
              <p className="text-slate-400">Ref: {purpose.split(' ')[0]}</p>
              <div className="flex items-center justify-between pt-1 border-t border-slate-700 text-[11px]">
                <span className="text-emerald-400">{str('1. Enter PIN to Authorize', '1. Yingiza PIN okukyazza')}</span>
                <button
                  onClick={() => {
                    if (settledRef.current) return;
                    settledRef.current = true;
                    setStatus('confirmed');
                    const numericAmt = parseInt(amount.replace(/,/g, ''), 10) || 0;
                    onSuccessTransaction?.(numericAmt, language === 'LU' ? `${purpose} ku ${memberName}` : `${purpose} for ${memberName}`);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-0.5 rounded font-bold"
                >
                  {str('Simulate PIN Entry (Instant)', 'Yingiza PIN (mangu nga kikolo)')}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {status === 'failed' && (
        <section className="bg-red-50 border-2 border-red-200 rounded-xl p-4 shadow-sm space-y-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-red-700 text-2xl" aria-hidden="true">error</span>
            <div>
              <h3 className="font-bold text-red-900 text-sm">{str('MoMo collection not confirmed', 'Okufuna ssente mu MoMo tekwakazikidwa')}</h3>
              <p className="text-xs text-red-800">{momoError || str('No money was taken. Check the phone and try again.', 'Tewali nsimbi nga zigibiddwa. Kebera ssimu oluwo geroke ukaddayo.')}</p>
            </div>
          </div>
          <button type="button" onClick={handleReset} className="w-full py-2.5 bg-white border border-red-300 text-red-900 text-xs font-bold rounded-lg">
            {str('Try Again', 'Geroke ukaddayo')}
          </button>
        </section>
      )}

      {status === 'confirmed' && (
        <section className="bg-status-ok-bg border-2 border-secondary rounded-xl p-4 shadow-md space-y-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl" aria-hidden="true">check</span>
            </div>
            <div>
              <h3 className="font-bold text-status-ok-tx text-base">{str('MoMo Transaction Confirmed!', 'Ebuzibaa bwa MoMo bwakwataganyiddwa!')}</h3>
              <p className="text-xs text-emerald-800">
                {str(
                  `UGX ${amount} credited directly to Bakwata Group strongbox ledger.`,
                  `UGX ${amount} zigatiddwa muntu mu kitabo ky’ekasanduuko kya Bakwata.`
                )}
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
              {str('View in Passbook', 'Laba mu Ppaasibuku')}
            </button>
            <button
              onClick={handleReset}
              className="py-2.5 px-4 bg-white border border-border-strong text-primary text-xs font-semibold rounded-lg"
            >
              {str('New Push', 'Sindika oluya')}
            </button>
          </div>
        </section>
      )}

      {/* Primary Action Button */}
      {(status === 'idle' || status === 'pushing') && (
        <button
          onClick={handleSendPush}
           disabled={status === 'pushing' || !canSend}
          className="w-full min-h-[52px] bg-primary-container hover:bg-[#06241a] text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-sm active:scale-[0.99] transition disabled:opacity-60"
          type="button"
        >
          <span className="material-symbols-outlined text-xl" aria-hidden="true">send_to_mobile</span>
          <span>
            {status === 'pushing'
              ? str('Contacting MoMo…', 'Tunagana ne MoMo…')
              : str(
                  `Send MoMo Push Prompt (${network === 'MTN' ? '*165#' : '*185#'})`,
                  `Sindika koodi ya MoMo (${network === 'MTN' ? '*165#' : '*185#'})`
                )}
          </span>
        </button>
      )}

      {/* Recent MoMo Activity Ledger */}
      <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-2.5">
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
          {str('Recent MoMo Collections Today', 'Ensimbi ezakiriwaggwa mu MoMo leero')}
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2 bg-canvas-bg rounded-lg border border-border-line">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-momo-mtn" />
              <div>
                <span className="font-bold text-primary block">Joseph Mukasa</span>
                 <span className="text-[11px] text-text-muted">{str('3 Shares purchase · 09:28 AM', 'Okugula emigabo 3 · 09:28')}</span>
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
                 <span className="text-[11px] text-text-muted">{str('Welfare Contrib. · 08:45 AM', 'Enkoba y’obuyambi · 08:45')}</span>
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
