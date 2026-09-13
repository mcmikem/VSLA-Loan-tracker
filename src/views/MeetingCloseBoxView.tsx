import React, { useState } from 'react';
import { Language, ScreenId } from '../types';
import { getTranslations } from '../i18n/translations';

interface MeetingCloseBoxViewProps {
  onOpenDiscrepancyModal: () => void;
  onNavigate: (screen: ScreenId) => void;
  onCompleteMeeting: (countedCash: number, minutes: string) => void;
  expectedTotal?: number;
  meetingNumber?: number;
  language?: Language;
}

export const MeetingCloseBoxView: React.FC<MeetingCloseBoxViewProps> = ({
  onOpenDiscrepancyModal,
  onNavigate,
  onCompleteMeeting,
  expectedTotal = 1420000,
  meetingNumber = 28,
  language = 'EN',
}) => {
  const t = getTranslations(language);

  // Denominations state
  const [denom50k, setDenom50k] = useState(18);
  const [denom20k, setDenom20k] = useState(20);
  const [denom10k, setDenom10k] = useState(10);
  const [denom5k, setDenom5k] = useState(0);
  const [denom2k, setDenom2k] = useState(0);
  const [denom1k, setDenom1k] = useState(0);
  const [coins, setCoins] = useState(20000);

  const [step1Checked, setStep1Checked] = useState(true);
  const [step2Checked, setStep2Checked] = useState(true);
  const [keyholder1Signed, setKeyholder1Signed] = useState(true);
  const [keyholder2Signed, setKeyholder2Signed] = useState(true);
  const [keyholder3Signed, setKeyholder3Signed] = useState(true);

  const [minutesText, setMinutesText] = useState(
    language === 'LU'
      ? `Olukuŋŋaana #${meetingNumber} lwaggaddwa bulungi ku ssaawa 12:45 ez'emisana. Abakiise bonna babaddewo. Olukuŋŋaana oluddako ku Lwokutaano mu Kalerwe Community Hall.`
      : language === 'SW'
      ? `Mkutano #${meetingNumber} ulifungwa kwa amani saa 12:45 mchana. Wanachama wote walihudhuria. Mkutano ujao ni Ijumaa ukumbi wa jamii Kalerwe.`
      : `Meeting #${meetingNumber} closed peacefully at 12:45 PM. All members present. Next meeting on Friday at Kalerwe Community Hall.`
  );
  const [isLocked, setIsLocked] = useState(false);

  const countedTotal =
    denom50k * 50000 +
    denom20k * 20000 +
    denom10k * 10000 +
    denom5k * 5000 +
    denom2k * 2000 +
    denom1k * 1000 +
    coins;

  const difference = countedTotal - expectedTotal;

  const handleLockClick = () => {
    if (!step1Checked || !step2Checked) {
      alert(
        language === 'LU'
          ? 'Banza okakase emitendera gyonna egy\'okwekebejja nga tonnasiba sanduuko.'
          : language === 'SW'
          ? 'Tafadhali kamilisha vipengele vyote vya uthibitishaji kabla ya kufunga sanduku.'
          : 'Please complete all verification checklist items before locking the strongbox.'
      );
      return;
    }
    if (!keyholder1Signed || !keyholder2Signed || !keyholder3Signed) {
      alert(
        language === 'LU'
          ? 'Abakwasi b\'ebisumuluzo bonna 3 balina okussaako emikono era bakakase ebisumuluzo.'
          : language === 'SW'
          ? 'Walinzi wote 3 wa funguo lazima wathibitishe na kusaini kabla ya kufunga sanduku.'
          : 'All 3 keyholders must countersign and verify padlock keys before locking.'
      );
      return;
    }
    setIsLocked(true);
    onCompleteMeeting(countedTotal, minutesText);
  };

  return (
    <div className="flex flex-col flex-1 pb-10">
      {/* Sticky Sub-Header */}
      <div className="bg-surface-card border-b border-border-line sticky top-14 z-30 shadow-sm w-full">
        <div className="max-w-lg mx-auto px-4 py-3">
          {/* Title & Persistence Status */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="font-headline-md text-headline-md text-primary font-bold">
                {t.meetingClose.meetingLabel(meetingNumber)}
              </h1>
              <p className="font-label-sm text-label-sm text-text-muted text-xs">
                {language === 'LU'
                  ? 'Omutendera 8 ku 8 — Okubala Ssente n\'Okusiba Sanduuko'
                  : language === 'SW'
                  ? 'Hatua ya 8 kati ya 8 — Ulinganishaji wa Pesa Taslimu na Kufunga'
                  : 'Step 8 of 8 — Physical Reconciliation & Padlocking'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-status-ok-bg text-status-ok-tx rounded-full border border-[#bbf7d0]">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span className="font-label-sm text-label-sm font-semibold tracking-tight text-xs">
                {language === 'LU' ? 'Okwekebejja Okuliwo' : language === 'SW' ? 'Ukaguzi wa Moja kwa Moja' : 'Live Audit'}
              </span>
            </div>
          </div>

          {/* Step Horizontal Tracker */}
          <div className="flex items-center justify-between gap-1 pt-1.5 overflow-x-auto no-scrollbar">
            {[1, 2, 3, 4, 5, 6, 7].map((step) => (
              <div key={step} className="flex items-center gap-1 shrink-0">
                <div
                  className="w-6 h-6 rounded-full bg-status-ok-bg text-status-ok-tx flex items-center justify-center border border-secondary text-xs"
                  title={`Step ${step} Completed`}
                >
                  <span className="material-symbols-outlined text-[14px]">check</span>
                </div>
                <div className="w-2 h-0.5 bg-secondary" />
              </div>
            ))}

            {/* Active Step 8 */}
            <div className="flex items-center shrink-0">
              <div
                className="w-7 h-7 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-[13px] ring-2 ring-primary ring-offset-1"
                title="Final Reconciliation"
              >
                8
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 pt-1 border-t border-border-line">
            <button
              onClick={() => onNavigate('audio_broadcast')}
              className="text-xs text-primary font-bold flex items-center gap-1 hover:underline"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">volume_up</span>
              {language === 'LU' ? 'Soma Ebibaliddwa mu Ddoboozi' : language === 'SW' ? 'Tangaza kwa Sauti' : 'Broadcast Readout'}
            </button>
            <button
              onClick={() => onNavigate('backup')}
              className="text-xs text-secondary font-bold flex items-center gap-1 hover:underline"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">cloud_sync</span>
              {t.home.backupAudit}
            </button>
          </div>
        </div>
      </div>

      <main className="w-full max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* RECONCILIATION SUMMARY SCOREBOARD */}
        <section className="bg-primary-container text-white rounded-xl p-4 shadow-[0px_4px_12px_rgba(11,61,46,0.18)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-primary-fixed tracking-wider">
              {language === 'LU' ? 'Ssente Ezibaliddwa n\'Ezisuubirwa' : language === 'SW' ? 'Pesa Zilizopo dhidi ya Ukaguzi' : 'Physical Cash vs Expected Audit'}
            </span>
            <span className="text-[11px] font-mono bg-white/20 px-2 py-0.5 rounded text-white">
              Meeting #{meetingNumber}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-lg p-2.5">
              <span className="text-[11px] text-[#c0c8c3] block">{t.meetingClose.countedTotal}</span>
              <span className="font-mono text-xl font-bold text-white tracking-tight">
                UGX {countedTotal.toLocaleString('en-US')}
              </span>
            </div>
            <div className="bg-white/10 rounded-lg p-2.5">
              <span className="text-[11px] text-[#c0c8c3] block">{t.meetingClose.expectedInBox}</span>
              <span className="font-mono text-xl font-bold text-white tracking-tight">
                UGX {expectedTotal.toLocaleString('en-US')}
              </span>
            </div>
          </div>

          {/* Discrepancy Alert */}
          {difference === 0 ? (
            <div className="bg-secondary/30 border border-secondary p-2.5 rounded-lg flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-bold text-white">
                <span className="material-symbols-outlined text-base text-secondary-fixed">
                  verified
                </span>
                {t.meetingClose.balanced}
              </span>
              <span className="font-mono text-secondary-fixed font-bold">UGX 0</span>
            </div>
          ) : (
            <div className="bg-status-warn-bg/90 border border-amber-300 p-2.5 rounded-lg flex items-center justify-between text-xs text-status-warn-tx">
              <span className="flex items-center gap-1.5 font-bold">
                <span className="material-symbols-outlined text-base">warning</span>
                {difference > 0 ? t.meetingClose.surplus(difference) : t.meetingClose.shortage(Math.abs(difference))}
              </span>
              <button
                onClick={onOpenDiscrepancyModal}
                className="underline font-bold text-xs"
                type="button"
              >
                {language === 'LU' ? 'Tereeza' : language === 'SW' ? 'Tatua' : 'Resolve'}
              </button>
            </div>
          )}
        </section>

        {/* DENOMINATION COUNTER */}
        <section className="bg-surface-card rounded-xl border border-border-strong shadow-[0px_1px_3px_rgba(0,0,0,0.08)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
              {t.meetingClose.denominationTable}
            </h3>
            <span className="text-[11px] text-text-muted font-mono">UGX Cash</span>
          </div>

          <div className="space-y-2.5">
            {/* 50k note */}
            <div className="flex items-center justify-between p-2.5 bg-canvas-bg rounded-lg border border-border-line">
              <div>
                <span className="font-mono font-bold text-xs text-primary block">UGX 50,000 Note</span>
                <span className="text-[10px] text-text-muted font-mono">
                  = UGX {(denom50k * 50000).toLocaleString('en-US')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDenom50k((v) => Math.max(0, v - 1))}
                  className="w-7 h-7 rounded bg-white border border-border-strong text-primary font-bold hover:bg-surface-container"
                >
                  -
                </button>
                <input
                  type="number"
                  value={denom50k}
                  onChange={(e) => setDenom50k(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-12 text-center font-mono font-bold text-xs bg-white border rounded py-1"
                />
                <button
                  type="button"
                  onClick={() => setDenom50k((v) => v + 1)}
                  className="w-7 h-7 rounded bg-white border border-border-strong text-primary font-bold hover:bg-surface-container"
                >
                  +
                </button>
              </div>
            </div>

            {/* 20k note */}
            <div className="flex items-center justify-between p-2.5 bg-canvas-bg rounded-lg border border-border-line">
              <div>
                <span className="font-mono font-bold text-xs text-primary block">UGX 20,000 Note</span>
                <span className="text-[10px] text-text-muted font-mono">
                  = UGX {(denom20k * 20000).toLocaleString('en-US')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDenom20k((v) => Math.max(0, v - 1))}
                  className="w-7 h-7 rounded bg-white border border-border-strong text-primary font-bold hover:bg-surface-container"
                >
                  -
                </button>
                <input
                  type="number"
                  value={denom20k}
                  onChange={(e) => setDenom20k(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-12 text-center font-mono font-bold text-xs bg-white border rounded py-1"
                />
                <button
                  type="button"
                  onClick={() => setDenom20k((v) => v + 1)}
                  className="w-7 h-7 rounded bg-white border border-border-strong text-primary font-bold hover:bg-surface-container"
                >
                  +
                </button>
              </div>
            </div>

            {/* 10k note */}
            <div className="flex items-center justify-between p-2.5 bg-canvas-bg rounded-lg border border-border-line">
              <div>
                <span className="font-mono font-bold text-xs text-primary block">UGX 10,000 Note</span>
                <span className="text-[10px] text-text-muted font-mono">
                  = UGX {(denom10k * 10000).toLocaleString('en-US')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDenom10k((v) => Math.max(0, v - 1))}
                  className="w-7 h-7 rounded bg-white border border-border-strong text-primary font-bold hover:bg-surface-container"
                >
                  -
                </button>
                <input
                  type="number"
                  value={denom10k}
                  onChange={(e) => setDenom10k(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-12 text-center font-mono font-bold text-xs bg-white border rounded py-1"
                />
                <button
                  type="button"
                  onClick={() => setDenom10k((v) => v + 1)}
                  className="w-7 h-7 rounded bg-white border border-border-strong text-primary font-bold hover:bg-surface-container"
                >
                  +
                </button>
              </div>
            </div>

            {/* Coins & Small Change */}
            <div className="flex items-center justify-between p-2.5 bg-canvas-bg rounded-lg border border-border-line">
              <div>
                <span className="font-mono font-bold text-xs text-primary block">{t.meetingClose.coinsLabel}</span>
                <span className="text-[10px] text-text-muted">500, 200, 100, 1k, 2k, 5k</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-text-muted">UGX</span>
                <input
                  type="number"
                  step="1000"
                  value={coins}
                  onChange={(e) => setCoins(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-24 text-right font-mono font-bold text-xs bg-white border rounded py-1 px-2"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 3-KEYHOLDER VERIFICATION PROTOCOL */}
        <section className="bg-surface-card rounded-xl border border-border-strong shadow-[0px_1px_3px_rgba(0,0,0,0.08)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-secondary">vpn_key</span>
              {t.meetingClose.custodianSignatures}
            </h3>
            <span className="text-[10px] bg-status-ok-bg text-status-ok-tx px-2 py-0.5 rounded font-bold">
              VSLA Standard
            </span>
          </div>
          <p className="text-xs text-text-muted">
            {language === 'LU'
              ? 'Sanduuko tesobola kusibwa nga tewali ebisumuluzo byonna 3 eby\'abakwasi abalondeddwa.'
              : language === 'SW'
              ? 'Sanduku haliwezi kufungwa bila zamu ya funguo zote 3 za walinzi waliochaguliwa.'
              : 'The box cannot be locked without the physical key turn of all 3 elected keyholders.'}
          </p>

          <div className="space-y-2">
            <label className="flex items-center justify-between p-2.5 bg-canvas-bg rounded-lg border border-border-line cursor-pointer">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={keyholder1Signed}
                  onChange={(e) => setKeyholder1Signed(e.target.checked)}
                  className="w-4 h-4 rounded text-secondary"
                />
                <div>
                  <span className="font-bold text-xs text-primary block">Sarah Nabukalu</span>
                  <span className="text-[10px] text-text-muted">{t.meetingClose.custodian1}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-status-ok-tx">{t.meetingClose.signed}</span>
            </label>

            <label className="flex items-center justify-between p-2.5 bg-canvas-bg rounded-lg border border-border-line cursor-pointer">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={keyholder2Signed}
                  onChange={(e) => setKeyholder2Signed(e.target.checked)}
                  className="w-4 h-4 rounded text-secondary"
                />
                <div>
                  <span className="font-bold text-xs text-primary block">Peter Ssemwogerere</span>
                  <span className="text-[10px] text-text-muted">{t.meetingClose.custodian2}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-status-ok-tx">{t.meetingClose.signed}</span>
            </label>

            <label className="flex items-center justify-between p-2.5 bg-canvas-bg rounded-lg border border-border-line cursor-pointer">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={keyholder3Signed}
                  onChange={(e) => setKeyholder3Signed(e.target.checked)}
                  className="w-4 h-4 rounded text-secondary"
                />
                <div>
                  <span className="font-bold text-xs text-primary block">David Alupo</span>
                  <span className="text-[10px] text-text-muted">{t.meetingClose.custodian3}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-status-ok-tx">{t.meetingClose.signed}</span>
            </label>
          </div>
        </section>

        {/* MEETING MINUTES & RECORD */}
        <section className="bg-surface-card rounded-xl border border-border-strong shadow-[0px_1px_3px_rgba(0,0,0,0.08)] p-4 space-y-2">
          <label
            className="block text-xs font-bold text-primary uppercase tracking-wider"
            htmlFor="meeting-minutes"
          >
            {t.meetingClose.meetingMinutes}
          </label>
          <textarea
            id="meeting-minutes"
            value={minutesText}
            onChange={(e) => setMinutesText(e.target.value)}
            rows={3}
            placeholder={t.meetingClose.minutesPlaceholder}
            className="w-full bg-white border border-border-strong rounded-lg p-2.5 text-xs text-on-surface focus:ring-2 focus:ring-primary outline-none transition"
          />
        </section>

        {/* PRE-LOCK VERIFICATION CHECKLIST */}
        <section className="bg-surface-card rounded-xl border border-border-strong shadow-[0px_1px_3px_rgba(0,0,0,0.08)] p-4 space-y-2">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
            {language === 'LU' ? 'Okukakasa Nga Tonnasiba Sanduuko' : language === 'SW' ? 'Orodha ya Kukagua Kabla ya Kufunga' : 'Pre-Lock Verification Checklist'}
          </h3>
          <div className="space-y-2">
            <label className="flex items-start gap-2.5 p-2 rounded-lg bg-canvas-bg border border-border-line cursor-pointer">
              <input
                type="checkbox"
                checked={step1Checked}
                onChange={(e) => setStep1Checked(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-secondary"
              />
              <div className="text-xs">
                <span className="font-bold text-on-surface block">
                  {language === 'LU' ? 'Emitendera 7 gyonna egyakulembedde gikakasiddwa' : language === 'SW' ? 'Hatua 7 za awali zimethibitishwa na kuhifadhiwa' : 'All 7 prior steps verified & saved'}
                </span>
                <span className="text-[11px] text-text-muted">
                  {language === 'LU' ? 'Okubala abakiise, Emigabo, Enkoba, Okusasula, Ebyewolo.' : language === 'SW' ? 'Mahudhurio, Hisa, Mfuko wa Jamii, Marejesho, Mikopo.' : 'Attendance, Shares, Welfare, Repayments, Loans.'}
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2 rounded-lg bg-canvas-bg border border-border-line cursor-pointer">
              <input
                type="checkbox"
                checked={step2Checked}
                onChange={(e) => setStep2Checked(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-secondary"
              />
              <div className="text-xs">
                <span className="font-bold text-on-surface block">
                  {language === 'LU' ? 'Sanduuko ekebejjebwa era ebisawo ebikalu biggiddwamu' : language === 'SW' ? 'Sanduku limekaguliwa na mifuko tupu kuondolewa' : 'Physical box inspected & empty bags removed'}
                </span>
                <span className="text-[11px] text-text-muted">
                  {language === 'LU' ? 'Kkaada zokka ezzikkirizibwa ne ttereeyi ya ssente bye bisigaddemu.' : language === 'SW' ? 'Kadi zilizoidhinishwa tu na sinia ya pesa zimebaki.' : 'Only authorized ledger cards and cash tray remain.'}
                </span>
              </div>
            </label>
          </div>
        </section>

        {/* LOCK ACTION */}
        <section className="pt-2 pb-6 space-y-2 text-center">
          {isLocked ? (
            <div className="p-4 bg-status-ok-bg border border-secondary rounded-xl text-center space-y-2 animate-in zoom-in-95">
              <span className="material-symbols-outlined text-3xl text-secondary">
                lock_clock
              </span>
              <h4 className="font-bold text-secondary text-base">
                {t.meetingClose.boxLockedAlert}
              </h4>
              <p className="text-xs text-[#14532d]">
                {language === 'LU'
                  ? `Ssente eziri mu sanduuko UGX ${countedTotal.toLocaleString('en-US')} zikaziddwa mu mutimbagano n'etterekero.`
                  : language === 'SW'
                  ? `Baki ya pesa taslimu UGX ${countedTotal.toLocaleString('en-US')} imehifadhiwa kikamilifu.`
                  : `Box cash balance of UGX ${countedTotal.toLocaleString('en-US')} committed to durable backend storage.`}
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => onNavigate('home')}
                  className="flex-1 py-2.5 bg-secondary text-white font-bold rounded-lg text-xs"
                  type="button"
                >
                  {language === 'LU' ? 'Ddayo ku Ddaashboardi' : language === 'SW' ? 'Rudi Dashibodi' : 'Return to Dashboard'}
                </button>
                <button
                  onClick={() => onNavigate('backup')}
                  className="py-2.5 px-3 bg-surface-card border border-border-strong text-primary font-bold rounded-lg text-xs"
                  type="button"
                >
                  {language === 'LU' ? 'Kuuma Kkopi (Backup)' : language === 'SW' ? 'Pakua Nakala' : 'Export Backup'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={handleLockClick}
                className="w-full min-h-[50px] bg-primary hover:bg-primary-container text-white font-bold text-sm rounded-xl shadow-md active:scale-[0.98] transition flex items-center justify-center gap-2 px-4"
                type="button"
              >
                <span className="material-symbols-outlined text-xl">lock</span>
                <span>{t.meetingClose.lockBoxBtn}</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 text-status-warn-tx text-[11px] px-2 py-1 bg-status-warn-bg rounded-lg border border-[#fde68a]">
                <span className="material-symbols-outlined text-sm">warning</span>
                <span>
                  {language === 'LU'
                    ? `Kino kijja kusiba Olukuŋŋaana #${meetingNumber} era kikuume omugatte gwa ssente zonna eziri mu sanduuko.`
                    : language === 'SW'
                    ? `Hii itafunga Mkutano #${meetingNumber} na kusasisha jumla ya pesa taslimu zilizopo.`
                    : `This will seal Meeting #${meetingNumber} and update total box cash.`}
                </span>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
};
