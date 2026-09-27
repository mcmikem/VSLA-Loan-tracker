import React, { useState } from 'react';
import { FundTransfer, Language, ScreenId, UserAccount } from '../types';
import { getTranslations } from '../i18n/translations';
import { FundLocationsCard } from '../components/FundLocationsCard';
import { SpeakButton } from '../components/SpeakButton';
import { speakableAmount } from '../utils/speech';
import { FundLocation } from '../utils/fundLocations';

interface HomeViewProps {
  onNavigate: (screen: ScreenId) => void;
  pendingApprovalsCount: number;
  boxCashBalance: number;
  loanFundBalance: number;
  welfareFundBalance: number;
  recentMeetingsCount?: number;
  totalMembersCount?: number;
  currentUser?: UserAccount;
  onOpenAccountModal?: () => void;
  activePreset?: string;
  groupName?: string;
  boxIdentifier?: string;
  inviteCode?: string;
  onOpenGroupModal?: (tab?: 'register' | 'join' | 'directory') => void;
  onOpenShareInvite?: () => void;
  language?: Language;
  /** Simple Mode: 3 giant Friday steps, no SaaS/testing jargon. Default ON. */
  simpleMode?: boolean;
  /** Real computed figures — never hardcode money on this screen. */
  queueTotal?: number;
  cycle?: number;
  cycleMonth?: number;
  totalCycleMonths?: number;
  sharePrice?: number;
  totalShares?: number;
  /** Member-first entry: the signed-in member's own figures. */
  myMemberName?: string;
  mySavings?: number;
  myLoanBalance?: number;
  onOpenMyAccount?: () => void;
  /** Group market teaser: neighbours' ventures on sale. */
  marketCount?: number;
  onOpenShop?: () => void;
  /** Fund locations: cash vs MoMo float vs bank. */
  momoBalance?: number;
  bankBalance?: number;
  fundTransfers?: FundTransfer[];
  onTransferFunds?: (from: FundLocation, to: FundLocation, amount: number, note: string) => string | null;
  /** False when this officer does not hold the box key. */
  canMoveFloat?: boolean;
  /** Connectivity state for the one compact status card. */
  isOnline?: boolean;
  showLocalOnly?: boolean;
  /** First-run checklist progress (officer home only). */
  hasMembers?: boolean;
  hasMet?: boolean;
  hasBackup?: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  pendingApprovalsCount,
  boxCashBalance,
  loanFundBalance,
  welfareFundBalance,
  recentMeetingsCount = 0,
  totalMembersCount = 0,
  currentUser,
  onOpenAccountModal,
  activePreset,
  groupName,
  boxIdentifier,
  inviteCode = '—',
  onOpenGroupModal,
  onOpenShareInvite,
  language = 'EN',
  simpleMode = true,
  queueTotal = 0,
  cycle = 1,
  cycleMonth = 1,
  totalCycleMonths = 10,
  sharePrice = 10000,
  totalShares = 0,
  myMemberName,
  mySavings,
  myLoanBalance,
  onOpenMyAccount,
  marketCount = 0,
  onOpenShop,
  momoBalance = 0,
  bankBalance = 0,
  fundTransfers = [],
  onTransferFunds,
  canMoveFloat = true,
  isOnline = true,
  showLocalOnly = false,
  hasMembers = false,
  hasMet = false,
  hasBackup = false,
}) => {
  const formatUGX = (num: number) => num.toLocaleString('en-US');
  const t = getTranslations(language);
  const str = (en: string, lu: string) => language === 'LU' ? lu : en;
  const displayGroupName = !groupName || groupName === 'Savings Group' ? str('Savings Group', 'Ekibiina ky’ensimbi') : groupName;
  const displayBoxIdentifier = !boxIdentifier || boxIdentifier === 'BOX' ? str('BOX', 'SANDUUKO') : boxIdentifier;
  const displayRoleTitle = currentUser
    ? language === 'LU'
      ? {
          secretary: 'Omuwandiisi omukulu n’omutundu wa sanduuko',
          treasurer: 'Omuwanika wa kibiina n’omukwasi wa kisumuluzo 2',
          keyholder: 'Omukwasi wa kisumuluzo',
          chairperson: 'Mujjamaba wa kibiina',
          member: 'Omukiise akekola',
        }[currentUser.role]
      : currentUser.roleTitle
    : str('Group officer', 'Muwanika wa kibiina');
  const cyclePct = Math.min(100, Math.round((cycleMonth / Math.max(1, totalCycleMonths)) * 100));
  // One language per label — the app language wins, no stacked second language.
  const dual = (primary: string) => (
    <span className="text-left leading-tight">
      <span className="block">{primary}</span>
    </span>
  );

  // ---- SIMPLE MODE: what a village member needs on Friday, nothing else ----
  const [checklistHidden, setChecklistHidden] = useState(false);
  if (simpleMode) {
    const checklistDismissed = (() => {
      try {
        return localStorage.getItem('vsla_checklist_done') === '1';
      } catch {
        return true;
      }
    })();
    const checklist = [
      { done: hasMembers, label: str('Add members', 'Yongera omukiise'), screen: 'member_passbook' as ScreenId },
      { done: hasMet, label: str('Run the first meeting', 'Kola olukuŋŋaana olusooka'), screen: 'meeting_wizard' as ScreenId },
      { done: hasBackup, label: str('Save a backup', 'Tereka kkopi y’ebitabo'), screen: 'backup' as ScreenId },
    ];
    const showChecklist = !checklistDismissed && checklist.some((c) => !c.done);
    const dismissChecklist = () => {
      try {
        localStorage.setItem('vsla_checklist_done', '1');
      } catch {}
      setChecklistHidden(true);
    };
    return (
      <main className="flex-1 px-4 pt-3 pb-8 space-y-4 max-w-lg mx-auto w-full">
        {/* First-run checklist: three things, then it disappears forever */}
        {showChecklist && !checklistHidden && (
          <section className="rounded-xl bg-[#00261b] text-white p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="font-bold text-sm">
                {str('Start here — 3 steps', 'Tandika hano — emitendera 3')}
              </p>
              <button
                type="button"
                onClick={dismissChecklist}
                className="text-white/60 hover:text-white text-xs font-bold px-1"
                aria-label={str('Dismiss', 'Ggalawo')}
              >
                ✕
              </button>
            </div>
            {checklist.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => onNavigate(c.screen)}
                className="w-full flex items-center gap-2.5 text-left active:scale-[0.99]"
              >
                <span
                  className={`w-7 h-7 rounded-full text-sm font-bold flex items-center justify-center shrink-0 ${
                    c.done ? 'bg-[#EAB308] text-[#00261b]' : 'bg-white/15 text-white border border-white/30'
                  }`}
                >
                  {c.done ? '✓' : '○'}
                </span>
                <span className={`text-sm font-bold ${c.done ? 'line-through opacity-60' : ''}`}>{c.label}</span>
              </button>
            ))}
          </section>
        )}
        {/* Who + which group, one line */}
        <section className="rounded-xl bg-surface-card border border-border-strong p-3 shadow-sm flex items-center gap-2.5">
          <div
            className={`w-11 h-11 rounded-full ${
              currentUser?.avatarBg || 'bg-emerald-700'
            } text-white flex items-center justify-center font-bold text-base shrink-0`}
          >
             {currentUser?.avatarInitials || '?'}
          </div>
          <div className="min-w-0 flex-1">
             <p className="font-bold text-sm text-primary truncate">
               {currentUser?.name || str('Group secretary', 'Omuwandiisi w’ekibiina')}
             </p>
             <p className="text-xs text-text-muted truncate">{displayGroupName}</p>
          </div>
          <button
            type="button"
            onClick={onOpenAccountModal}
            className="px-3 py-2 bg-surface-container text-primary border border-border-strong rounded-lg text-xs font-bold shrink-0 min-h-[44px]"
          >
             {str(t.home.switchAccount, 'Kyusa akawunti')}
          </button>
        </section>

        {/* One compact status card: approvals + backup + sync. Neutral — never red.
            Red is reserved for money-at-risk (cash gaps, default PIN). */}
        {(pendingApprovalsCount > 0 || !hasBackup || !isOnline || showLocalOnly) && (
          <section className="rounded-xl bg-surface-card border border-border-strong p-3 shadow-sm space-y-1">
            {pendingApprovalsCount > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('approvals')}
                className="w-full flex items-center gap-2.5 text-left active:scale-[0.99] min-h-[48px]"
              >
                <span className="w-9 h-9 rounded-full bg-[#00261b] text-[#EAB308] flex items-center justify-center font-bold text-sm shrink-0">
                  {pendingApprovalsCount}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-sm text-primary">
                     {pendingApprovalsCount} {str(t.home.pendingApprovals, 'ebisanyizo ebirindirira')}
                   </span>
                   <span className="block text-xs text-secondary font-bold underline">{str(t.home.reviewQueue, 'Kebera ebisanyizo →')}</span>
                </span>
                <span className="material-symbols-outlined text-primary">arrow_forward</span>
              </button>
            )}
            {!hasBackup && (
              <button
                type="button"
                onClick={() => onNavigate('backup')}
                className="w-full flex items-center gap-2.5 text-left active:scale-[0.99] min-h-[48px] border-t border-border-line pt-2"
              >
                <span className="w-9 h-9 rounded-full bg-[#DCFCE7] text-[#006d30] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">cloud_sync</span>
                </span>
                <span className="min-w-0 flex-1">
                   <span className="block font-bold text-sm text-primary">{str(t.home.simpleSaveBackup, 'Tereka kkopi y’ebitabo')}</span>
                   <span className="block text-xs text-text-muted">{str(t.home.simpleSaveBackupSub, 'Eziguma kkopi y’ebitabo oluvayo mu lukuŋŋaana')}</span>
                </span>
                <span className="material-symbols-outlined text-primary">arrow_forward</span>
              </button>
            )}
            {(!isOnline || showLocalOnly) && (
              <p className="flex items-center gap-1.5 text-xs text-text-muted border-t border-border-line pt-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-secondary' : 'bg-status-warn-tx'}`} />
                 {!isOnline
                   ? str('Offline — saved on this phone', 'Tewali mutimbagano — ebikuumibwa ku ssimu eno')
                   : str('Saved on this phone only', 'Ebikuumibwa ku ssimu eno yokka')}
              </p>
            )}
          </section>
        )}

        {/* Box cash, huge — plain words: counted cash in the metal box */}
        <section className="bg-primary-container text-white rounded-xl p-5 shadow-md">
          <p className="text-xs text-primary-fixed uppercase tracking-wider font-semibold">
             {str(t.home.boxCashBalance, 'Ssente enkalu eziri mu sanduuko')}
          </p>
          <p className="font-mono font-bold tracking-tight mt-1">
            <span className="text-xl align-top mr-1">UGX</span>
            <span className="text-4xl">{formatUGX(boxCashBalance)}</span>
          </p>
          <p className="text-xs text-primary-fixed/80 mt-1">
             {str('Physical cash counted in the metal box', 'Ensimbi enkalu ezibaliddwa mu sanduuko')}
            {recentMeetingsCount > 0 && (
              <span> · {t.home.meetingNumber(recentMeetingsCount)}</span>
            )}
          </p>
          <SpeakButton
            tone="dark"
            className="mt-3"
            label={str('Read aloud', 'Soma')} // okusoma = to read (D4G row 22)
            text={`Box cash in the metal box: ${speakableAmount(boxCashBalance)} shillings.`}
          />
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-bold">
              {t.home.welfareFund}: <span className="font-mono">UGX {formatUGX(welfareFundBalance)}</span>
            </span>
            {(momoBalance > 0 || bankBalance > 0) && (
              <>
                {momoBalance > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-bold">
                    MoMo: <span className="font-mono">UGX {formatUGX(momoBalance)}</span>
                  </span>
                )}
                {bankBalance > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-bold">
                     {str('Bank', 'Banka')}: <span className="font-mono">UGX {formatUGX(bankBalance)}</span>
                  </span>
                )}
              </>
            )}
          </div>
        </section>

        {/* 3 giant Friday steps */}
        <section className="space-y-3">
           <h2 className="font-bold text-on-surface px-0.5">{str(t.home.simpleSteps, 'Emitendera 3 buli lwa kukya')}</h2>
          <button
            type="button"
            onClick={() => onNavigate('meeting_wizard')}
            className="w-full min-h-[72px] flex items-center gap-3 px-4 py-3 bg-[#15803D] text-white rounded-xl font-bold text-lg shadow active:scale-[0.99]"
          >
            <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-xl shrink-0">1</span>
             {dual(str(t.home.startMeeting, 'Tandika olukuŋŋaana lwa kukya'))}
            <span className="material-symbols-outlined ml-auto">arrow_forward</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('member_passbook')}
            className="w-full min-h-[72px] flex items-center gap-3 px-4 py-3 bg-surface-card border-2 border-border-strong rounded-xl font-bold text-lg text-primary shadow-sm active:scale-[0.99]"
          >
            <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl shrink-0">2</span>
            {dual(str(t.nav.members, 'Abakiise'))}
            <span className="material-symbols-outlined ml-auto">arrow_forward</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('approvals')}
            className="w-full min-h-[72px] flex items-center gap-3 px-4 py-3 bg-surface-card border-2 border-border-strong rounded-xl font-bold text-lg text-primary shadow-sm active:scale-[0.99]"
          >
            <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl shrink-0">3</span>
            {dual(str(t.nav.approvals, 'Okukkiriza'))}
            {pendingApprovalsCount > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-status-warn-bg text-status-warn-tx text-xs font-bold border border-[#FDE68A]">
                {pendingApprovalsCount}
              </span>
            )}
            <span className="material-symbols-outlined ml-auto">arrow_forward</span>
          </button>
        </section>

        {/* Quiet way out — one text link, nothing competing */}
        <button
          type="button"
          onClick={() => onNavigate('help')}
          className="w-full py-3 text-center text-sm font-bold text-secondary underline active:scale-[0.99]"
        >
           {str('Need help? Ask here', 'Wabula? Buuza omuwandiisi')}
        </button>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 pt-3 pb-8 space-y-4 max-w-lg mx-auto w-full">
      {/* SaaS Group Banner & Invite Bar */}
      <section
        aria-label={str('Group Identity & Invite Code', 'Erinina ly’ekibiina n’koodi y’okuyita')}
        className="rounded-xl bg-surface-card border border-border-strong p-3 shadow-sm flex items-center justify-between gap-2.5 flex-wrap"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">domain</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
                 <span className="font-bold text-xs text-primary truncate max-w-[150px] sm:max-w-xs">{displayGroupName}</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-primary/10 text-primary rounded font-mono font-bold">
                 {displayBoxIdentifier}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
              <span>{t.home.groupCode}:</span>
              <button
                type="button"
                onClick={onOpenShareInvite}
                className="font-mono font-bold text-secondary hover:underline flex items-center gap-0.5"
                 title={str('Click to view full invite kit & share link', 'Kikanda okulaba ekikozesa kya kuyita n’ekizibu')}
              >
                <span>{inviteCode}</span>
                <span className="material-symbols-outlined text-[12px]">share</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenShareInvite && (
            <button
              type="button"
              onClick={onOpenShareInvite}
              className="px-2 py-1 bg-surface-container hover:bg-surface-container-high text-primary border border-border-strong rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer"
               title={str('Share Group Invite Code', 'Gabana koodi y’ekibiina')}
            >
              <span className="material-symbols-outlined text-[15px] text-secondary">share</span>
              <span>{t.topBar.inviteBtn}</span>
            </button>
          )}

          {onOpenGroupModal && (
            <button
              type="button"
              onClick={() => onOpenGroupModal('register')}
              className="px-2 py-1 bg-primary text-white hover:bg-primary/90 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer shadow-xs"
               title={str('Onboard or register another savings group', 'Wandiisa ekibiina kiryikyalo k’ensimbi')}
            >
              <span className="material-symbols-outlined text-[15px]">add_business</span>
              <span>+ {language === 'LU' ? 'Yongera' : t.home.switchGroup.split(' ')[0]}</span>
            </button>
          )}
        </div>
      </section>

      {/* Active User Account & Testing Persona Strip */}
      <section
         aria-label={str('Active Account Profile', 'Akawunti ekikola')}
        className="rounded-xl bg-surface-card border border-border-strong p-3 shadow-sm flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div
            className={`w-10 h-10 rounded-full ${
              currentUser?.avatarBg || 'bg-emerald-700'
            } text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm border border-white/20`}
          >
             {currentUser?.avatarInitials || '?'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs text-primary truncate">
                 {currentUser?.name || str('Group secretary', 'Omuwandiisi w’ekibiina')}
               </span>
               <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-surface-container border text-text-muted">
                 {currentUser?.memberNo ? `#${currentUser.memberNo}` : str('EXEC', 'KULIIZA')}
              </span>
            </div>
            <p className="text-[11px] text-text-muted truncate">
               {displayRoleTitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAccountModal}
          className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-bold shrink-0 transition flex items-center gap-1 active:scale-95"
           title={str('Switch to another seeded test account', 'Kyusa ku akawunti endala esobozedwa okukebera')}
        >
          <span className="material-symbols-outlined text-[16px]">switch_account</span>
           <span>{str(t.home.switchGroup, 'Kyusa ekibiina')}</span>
        </button>
      </section>

      {/* Pending Approvals Banner */}
      {pendingApprovalsCount > 0 && (
        <section
           aria-label={str('Approvals Alert', 'Olulunaku lw’ebisanyizo')}
          className="rounded-lg bg-status-warn-bg border border-[#FDE68A] p-3 shadow-[0px_1px_3px_rgba(0,0,0,0.04)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-status-warn-tx text-[22px] shrink-0 mt-0.5">
                warning
              </span>
              <div>
                <p className="text-body-sm-bold font-body-sm-bold text-status-warn-tx">
                   {pendingApprovalsCount} {str(t.home.pendingApprovals, 'ebisanyizo ebirindirira')}
                </p>
                <p className="text-body-sm font-body-sm text-status-warn-tx font-num">
                   {str(t.home.queueTotal, 'Omugatte w’ebisanyizo ebirindirira:')}{' '}
                  <span className="font-mono text-currency-sm font-semibold">
                    UGX {formatUGX(queueTotal)}
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('approvals')}
              className="min-h-[44px] inline-flex items-center text-label-md font-label-md text-status-warn-tx font-bold underline hover:opacity-80 shrink-0"
              type="button"
            >
               {str(t.home.reviewQueue, 'Kebera ebisanyizo')} →
            </button>
          </div>
        </section>
      )}

      {/* Hero Card: Group Vault Status */}
      <section
         aria-label={str('Vault Balances', 'Amatundu ga muwanika')}
        className="bg-primary-container text-white rounded-xl p-5 shadow-[0px_4px_12px_rgba(11,61,46,0.18)] relative overflow-hidden"
      >
        {/* Background Utilitarian Pattern Accent */}
        <div className="absolute -right-8 -bottom-8 opacity-5 pointer-events-none">
          <span className="material-symbols-outlined text-[160px]">account_balance</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-fixed text-[20px]">
              lock_clock
            </span>
            <span className="text-label-md font-label-md text-primary-fixed uppercase tracking-wider font-semibold text-xs">
               {str(t.home.vaultStatus, 'Embeera y’enkoba')}
            </span>
          </div>
          {/* Badge: next meeting number (computed, never a guessed date) */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-card/15 border border-white/20 text-white font-label-sm text-xs">
            <span className="w-2 h-2 rounded-full bg-secondary-fixed animate-pulse" />
             <span>{language === 'LU' ? `Olukuŋŋaana #${recentMeetingsCount + 1}` : t.home.meetingNumber(recentMeetingsCount + 1)}</span>
          </div>
        </div>

        {/* Box Cash (Primary Hero Number) */}
        <div className="mb-5">
          <span className="text-label-sm font-label-sm text-[#c0c8c3] block mb-1">
            {str(t.home.boxCashBalance, 'Ssente enkalu eziri mu sanduuko')}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-currency-md font-currency-md text-primary-fixed-dim font-bold font-mono">
              UGX
            </span>
            <span className="font-mono text-currency-display font-bold tracking-tight text-white text-[28px] leading-9">
              {formatUGX(boxCashBalance)}
            </span>
          </div>
        </div>

        {/* 2-Tier Sub-Funds Split Grid */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/15">
          <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
            <div className="flex items-center gap-1 text-[#c0c8c3] mb-1">
              <span className="material-symbols-outlined text-[16px]">payments</span>
               <span className="text-label-sm font-label-sm text-xs">{str(t.home.loanFund, 'Ssente z’ebyewolo')}</span>
            </div>
            <p className="font-mono text-currency-md font-bold text-white">
              UGX {formatUGX(loanFundBalance)}
            </p>
             <p className="text-[11px] text-primary-fixed mt-0.5">{str(t.home.activeCapital, 'Ssente eziri mu byewolo')}</p>
          </div>

          <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
            <div className="flex items-center gap-1 text-[#c0c8c3] mb-1">
              <span className="material-symbols-outlined text-[16px]">health_and_safety</span>
               <span className="text-label-sm font-label-sm text-xs">{str(t.home.welfareFund, 'Ssente z’obuyambi')}</span>
            </div>
            <p className="font-mono text-currency-md font-bold text-white">
              UGX {formatUGX(welfareFundBalance)}
            </p>
             <p className="text-[11px] text-primary-fixed mt-0.5">{str(t.home.emergencyBuffer, 'Ssente z’obuzibu')}</p>
          </div>
        </div>
      </section>

      {/* Where money sits: box cash vs MoMo float vs bank + audited moves */}
      <FundLocationsCard
        cash={boxCashBalance}
        momo={momoBalance}
        bank={bankBalance}
        recentTransfers={fundTransfers}
        language={language}
        onTransfer={onTransferFunds}
        canMoveFloat={canMoveFloat}
      />
      {onTransferFunds && !canMoveFloat && (
        <p className="text-[11px] text-status-warn-tx bg-status-warn-bg border border-status-warn-tx/30 rounded-xl p-2.5 font-bold">
          {str(
            'Moving the group money is for the officer who holds the box key. Ask them, or ask an officer to change your role.',
            'Kusuna ssenti ez’ekibiina kwa muliro gumala n’omukwasi w’ekisanduku. Buulira, oba buulira omukulu akakyendereza kitundu kyo.'
          )}
        </p>
      )}

      {/* Operating Cycle Status Card */}
      <section
         aria-label={str('Cycle Progress', 'Enkulaakulana y’enziringana')}
        className="bg-surface-card rounded-[14px] border border-border-line p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)]"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border-line">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-headline-sm font-headline-sm text-on-surface font-bold">
                 {str(t.home.cycleProgress, 'Enkulaakulana y’enziringana')} {cycle}
              </h2>
              <span className="px-2 py-0.5 rounded text-label-sm font-label-sm bg-status-ok-bg text-status-ok-tx font-semibold text-xs">
                 {str(t.home.activeStatus, 'Kikola')}
              </span>
            </div>
            <p className="text-body-sm font-body-sm text-text-muted mt-0.5 text-xs">
               {language === 'LU' ? `Omwezi ${cycleMonth} ku ${totalCycleMonths} • Olukuŋŋaana lw’okugaba emigabo` : t.home.cycleMonths(cycleMonth, totalCycleMonths)}
            </p>
          </div>
          <span className="font-mono text-currency-md font-bold text-primary">{cyclePct}%</span>
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full bg-border-line rounded-full h-2.5 my-3 overflow-hidden">
          <div className="bg-secondary h-2.5 rounded-full" style={{ width: `${cyclePct}%` }} />
        </div>

        {/* Cycle Financial Metrics Grid (all computed from live state) */}
        <div className="grid grid-cols-3 gap-2 pt-1 text-left">
          <div className="bg-canvas-bg rounded-lg p-2 border border-border-line">
            <span className="text-[11px] font-medium text-text-muted block">{str(t.home.sharePrice, 'Omuwendo gw’omugabo')}</span>
            <span className="font-mono text-currency-sm font-bold text-on-surface">UGX {formatUGX(sharePrice)}</span>
          </div>
          <div className="bg-canvas-bg rounded-lg p-2 border border-border-line">
            <span className="text-[11px] font-medium text-text-muted block">{str(t.home.totalShares, 'Emigabo gyonna')}</span>
            <span className="font-mono text-currency-sm font-bold text-on-surface">
              {totalShares.toLocaleString()} {language === 'LU' ? 'emigabo' : 'shares'}
            </span>
          </div>
          <div className="bg-canvas-bg rounded-lg p-2 border border-border-line">
            <span className="text-[11px] font-medium text-text-muted block">{str(t.home.membersLabel, 'Abakiise')}</span>
            <span className="font-mono text-currency-sm font-bold text-on-surface">{formatUGX(totalMembersCount)}</span>
          </div>
        </div>
      </section>

      {/* Quick Actions Grid (Strict 2-Column Utilitarian Layout) */}
      <section aria-label={str('Group Operations', 'Emirimu g’ekibiina')}>
        <h2 className="text-label-md font-label-md font-bold text-on-surface mb-2.5 px-0.5">
           {str(t.home.fieldActions, 'Emirimu g’ekibiina')}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {/* Start Meeting: Primary Accent Action */}
          <button
            onClick={() => onNavigate('meeting_wizard')}
            className="col-span-2 min-h-[56px] w-full flex items-center justify-between px-4 py-3 bg-[#15803D] hover:bg-primary text-white rounded-lg font-body-sm-bold text-body-sm-bold shadow-[0px_1px_3px_rgba(0,0,0,0.08)] active:scale-[0.99] transition-all"
            type="button"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[24px]">play_circle</span>
              <div className="text-left">
                <span className="block text-body-lg-bold font-body-lg-bold leading-tight font-bold">
                   {str(t.home.startMeeting, 'Tandika olukuŋŋaana lwa kukya')}
                </span>
                <span className="text-label-sm font-label-sm text-white/80 font-normal text-xs">
                   {str(t.home.startMeetingSub, 'Ggulawo kitabo ky’abakiise n’okubala ssente')}
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[22px]">arrow_forward</span>
          </button>

          {/* Record Repayment */}
          <button
            onClick={() => onNavigate('member_passbook')}
            className="min-h-[56px] flex items-center gap-3 p-3 bg-surface-card border border-border-line rounded-lg hover:border-primary text-left active:bg-surface-container transition-colors shadow-[0px_1px_3px_rgba(0,0,0,0.05)]"
            type="button"
          >
            <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[22px]">payments</span>
            </div>
            <div>
              <p className="text-body-sm-bold font-body-sm-bold text-on-surface leading-snug font-bold">
                 {str(t.home.recordRepayment, 'Wandiika okusasula')}
              </p>
               <p className="text-label-sm font-label-sm text-text-muted text-xs">{str(t.home.recordRepaymentSub, 'Ebyewolo n’amagoba ga buli mwezi')}</p>
            </div>
          </button>

          {/* New Loan Request */}
          <button
            onClick={() => onNavigate('new_loan')}
            className="min-h-[56px] flex items-center gap-3 p-3 bg-surface-card border border-border-line rounded-lg hover:border-primary text-left active:bg-surface-container transition-colors shadow-[0px_1px_3px_rgba(0,0,0,0.05)]"
            type="button"
          >
            <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[22px]">real_estate_agent</span>
            </div>
            <div>
              <p className="text-body-sm-bold font-body-sm-bold text-on-surface leading-snug font-bold">
                 {str(t.home.newLoan, 'Saba ekyewolo')}
              </p>
               <p className="text-label-sm font-label-sm text-text-muted text-xs">{str(t.home.newLoanSub, 'Fomu y’okusaba ekyewolo n’okupima omukiise')}</p>
            </div>
          </button>

          {/* Emergency Grant */}
          <button
            onClick={() => onNavigate('welfare_fund')}
            className="min-h-[56px] flex items-center gap-3 p-3 bg-surface-card border border-border-line rounded-lg hover:border-primary text-left active:bg-surface-container transition-colors shadow-[0px_1px_3px_rgba(0,0,0,0.05)]"
            type="button"
          >
            <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[22px]">emergency</span>
            </div>
            <div>
              <p className="text-body-sm-bold font-body-sm-bold text-on-surface leading-snug font-bold">
                 {str(t.home.welfareGrant, 'Yobera obuyambi')}
              </p>
               <p className="text-label-sm font-label-sm text-text-muted text-xs">{str(t.home.welfareGrantSub, 'Obuyambi eri omukiise afunye obuzibu')}</p>
            </div>
          </button>

          {/* Share Purchase / Passbook */}
          <button
            onClick={() => onNavigate('member_passbook')}
            className="min-h-[56px] flex items-center gap-3 p-3 bg-surface-card border border-border-line rounded-lg hover:border-primary text-left active:bg-surface-container transition-colors shadow-[0px_1px_3px_rgba(0,0,0,0.05)]"
            type="button"
          >
            <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[22px]">receipt_long</span>
            </div>
            <div>
              <p className="text-body-sm-bold font-body-sm-bold text-on-surface leading-snug font-bold">
                 {str(t.home.buyShares, 'Gula emigabo')}
              </p>
               <p className="text-label-sm font-label-sm text-text-muted text-xs">{str(t.home.buySharesSub, 'Gula emigabo era teeka sitamu')}</p>
            </div>
          </button>

          {/* Backup & Audit Center (Full Span) */}
          <button
            onClick={() => onNavigate('backup')}
            className="col-span-2 min-h-[52px] flex items-center justify-between p-3.5 bg-status-ok-bg/40 border-2 border-secondary/60 rounded-lg hover:border-secondary text-left active:scale-[0.99] transition shadow-[0px_1px_3px_rgba(0,0,0,0.04)]"
            type="button"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary text-white flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">cloud_sync</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-body-sm-bold font-body-sm-bold text-primary font-bold">
                     {str(t.home.backupAudit, 'Kutereka n’okukebera')}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-secondary text-white text-[10px] font-mono font-bold">
                     {str('SYNC', 'MUTINDIRIZA')}
                  </span>
                </div>
                <p className="text-label-sm font-label-sm text-text-muted text-xs">
                   {str(t.home.backupAuditSub, 'Koppa kkopi y’ebitabo ku ssimu era oluzo lusindike mu kikola')}
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-secondary text-[20px]">
              chevron_right
            </span>
          </button>
        </div>
      </section>

      {/* Recent Meetings Section */}
      <section aria-label={str('Meeting Audits', 'Ebikozesebwa mu lukuŋŋaana')} className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-label-md font-label-md font-bold text-on-surface">
             {str(t.home.recentActivity, 'Ebyakakolebwa')}
          </h2>
          <button
            onClick={() => onNavigate('audio_broadcast')}
            className="text-label-sm font-label-sm text-primary font-semibold hover:underline"
          >
             {str('Broadcasts & All Meetings', 'Amaloboozi n’ebyafaayo byonna by’enkuŋŋaana')}
          </button>
        </div>

        <div className="bg-surface-card rounded-xl border border-border-line p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)]">
          {recentMeetingsCount === 0 ? (
            <div className="text-center space-y-2 py-2">
              <p className="text-sm font-bold text-primary">
                 {str('No meetings yet — start the first one', 'Tewali lukuŋŋaana lunatera — tandika olulowo olusooka')}
              </p>
              <button
                type="button"
                onClick={() => onNavigate('meeting_wizard')}
                className="px-5 min-h-[48px] bg-[#15803D] text-white rounded-lg font-bold text-sm active:scale-[0.99]"
              >
                 {str(t.home.startMeeting, 'Tandika olukuŋŋaana lwa kukya')}
              </button>
            </div>
          ) : (
          <>
          <div className="flex items-start justify-between pb-3 border-b border-border-line">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-headline-sm font-headline-sm font-bold text-on-surface">
                   {language === 'LU' ? `Olukuŋŋaana #${recentMeetingsCount}` : t.home.meetingNumber(recentMeetingsCount)}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-label-sm font-label-sm font-semibold bg-status-ok-bg text-status-ok-tx text-xs">
                   {str(t.home.closedReconciled, 'Kyaggaddwa era ssente ziryizinganira')}
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-text-muted text-[20px]">
              verified
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 py-3">
            <div>
              <span className="text-label-sm font-label-sm text-text-muted block text-xs">
                 {str(t.home.boxNow, 'Ssente enkalu eziri mu sanduuko')}
              </span>
              <span className="font-mono text-currency-md font-bold text-on-surface">
                UGX {formatUGX(boxCashBalance)}
              </span>
            </div>
            <div>
              <span className="text-label-sm font-label-sm text-text-muted block text-xs">
                 {str(t.home.membersLabel, 'Abakiise')}
              </span>
              <span className="font-mono text-currency-md font-bold text-on-surface">
                {formatUGX(totalMembersCount)}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigate('audio_broadcast')}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-surface-container-low hover:bg-surface-container border border-border-strong text-primary rounded-lg text-body-sm-bold font-body-sm-bold transition-colors text-xs font-semibold"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">description</span>
               <span>{str(t.home.viewMinutes, 'Laba ebiwandiiko')}</span>
            </button>
          </div>
          </>
          )}
        </div>
      </section>
    </main>
  );
};
