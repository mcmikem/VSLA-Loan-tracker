import React, { useState } from 'react';
import { GroupSummary, Language, UserAccount } from '../types';
import { LANGUAGE_OPTIONS, getTranslations } from '../i18n/translations';
import { GroupLogo } from './GroupLogo';

interface TopAppBarProps {
  language: Language;
  onToggleLanguage: () => void;
  onSelectLanguage?: (lang: Language) => void;
  pendingApprovalsCount: number;
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
  /** Simple Mode: hide multi-group SaaS actions. Default ON. */
  simpleMode?: boolean;
  /** Group's own logo (Settings) — replaces the VSLA mark. */
  logoUrl?: string;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  language,
  onToggleLanguage,
  onSelectLanguage,
  pendingApprovalsCount,
  currentUser,
  onOpenAccountModal,
  onOpenNotifications,
  onOpenBackup,
  selectedBox = 'Bakwata Box 01 • Weekly Friday Cycle',
  roleSubtitle,
  isOnline = true,
  availableGroups = [],
  currentGroupId = 'bakwata-01',
  onSelectGroup,
  onOpenGroupModal,
  onOpenShareInvite,
  simpleMode = true,
  logoUrl,
}) => {
  const [showBoxDropdown, setShowBoxDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);

  const t = getTranslations(language);
  const currentLangObj = LANGUAGE_OPTIONS.find((l) => l.code === language) || LANGUAGE_OPTIONS[0];

  const activeGroup = availableGroups.find((g) => g.id === currentGroupId);
  const displayGroupName = activeGroup?.name || selectedBox.split('•')[0].trim();
  const displayBoxId = activeGroup?.boxIdentifier || selectedBox.split('•')[1]?.trim() || 'BOX-KLA-042';

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
              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-secondary/15 text-secondary rounded uppercase tracking-wider">
                SaaS
              </span>
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

        {/* Trailing Actions: Active Account Avatar, Share Code, Language Switcher, Sync */}
        <div className="flex items-center gap-1 shrink-0">
          {simpleMode ? (
            <>
              {/* Profile keeps its room: avatar + name */}
              <button
                type="button"
                onClick={onOpenAccountModal}
                title={`Logged in as ${currentUser?.name || 'Grace Akello'} (${currentUser?.roleTitle || 'Executive'}). Click to switch account.`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container hover:bg-surface-container-high rounded-full border border-border-strong text-primary transition active:scale-95 cursor-pointer shadow-xs"
              >
                <div
                  className={`w-6 h-6 rounded-full ${currentUser?.avatarBg || 'bg-emerald-700'} text-white flex items-center justify-center font-bold text-[10px]`}
                >
                  {currentUser?.avatarInitials || 'GA'}
                </div>
                <span className="font-bold text-xs max-w-[90px] truncate">
                  {currentUser?.name.split(' ')[0] || t.topBar.activeAccount}
                </span>
                <span className="material-symbols-outlined text-[14px] text-text-muted">
                  arrow_drop_down
                </span>
              </button>
              {/* One overflow for utilities: Invite, Backup, Language, Notifications */}
              <div className="relative">
                <button
                  aria-label="More actions"
                  onClick={() => setShowOverflow(!showOverflow)}
                  className="min-h-[38px] min-w-[38px] flex items-center justify-center text-primary hover:bg-surface-container rounded-lg transition-colors active:scale-95"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[22px]">more_vert</span>
                  {pendingApprovalsCount > 0 && (
                    <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-0.5 rounded-full bg-status-warn-bg text-status-warn-tx font-bold text-[10px] border border-[#FDE68A]">
                      {pendingApprovalsCount}
                    </span>
                  )}
                </button>
                {showOverflow && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowOverflow(false)} />
                    <div className="absolute right-0 top-full mt-1 w-56 bg-surface-card rounded-xl shadow-2xl border border-border-strong p-1.5 z-50 space-y-0.5">
                      {onOpenShareInvite && (
                        <button
                          type="button"
                          onClick={() => { setShowOverflow(false); onOpenShareInvite(); }}
                          className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-surface-container text-left active:scale-[0.99]"
                        >
                          <span className="material-symbols-outlined text-[20px] text-secondary">share</span>
                          <span className="text-xs font-bold text-primary">{t.topBar.inviteBtn}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => { setShowOverflow(false); onOpenBackup?.(); }}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-surface-container text-left active:scale-[0.99]"
                      >
                        <span className="material-symbols-outlined text-[20px] text-primary">cloud_sync</span>
                        <span className="text-xs font-bold text-primary flex-1">{t.home.backupAudit}</span>
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-secondary' : 'bg-status-warn-tx'}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowOverflow(false);
                          const other = language === 'LU' ? 'EN' : 'LU';
                          if (onSelectLanguage) onSelectLanguage(other as typeof language);
                          else onToggleLanguage();
                        }}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-surface-container text-left active:scale-[0.99]"
                      >
                        <span className="text-[18px]">{currentLangObj.flag}</span>
                        <span className="text-xs font-bold text-primary flex-1">{currentLangObj.nativeLabel}</span>
                        <span className="text-[10px] font-bold text-text-muted">{language === 'LU' ? 'EN' : 'LU'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowOverflow(false); onOpenNotifications?.(); }}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-surface-container text-left active:scale-[0.99]"
                      >
                        <span className="material-symbols-outlined text-[20px] text-primary">notifications</span>
                        <span className="text-xs font-bold text-primary flex-1">{t.home.reviewQueue.replace(' →', '')}</span>
                        {pendingApprovalsCount > 0 && (
                          <span className="min-w-4 h-4 px-1 rounded-full bg-status-warn-bg text-status-warn-tx font-bold text-[10px] border border-[#FDE68A]">
                            {pendingApprovalsCount}
                          </span>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
          <>
          {/* Invite Kit Trigger */}
          {onOpenShareInvite && (
            <button
              type="button"
              onClick={onOpenShareInvite}
              title="Share Group Invite Code & Link"
              className="min-h-[36px] px-2 flex items-center gap-1 text-primary hover:bg-surface-container rounded-lg transition-colors active:scale-95 duration-150 text-xs font-bold border border-border-strong bg-surface-card"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">share</span>
              <span className="hidden xs:inline">{t.topBar.inviteBtn}</span>
            </button>
          )}

          {/* Active Account Switcher Pill */}
          <button
            type="button"
            onClick={onOpenAccountModal}
            title={`Logged in as ${currentUser?.name || 'Grace Akello'} (${currentUser?.roleTitle || 'Executive'}). Click to switch account.`}
            className="flex items-center gap-1 px-2 py-1 bg-surface-container hover:bg-surface-container-high rounded-full border border-border-strong text-primary transition active:scale-95 cursor-pointer shadow-xs mr-0.5"
          >
            <div
              className={`w-5 h-5 rounded-full ${currentUser?.avatarBg || 'bg-emerald-700'} text-white flex items-center justify-center font-bold text-[9px]`}
            >
              {currentUser?.avatarInitials || 'GA'}
            </div>
            <span className="font-bold text-[11px] max-w-[70px] truncate hidden sm:inline">
              {currentUser?.name.split(' ')[0] || t.topBar.activeAccount}
            </span>
            <span className="material-symbols-outlined text-[14px] text-text-muted">
              arrow_drop_down
            </span>
          </button>

          <button
            aria-label="Backup and offline sync"
            onClick={onOpenBackup}
            title="Backup & Audit Center (Offline & Cloud Sync)"
            className="min-h-[38px] min-w-[38px] flex items-center justify-center text-primary hover:bg-surface-container rounded-lg transition-colors active:scale-95 duration-150 relative"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">cloud_sync</span>
            <span className={`absolute top-2 right-1.5 w-2 h-2 rounded-full ${isOnline ? 'bg-secondary animate-pulse' : 'bg-status-warn-tx'}`} />
          </button>

          {/* Enhanced Multi-Language Selector Dropdown */}
          <div className="relative">
            <button
              aria-label="Language selection"
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className="min-h-[36px] px-2 flex items-center gap-1 text-label-md font-label-md font-bold text-primary hover:bg-surface-container rounded-lg transition-colors active:scale-95 duration-150 text-xs border border-border-strong bg-surface-card"
              type="button"
              title={t.topBar.languageSelect}
            >
              <span className="text-[13px]">{currentLangObj.flag}</span>
              <span className="font-bold text-[11px]">{currentLangObj.code}</span>
              <span className="material-symbols-outlined text-[14px] text-text-muted">arrow_drop_down</span>
            </button>

            {showLanguageDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowLanguageDropdown(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-52 bg-surface-card rounded-xl shadow-2xl border border-border-strong p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border-line mb-1">
                    {t.topBar.languageSelect}
                  </div>
                  {LANGUAGE_OPTIONS.map((opt) => {
                    const isSelected = opt.code === language;
                    return (
                      <button
                        key={opt.code}
                        type="button"
                        onClick={() => {
                          if (onSelectLanguage) {
                            onSelectLanguage(opt.code);
                          } else {
                            onToggleLanguage();
                          }
                          setShowLanguageDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition ${
                          isSelected
                            ? 'bg-primary text-white font-bold'
                            : 'hover:bg-surface-container text-on-surface'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{opt.flag}</span>
                          <div>
                            <span className="text-xs font-bold block">{opt.nativeLabel}</span>
                            <span className={`text-[10px] block ${isSelected ? 'text-white/80' : 'text-text-muted'}`}>
                              {opt.label}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="material-symbols-outlined text-[16px] text-white">check</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <button
            aria-label="Notifications"
            onClick={onOpenNotifications}
            className="relative min-h-[38px] min-w-[38px] flex items-center justify-center text-primary hover:bg-surface-container rounded-lg transition-colors active:scale-95 duration-150"
            type="button"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {pendingApprovalsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex items-center justify-center w-4 h-4 bg-error text-white font-label-sm text-[9px] font-bold rounded-full">
                {pendingApprovalsCount}
              </span>
            )}
          </button>
          </>
          )}
        </div>
      </div>

      {/* Row 2: Multi-Tenant Group Selector + Register Quick Action */}
      <div className="px-4 pb-2.5 pt-0.5 max-w-lg mx-auto relative">
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
              title="Register a brand new savings group on SaaS"
              className="px-2.5 py-1.5 bg-secondary text-white hover:brightness-105 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition active:scale-95 shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">add_business</span>
              <span className="hidden xs:inline">+ New Group</span>
            </button>
          )}
        </div>

        {/* Dropdown with Real Multi-Tenant Groups + SaaS Actions */}
        {showBoxDropdown && (
          <div className="absolute left-4 right-4 top-12 bg-surface-card border border-border-strong rounded-xl shadow-2xl z-50 overflow-hidden py-1 divide-y divide-border-line animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 bg-surface-container-low flex items-center justify-between text-[11px] font-bold text-text-muted uppercase tracking-wider">
              <span>Your Savings Groups ({availableGroups.length})</span>
              {!simpleMode && (
                <button
                  type="button"
                  onClick={() => {
                    setShowBoxDropdown(false);
                    onOpenGroupModal?.('directory');
                  }}
                  className="text-primary hover:underline lowercase font-medium"
                >
                  manage all
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
                        {grp.location} • {grp.membersCount} members
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
                Register New Savings Group
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
                Join with Invite Code
              </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};


