import React from 'react';
import { FundTransfer, Language, ScreenId, UserAccount } from '../types';
import { getTranslations } from '../i18n/translations';
import { FundLocationsCard } from '../components/FundLocationsCard';
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
  /** Connectivity state for the one compact status card. */
  isOnline?: boolean;
  showLocalOnly?: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  pendingApprovalsCount,
  boxCashBalance,
  loanFundBalance,
  welfareFundBalance,
  recentMeetingsCount = 28,
  totalMembersCount = 30,
  currentUser,
  onOpenAccountModal,
  activePreset,
  groupName = 'Bakwata Savings Group',
  boxIdentifier = 'BOX-KLA-042',
  inviteCode = 'BAK-4290',
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
  isOnline = true,
  showLocalOnly = false,
}) => {
  const formatUGX = (num: number) => num.toLocaleString('en-US');
  const t = getTranslations(language);
  const cyclePct = Math.min(100, Math.round((cycleMonth / Math.max(1, totalCycleMonths)) * 100));
  // One language per label — the app language wins, no stacked second language.
  const dual = (primary: string) => (
    <span className="text-left leading-tight">
      <span className="block">{primary}</span>
    </span>
  );

  // ---- SIMPLE MODE: what a village member needs on Friday, nothing else ----
  if (simpleMode) {
    return (
      <main className="flex-1 px-4 pt-3 pb-8 space-y-4 max-w-lg mx-auto w-full">
        {/* Who + which group, one line */}
        <section className="rounded-xl bg-surface-card border border-border-strong p-3 shadow-sm flex items-center gap-2.5">
          <div
            className={`w-11 h-11 rounded-full ${
              currentUser?.avatarBg || 'bg-emerald-700'
            } text-white flex items-center justify-center font-bold text-base shrink-0`}
          >
            {currentUser?.avatarInitials || 'GA'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm text-primary truncate">
              {currentUser?.name || 'Grace Akello'}
            </p>
            <p className="text-xs text-text-muted truncate">{groupName}</p>
          </div>
          <button
            type="button"
            onClick={onOpenAccountModal}
            className="px-3 py-2 bg-surface-container text-primary border border-border-strong rounded-lg text-xs font-bold shrink-0 min-h-[44px]"
          >
            {t.home.switchAccount}
          </button>
        </section>

        {/* One compact status card: approvals + sync state, neutral — never red.
            Red is reserved for money-at-risk (cash gaps, default PIN). */}
        {(pendingApprovalsCount > 0 || !isOnline || showLocalOnly) && (
          <section className="rounded-xl bg-surface-card border border-border-strong p-3 shadow-sm space-y-2">
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
                    {pendingApprovalsCount} {t.home.pendingApprovals}
                  </span>
                  <span className="block text-[11px] text-secondary font-bold underline">{t.home.reviewQueue}</span>
                </span>
                <span className="material-symbols-outlined text-primary">arrow_forward</span>
              </button>
            )}
            {(!isOnline || showLocalOnly) && (
              <p className="flex items-center gap-1.5 text-[11px] text-text-muted border-t border-border-line pt-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-secondary' : 'bg-status-warn-tx'}`} />
                {!isOnline
                  ? (language === 'LU' ? 'Tewali Mutimbagano — bikolebwa ku ssimu eno' : 'Offline — saved on this phone')
                  : (language === 'LU' ? 'Zikolebwa ku ssimu eno yokka' : 'Saved on this phone only')}
              </p>
            )}
          </section>
        )}

        {/* Box cash, huge — plain words: counted cash in the metal box */}
        <section className="bg-primary-container text-white rounded-xl p-5 shadow-md">
          <p className="text-xs text-primary-fixed uppercase tracking-wider font-semibold">
            {t.home.boxCashBalance}
          </p>
          <p className="font-mono font-bold tracking-tight mt-1">
            <span className="text-xl align-top mr-1">UGX</span>
            <span className="text-4xl">{formatUGX(boxCashBalance)}</span>
          </p>
          <p className="text-[11px] text-primary-fixed/80 mt-1">
            {language === 'LU'
              ? 'Ensimbi enkalu ezibaliddwa mu kasanduuko'
              : 'Physical cash counted in the metal box'}
            {recentMeetingsCount > 0 && (
              <span> · {t.home.meetingNumber(recentMeetingsCount)}</span>
            )}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold">
              {t.home.welfareFund}: <span className="font-mono">UGX {formatUGX(welfareFundBalance)}</span>
            </span>
            {(momoBalance > 0 || bankBalance > 0) && (
              <>
                {momoBalance > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold">
                    MoMo: <span className="font-mono">UGX {formatUGX(momoBalance)}</span>
                  </span>
                )}
                {bankBalance > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold">
                    Bank: <span className="font-mono">UGX {formatUGX(bankBalance)}</span>
                  </span>
                )}
              </>
            )}
          </div>
        </section>

        {/* My account — the member's own money first */}
        {onOpenMyAccount && myMemberName && (
          <section className="rounded-xl bg-[#FFF8E1] border-2 border-[#EAB308] p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-[#00261b] text-[#EAB308] flex items-center justify-center font-bold shrink-0">
                {myMemberName.charAt(0)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-sm text-primary truncate">
                  {myMemberName} · UGX {formatUGX(mySavings || 0)}
                </span>
                <span className="block text-xs text-text-muted">
                  {(myLoanBalance || 0) > 0
                    ? `${language === 'LU' ? 'Obbanja:' : 'Owe'} UGX ${formatUGX(myLoanBalance || 0)}`
                    : (language === 'LU' ? 'Tewali bbanja — laba bizinesi' : 'Debt-free — see ventures')}
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenMyAccount}
              className="w-full min-h-[52px] bg-[#00261b] text-[#EAB308] rounded-lg font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <span className="material-symbols-outlined">account_circle</span>
              {language === 'LU' ? 'Ggulawo akawunti kange' : 'Open my account'}
            </button>
          </section>
        )}

        {/* Group market teaser — neighbours' ventures */}
        {onOpenShop && marketCount > 0 && (
          <button
            type="button"
            onClick={onOpenShop}
            className="w-full rounded-xl bg-surface-card border border-border-strong p-4 text-left active:scale-[0.99] flex items-center gap-3 shadow-sm"
          >
            <span className="w-10 h-10 rounded-lg bg-[#FEF3C7] text-status-warn-tx flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined">storefront</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-sm text-primary">
                {marketCount} {language === 'LU' ? 'bizinesi z’abakiise ziriwo →' : 'neighbour ventures on sale →'}
              </span>
              <span className="block text-xs text-text-muted">
                {language === 'LU' ? 'Tundanagane — ekibiina kikule' : 'Buy from each other — grow together'}
              </span>
            </span>
            <span className="material-symbols-outlined text-primary">arrow_forward</span>
          </button>
        )}

        {/* 3 giant Friday steps */}
        <section className="space-y-3">
          <h2 className="font-bold text-on-surface px-0.5">{t.home.simpleSteps}</h2>
          <button
            type="button"
            onClick={() => onNavigate('meeting_wizard')}
            className="w-full min-h-[72px] flex items-center gap-3 px-4 py-3 bg-[#15803D] text-white rounded-xl font-bold text-lg shadow active:scale-[0.99]"
          >
            <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-xl shrink-0">1</span>
            {dual(t.home.startMeeting)}
            <span className="material-symbols-outlined ml-auto">arrow_forward</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('member_passbook')}
            className="w-full min-h-[72px] flex items-center gap-3 px-4 py-3 bg-surface-card border-2 border-border-strong rounded-xl font-bold text-lg text-primary shadow-sm active:scale-[0.99]"
          >
            <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl shrink-0">2</span>
            {dual(t.nav.members)}
            <span className="material-symbols-outlined ml-auto">arrow_forward</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('approvals')}
            className="w-full min-h-[72px] flex items-center gap-3 px-4 py-3 bg-surface-card border-2 border-border-strong rounded-xl font-bold text-lg text-primary shadow-sm active:scale-[0.99]"
          >
            <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl shrink-0">3</span>
            {dual(t.nav.approvals)}
            {pendingApprovalsCount > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-status-warn-bg text-status-warn-tx text-xs font-bold border border-[#FDE68A]">
                {pendingApprovalsCount}
              </span>
            )}
            <span className="material-symbols-outlined ml-auto">arrow_forward</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('backup')}
            className="w-full min-h-[60px] flex items-center gap-3 px-4 py-3 bg-status-ok-bg/40 border-2 border-secondary/60 rounded-xl font-bold text-primary active:scale-[0.99]"
          >
            <span className="material-symbols-outlined text-secondary">cloud_sync</span>
            <span className="text-left">
              <span className="block">{t.home.simpleSaveBackup}</span>
              <span className="block text-xs font-normal text-text-muted">{t.home.simpleSaveBackupSub}</span>
            </span>
          </button>
        </section>

        {/* Lost? */}
        <section className="rounded-xl bg-surface-card border border-border-line p-4 text-center space-y-2">
          <p className="text-xs text-text-muted">{t.home.simpleHelp}</p>
          <button
            type="button"
            onClick={() => onNavigate('help')}
            className="w-full min-h-[52px] bg-primary text-white rounded-lg font-bold active:scale-[0.99]"
          >
            {language === 'LU' ? 'Obuyambi' : 'Help & Support'}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 pt-3 pb-8 space-y-4 max-w-lg mx-auto w-full">
      {/* SaaS Group Banner & Invite Bar */}
      <section
        aria-label="Group Identity & Invite Code"
        className="rounded-xl bg-surface-card border border-border-strong p-3 shadow-sm flex items-center justify-between gap-2.5 flex-wrap"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">domain</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs text-primary truncate max-w-[150px] sm:max-w-xs">{groupName}</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-primary/10 text-primary rounded font-mono font-bold">
                {boxIdentifier}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
              <span>{t.home.groupCode}:</span>
              <button
                type="button"
                onClick={onOpenShareInvite}
                className="font-mono font-bold text-secondary hover:underline flex items-center gap-0.5"
                title="Click to view full invite kit & share link"
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
              title="Share Group Invite Code"
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
              title="Onboard or register another savings group"
            >
              <span className="material-symbols-outlined text-[15px]">add_business</span>
              <span>+ {t.home.switchGroup.split(' ')[0]}</span>
            </button>
          )}
        </div>
      </section>

      {/* Active User Account & Testing Persona Strip */}
      <section
        aria-label="Active Account Profile"
        className="rounded-xl bg-surface-card border border-border-strong p-3 shadow-sm flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div
            className={`w-10 h-10 rounded-full ${
              currentUser?.avatarBg || 'bg-emerald-700'
            } text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm border border-white/20`}
          >
            {currentUser?.avatarInitials || 'GA'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs text-primary truncate">
                {currentUser?.name || 'Grace Akello'}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-surface-container border text-text-muted">
                {currentUser?.memberNo ? `#${currentUser.memberNo}` : 'EXEC'}
              </span>
            </div>
            <p className="text-[11px] text-text-muted truncate">
              {currentUser?.roleTitle || 'General Secretary & Box Teller'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAccountModal}
          className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-bold shrink-0 transition flex items-center gap-1 active:scale-95"
          title="Switch to another seeded test account"
        >
          <span className="material-symbols-outlined text-[16px]">switch_account</span>
          <span>{t.home.switchGroup}</span>
        </button>
      </section>

      {/* Pending Approvals Banner */}
      {pendingApprovalsCount > 0 && (
        <section
          aria-label="Approvals Alert"
          className="rounded-lg bg-status-warn-bg border border-[#FDE68A] p-3 shadow-[0px_1px_3px_rgba(0,0,0,0.04)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-status-warn-tx text-[22px] shrink-0 mt-0.5">
                warning
              </span>
              <div>
                <p className="text-body-sm-bold font-body-sm-bold text-status-warn-tx">
                  {pendingApprovalsCount} {t.home.pendingApprovals}
                </p>
                <p className="text-body-sm font-body-sm text-status-warn-tx font-num">
                  {t.home.queueTotal}:{' '}
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
              {t.home.reviewQueue} →
            </button>
          </div>
        </section>
      )}

      {/* Hero Card: Group Vault Status */}
      <section
        aria-label="Vault Balances"
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
              {t.home.vaultStatus}
            </span>
          </div>
          {/* Badge: next meeting number (computed, never a guessed date) */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-card/15 border border-white/20 text-white font-label-sm text-xs">
            <span className="w-2 h-2 rounded-full bg-secondary-fixed animate-pulse" />
            <span>{t.home.meetingNumber(recentMeetingsCount + 1)}</span>
          </div>
        </div>

        {/* Box Cash (Primary Hero Number) */}
        <div className="mb-5">
          <span className="text-label-sm font-label-sm text-[#c0c8c3] block mb-1">
            {t.home.boxCashBalance}
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
              <span className="text-label-sm font-label-sm text-xs">{t.home.loanFund}</span>
            </div>
            <p className="font-mono text-currency-md font-bold text-white">
              UGX {formatUGX(loanFundBalance)}
            </p>
            <p className="text-[11px] text-primary-fixed mt-0.5">{t.home.activeCapital}</p>
          </div>

          <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
            <div className="flex items-center gap-1 text-[#c0c8c3] mb-1">
              <span className="material-symbols-outlined text-[16px]">health_and_safety</span>
              <span className="text-label-sm font-label-sm text-xs">{t.home.welfareFund}</span>
            </div>
            <p className="font-mono text-currency-md font-bold text-white">
              UGX {formatUGX(welfareFundBalance)}
            </p>
            <p className="text-[11px] text-primary-fixed mt-0.5">{t.home.emergencyBuffer}</p>
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
      />

      {/* Operating Cycle Status Card */}
      <section
        aria-label="Cycle Progress"
        className="bg-surface-card rounded-[14px] border border-border-line p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)]"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border-line">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-headline-sm font-headline-sm text-on-surface font-bold">
                {t.home.cycleProgress} {cycle}
              </h2>
              <span className="px-2 py-0.5 rounded text-label-sm font-label-sm bg-status-ok-bg text-status-ok-tx font-semibold text-xs">
                {t.home.activeStatus}
              </span>
            </div>
            <p className="text-body-sm font-body-sm text-text-muted mt-0.5 text-xs">
              {t.home.cycleMonths(cycleMonth, totalCycleMonths)}
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
            <span className="text-[11px] font-medium text-text-muted block">{t.home.sharePrice}</span>
            <span className="font-mono text-currency-sm font-bold text-on-surface">UGX {formatUGX(sharePrice)}</span>
          </div>
          <div className="bg-canvas-bg rounded-lg p-2 border border-border-line">
            <span className="text-[11px] font-medium text-text-muted block">{t.home.totalShares}</span>
            <span className="font-mono text-currency-sm font-bold text-on-surface">{formatUGX(totalShares)}</span>
          </div>
          <div className="bg-canvas-bg rounded-lg p-2 border border-border-line">
            <span className="text-[11px] font-medium text-text-muted block">{t.home.membersLabel}</span>
            <span className="font-mono text-currency-sm font-bold text-on-surface">{formatUGX(totalMembersCount)}</span>
          </div>
        </div>
      </section>

      {/* Quick Actions Grid (Strict 2-Column Utilitarian Layout) */}
      <section aria-label="Group Operations">
        <h2 className="text-label-md font-label-md font-bold text-on-surface mb-2.5 px-0.5">
          {t.home.fieldActions}
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
                  {t.home.startMeeting}
                </span>
                <span className="text-label-sm font-label-sm text-white/80 font-normal text-xs">
                  {t.home.startMeetingSub}
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
                {t.home.recordRepayment}
              </p>
              <p className="text-label-sm font-label-sm text-text-muted text-xs">{t.home.recordRepaymentSub}</p>
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
                {t.home.newLoan}
              </p>
              <p className="text-label-sm font-label-sm text-text-muted text-xs">{t.home.newLoanSub}</p>
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
                {t.home.welfareGrant}
              </p>
              <p className="text-label-sm font-label-sm text-text-muted text-xs">{t.home.welfareGrantSub}</p>
            </div>
          </button>

          {/* Share Purchase / Passbook */}
          <button
            onClick={() => onNavigate('momo_push')}
            className="min-h-[56px] flex items-center gap-3 p-3 bg-surface-card border border-border-line rounded-lg hover:border-primary text-left active:bg-surface-container transition-colors shadow-[0px_1px_3px_rgba(0,0,0,0.05)]"
            type="button"
          >
            <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[22px]">receipt_long</span>
            </div>
            <div>
              <p className="text-body-sm-bold font-body-sm-bold text-on-surface leading-snug font-bold">
                {t.home.buyShares}
              </p>
              <p className="text-label-sm font-label-sm text-text-muted text-xs">{t.home.buySharesSub}</p>
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
                    {t.home.backupAudit}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-secondary text-white text-[10px] font-mono font-bold">
                    SYNC
                  </span>
                </div>
                <p className="text-label-sm font-label-sm text-text-muted text-xs">
                  {t.home.backupAuditSub}
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
      <section aria-label="Meeting Audits" className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-label-md font-label-md font-bold text-on-surface">
            {t.home.recentActivity}
          </h2>
          <button
            onClick={() => onNavigate('audio_broadcast')}
            className="text-label-sm font-label-sm text-primary font-semibold hover:underline"
          >
            {language === 'LU' ? 'Amaloboozi n\'Enkuŋŋaana Zonna'  : 'Broadcasts & All Meetings'}
          </button>
        </div>

        <div className="bg-surface-card rounded-xl border border-border-line p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)]">
          {recentMeetingsCount === 0 ? (
            <div className="text-center space-y-2 py-2">
              <p className="text-sm font-bold text-primary">
                {language === 'LU' ? 'Tewali lukuŋŋaana lunatera — tandika erisooka' : 'No meetings yet — start the first one'}
              </p>
              <button
                type="button"
                onClick={() => onNavigate('meeting_wizard')}
                className="px-5 min-h-[48px] bg-[#15803D] text-white rounded-lg font-bold text-sm active:scale-[0.99]"
              >
                {t.home.startMeeting}
              </button>
            </div>
          ) : (
          <>
          <div className="flex items-start justify-between pb-3 border-b border-border-line">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-headline-sm font-headline-sm font-bold text-on-surface">
                  {t.home.meetingNumber(recentMeetingsCount)}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-label-sm font-label-sm font-semibold bg-status-ok-bg text-status-ok-tx text-xs">
                  {t.home.closedReconciled}
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
                {t.home.boxNow}
              </span>
              <span className="font-mono text-currency-md font-bold text-on-surface">
                UGX {formatUGX(boxCashBalance)}
              </span>
            </div>
            <div>
              <span className="text-label-sm font-label-sm text-text-muted block text-xs">
                {t.home.membersLabel}
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
              <span>{t.home.viewMinutes}</span>
            </button>
          </div>
          </>
          )}
        </div>
      </section>
    </main>
  );
};
