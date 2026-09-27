import React, { useState } from 'react';
import { GroupSummary, Language, UserAccount } from '../types';
import { LANGUAGE_OPTIONS, getTranslations } from '../i18n/translations';
import { GroupLogo } from './GroupLogo';

interface TopAppBarProps {
  language: Language;
  onToggleLanguage: () => void;
  onSelectLanguage?: (lang: Language) => void;
  pendingApprovalsCount: number;
  notificationCount?: number;
  currentUser?: UserAccount;
  onOpenAccountModal?: () => void;
  onOpenNotifications?: () => void;
  onOpenBackup?: () => void;
  selectedBox?: string;
  onSelectBox?: (box: string) => void;
  roleSubtitle?: string;
  isOnline?: boolean;
  availableGroups?: GroupSummary[];
  currentGroupId?: string;
  onSelectGroup?: (groupId: string) => void;
  onOpenGroupModal?: (tab?: 'register' | 'join' | 'directory') => void;
  onOpenShareInvite?: () => void;
  /** Simple Mode: fewer screens, no SaaS jargon. Default ON. */
  simpleMode?: boolean;
  onToggleSimpleMode?: () => void;
  /** Elder text: bigger words + tap targets. Default ON. */
  elderMode?: boolean;
  onToggleElderMode?: () => void;
  /** High-contrast theme for reading in bright sun. Default OFF. */
  sunlightMode?: boolean;
  onToggleSunlightMode?: () => void;
  onOpenPublicDisplay?: () => void;
  onOpenHelp?: () => void;
  /** Group's own logo (Settings) — replaces the VSLA mark. */
  logoUrl?: string;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  language,
  onToggleLanguage,
  onSelectLanguage,
  pendingApprovalsCount,
  notificationCount = pendingApprovalsCount,
  currentUser,
  onOpenAccountModal,
  onOpenNotifications,
  onOpenBackup,
  selectedBox = 'Savings Group',
  roleSubtitle,
  isOnline = true,
  availableGroups = [],
  currentGroupId = 'bakwata-01',
  onSelectGroup,
  onOpenGroupModal,
  onOpenShareInvite,
  simpleMode = true,
  onToggleSimpleMode,
  elderMode = true,
  onToggleElderMode,
  sunlightMode = false,
  onToggleSunlightMode,
  onOpenPublicDisplay,
  onOpenHelp,
  logoUrl,
}) => {
  const [showBoxDropdown, setShowBoxDropdown] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);

     const t = getTranslations(language);
   const str = (en: string, lu: string) => (language === 'LU' ? lu : en);
   const badgeCount = Math.max(notificationCount, pendingApprovalsCount);

  const activeGroup = availableGroups.find((g) => g.id === currentGroupId);
  const displayGroupName = activeGroup?.name || selectedBox.split('•')[0].trim();
  const displayBoxId = activeGroup?.boxIdentifier || selectedBox.split('•')[1]?.trim() || 'BOX';

  // Display controls live in the menu, not a random strip under the header.
  // Every row is icon + plain words + a switch, so it reads without much literacy.
  const displayRows: {
    icon: string;
    label: string;
    hint: string;
    active?: boolean;
    onToggle?: () => void;
    onOpen?: () => void;
  }[] = [
    {
      icon: 'grid_view',
      label: t.a11y.simpleView,
      hint: t.a11y.simpleViewHint,
      active: simpleMode,
      onToggle: onToggleSimpleMode,
    },
    {
      icon: 'format_size',
      label: t.a11y.bigText,
      hint: t.a11y.bigTextHint,
      active: elderMode,
      onToggle: onToggleElderMode,
    },
    {
      icon: 'wb_sunny',
      label: t.a11y.brightScreen,
      hint: t.a11y.brightScreenHint,
      active: sunlightMode,
      onToggle: onToggleSunlightMode,
    },
    {
      icon: 'tv',
      label: t.a11y.showOnScreen,
      hint: t.a11y.showOnScreenHint,
      onOpen: onOpenPublicDisplay,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-surface-card border-b border-border-line shadow-[0px_1px_3px_rgba(0,0,0,0.08)]">
      {/* Row 1: Brand Anchor, Active Account Chip & Controls */}
      <div className="flex justify-between items-center w-full px-4 h-14 max-w-lg mx-auto">
        {/* Leading Icon + Group Title */}
        <div className="flex items-center gap-2 overflow-hidden">
          <GroupLogo logoUrl={logoUrl} alt={t.topBar.appName} className="w-8 h-8 rounded-lg" />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-headline-sm font-headline-sm font-bold text-primary tracking-tight truncate">
                {t.topBar.appName}
              </h1>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-primary text-white tracking-wide uppercase">
                {currentUser?.role || 'Executive'}
              </span>
              <span className="text-[10px] text-text-muted font-medium truncate">
                {roleSubtitle || t.topBar.tagline}
              </span>
            </div>
          </div>
        </div>

        {/* Trailing actions: who is signed in, alerts, and one Menu. WhatsApp-style:
            the header stays quiet and every setting lives behind the menu. */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onOpenAccountModal}
            title={`Logged in as ${currentUser?.name || 'Group officer'} (${currentUser?.roleTitle || 'Executive'}). Click to switch account.`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container hover:bg-surface-container-high rounded-full border border-border-strong text-primary transition active:scale-95 cursor-pointer shadow-xs"
          >
            <div
              className={`w-6 h-6 rounded-full ${currentUser?.avatarBg || 'bg-emerald-700'} text-white flex items-center justify-center font-bold text-[10px]`}
            >
              {currentUser?.avatarInitials || '?'}
            </div>
            <span className="font-bold text-xs max-w-[80px] truncate">
              {currentUser?.name.split(' ')[0] || t.topBar.activeAccount}
            </span>
            <span className="material-symbols-outlined text-[14px] text-text-muted">
              arrow_drop_down
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label={t.a11y.notifications}
            className="relative min-h-[48px] min-w-[48px] flex items-center justify-center text-primary hover:bg-surface-container rounded-lg transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {badgeCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-4 h-4 px-0.5 rounded-full bg-error text-white font-bold text-[10px]">
                {badgeCount}
              </span>
            )}
          </button>

          <div className="relative">
            <button
              type="button"
              aria-label={t.a11y.menu}
              aria-expanded={showOverflow}
              onClick={() => setShowOverflow(!showOverflow)}
              className="min-h-[48px] min-w-[48px] flex items-center justify-center text-primary hover:bg-surface-container rounded-lg transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            {showOverflow && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowOverflow(false)} />
                <div className="absolute right-0 top-full mt-1 w-[19rem] max-w-[calc(100vw-2rem)] bg-surface-card rounded-2xl shadow-2xl border border-border-strong z-50 overflow-hidden">
                  <div className="px-3.5 py-2.5 bg-surface-container-low border-b border-border-line">
                    <p className="text-sm font-bold text-primary truncate">
                      {currentUser?.name || t.topBar.activeAccount}
                    </p>
                    <p className="text-xs text-text-muted truncate">{displayGroupName}</p>
                  </div>

                  <div className="max-h-[70vh] overflow-y-auto py-1.5">
                    {onOpenHelp && (
                      <button
                        type="button"
                        onClick={() => { setShowOverflow(false); onOpenHelp(); }}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[52px] text-left hover:bg-surface-container active:scale-[0.99]"
                      >
                        <span className="material-symbols-outlined text-[22px] text-primary shrink-0">help</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-primary leading-tight">{t.a11y.help}</span>
                          <span className="block text-xs text-text-muted leading-tight">{t.a11y.helpHint}</span>
                        </span>
                        <span className="material-symbols-outlined text-[20px] text-text-muted shrink-0">chevron_right</span>
                      </button>
                    )}
                    {onOpenShareInvite && (
                      <button
                        type="button"
                        onClick={() => { setShowOverflow(false); onOpenShareInvite(); }}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[52px] text-left hover:bg-surface-container active:scale-[0.99]"
                      >
                        <span className="material-symbols-outlined text-[22px] text-secondary shrink-0">share</span>
                        <span className="text-sm font-bold text-primary flex-1">{t.topBar.inviteBtn}</span>
                        <span className="material-symbols-outlined text-[20px] text-text-muted shrink-0">chevron_right</span>
                      </button>
                    )}
                    {onOpenBackup && (
                      <button
                        type="button"
                        onClick={() => { setShowOverflow(false); onOpenBackup(); }}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[52px] text-left hover:bg-surface-container active:scale-[0.99]"
                      >
                        <span className="material-symbols-outlined text-[22px] text-primary shrink-0">cloud_sync</span>
                        <span className="text-sm font-bold text-primary flex-1">{t.home.backupAudit}</span>
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOnline ? 'bg-secondary' : 'bg-status-warn-tx'}`} />
                      </button>
                    )}

                    <div className="mt-1.5 px-3.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-text-muted border-t border-border-line">
                      {t.a11y.display}
                    </div>
                    {displayRows.map((row) => (
                      <button
                        key={row.icon}
                        type="button"
                        role={row.onOpen ? undefined : 'switch'}
                        aria-checked={row.onOpen ? undefined : !!row.active}
                        onClick={() => {
                          setShowOverflow(false);
                          if (row.onOpen) row.onOpen();
                          else row.onToggle?.();
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[56px] text-left hover:bg-surface-container active:scale-[0.99]"
                      >
                        <span className="material-symbols-outlined text-[22px] text-primary shrink-0">{row.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-primary leading-tight">{row.label}</span>
                          <span className="block text-xs text-text-muted leading-tight">{row.hint}</span>
                        </span>
                        {row.onToggle ? (
                          <span
                            className={`shrink-0 w-11 h-7 rounded-full p-0.5 flex items-center ${
                              row.active ? 'bg-secondary justify-end' : 'bg-surface-container-high justify-start'
                            }`}
                          >
                            <span className="w-6 h-6 rounded-full bg-white shadow-sm" />
                          </span>
                        ) : (
                          <span className="material-symbols-outlined text-[20px] text-text-muted shrink-0">chevron_right</span>
                        )}
                      </button>
                    ))}

                    <div className="mt-1.5 px-3.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-text-muted border-t border-border-line">
                      {t.a11y.language}
                    </div>
                    <div className="flex gap-2 px-3.5 pb-2">
                      {LANGUAGE_OPTIONS.map((opt) => {
                        const isSelected = opt.code === language;
                        return (
                          <button
                            key={opt.code}
                            type="button"
                            onClick={() => {
                              if (onSelectLanguage) onSelectLanguage(opt.code);
                              else if (opt.code !== language) onToggleLanguage();
                            }}
                            aria-pressed={isSelected}
                            className={`flex-1 flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl border text-sm font-bold ${
                              isSelected
                                ? 'bg-primary text-white border-primary'
                                : 'bg-surface-card text-primary border-border-strong'
                            }`}
                          >
                            <span className="text-base">{opt.flag}</span>
                            {opt.nativeLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: group name for members / single groups; switcher only when
          there are 2+ reachable groups — never strangers' groups. */}
      <div className="px-4 pb-2.5 pt-0.5 max-w-lg mx-auto relative">
        {currentUser?.role === 'member' || availableGroups.length <= 1 ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-canvas-bg border border-border-strong rounded-lg text-xs min-h-[38px]">
            <span className="material-symbols-outlined text-[16px] text-secondary">domain</span>
            <span className="font-bold text-on-surface truncate">{selectedBox}</span>
          </div>
        ) : (
        <>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBoxDropdown(!showBoxDropdown)}
            className="flex-1 flex items-center justify-between px-3 py-1.5 bg-canvas-bg border border-border-strong rounded-lg hover:border-primary transition-colors text-left min-h-[38px] active:bg-surface-container-low text-xs"
            type="button"
          >
            <div className="flex items-center gap-1.5 truncate">
              <span className="material-symbols-outlined text-[16px] text-secondary">domain</span>
              <span className="font-bold text-on-surface truncate">
                {selectedBox}
              </span>
            </div>
            <span className="material-symbols-outlined text-[18px] text-text-muted shrink-0">
              arrow_drop_down
            </span>
          </button>

          {/* Quick SaaS Onboard Trigger — hidden in Simple Mode */}
          {!simpleMode && onOpenGroupModal && (
            <button
              type="button"
              onClick={() => onOpenGroupModal('register')}
               title={str('Register a new savings group', 'Wandiisa ekibiina kikya')}
              className="px-2.5 py-1.5 bg-secondary text-white hover:brightness-105 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition active:scale-95 shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">add_business</span>
               <span className="hidden xs:inline">{t.topBar.newGroupBtn}</span>
            </button>
          )}
        </div>

        {/* Dropdown with Real Multi-Tenant Groups + SaaS Actions */}
        {showBoxDropdown && (
          <div className="absolute left-4 right-4 top-12 bg-surface-card border border-border-strong rounded-xl shadow-2xl z-50 overflow-hidden py-1 divide-y divide-border-line animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 bg-surface-container-low flex items-center justify-between text-[11px] font-bold text-text-muted uppercase tracking-wider">
               <span>{str('Your savings groups', 'Ebibiina byo by’ensimbi')} ({availableGroups.length})</span>
              {!simpleMode && (
                <button
                  type="button"
                  onClick={() => {
                    setShowBoxDropdown(false);
                    onOpenGroupModal?.('directory');
                  }}
                  className="text-primary hover:underline lowercase font-medium"
                >
                   {t.topBar.manageAll}
                </button>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-border-line/60">
              {availableGroups.map((grp) => {
                const isCurrent = grp.id === currentGroupId;
                return (
                  <button
                    key={grp.id}
                    onClick={() => {
                      setShowBoxDropdown(false);
                      onSelectGroup?.(grp.id);
                    }}
                    className={`w-full text-left px-3 py-2.5 text-xs hover:bg-surface-container flex items-center justify-between transition ${
                      isCurrent ? 'bg-status-ok-bg/50 font-bold text-primary' : 'text-on-surface'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold truncate">{grp.name}</span>
                        <span className="text-[10px] px-1 py-0.2 bg-primary/10 text-primary rounded font-mono">
                          {grp.boxIdentifier}
                        </span>
                      </div>
                      <span className="text-[11px] text-text-muted truncate">
                         {grp.location} • {grp.membersCount} {str('members', 'abakiise')}
                      </span>
                    </div>
                    {isCurrent && (
                      <span className="material-symbols-outlined text-secondary text-sm shrink-0">check_circle</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* SaaS Actions at Bottom of Dropdown — hidden in Simple Mode */}
            {!simpleMode && (
              <div className="p-2 bg-surface-container-low flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setShowBoxDropdown(false);
                  onOpenGroupModal?.('register');
                }}
                className="w-full py-1.5 px-3 bg-primary text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-primary/90 transition active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                 {t.topBar.registerNewGroup}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBoxDropdown(false);
                  onOpenGroupModal?.('join');
                }}
                className="w-full py-1.5 px-3 bg-surface-card hover:bg-surface-container text-primary border border-border-strong rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">key</span>
                 {t.topBar.joinWithCode}
              </button>
              </div>
            )}
          </div>
        )}
        </>
          )}
      </div>
    </header>
  );
};


