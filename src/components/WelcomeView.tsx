import React, { useState } from 'react';
import {
  CreateGroupPayload,
  GroupSummary,
  JoinGroupPayload,
  Language,
  UserAccount,
} from '../types';
import { GroupOnboardingModal } from './GroupOnboardingModal';
import { GroupLogo } from './GroupLogo';
import { LoginView } from '../views/LoginView';

interface WelcomeViewProps {
  language?: Language;
  onEnterPractice: () => void;
  onLogin: (account: UserAccount) => void;
  // Group onboarding passthrough (register / join / directory).
  availableGroups: GroupSummary[];
  currentGroupId: string;
  onSelectGroup: (groupId: string) => Promise<void>;
  onCreateGroup: (payload: CreateGroupPayload) => Promise<{ success: boolean; group?: GroupSummary; inviteCode?: string; error?: string; offline?: boolean }>;
  onJoinGroup: (payload: JoinGroupPayload) => Promise<{ success: boolean; groupName?: string; memberNo?: string; error?: string }>;
  logoUrl?: string;
  /** Interrupted setup recovery: a group already saved on this phone. */
  localGroup?: { groupId: string; groupName: string; inviteCode: string; pendingSync: boolean } | null;
  onResumeLocalGroup?: () => Promise<{ ok: boolean; error?: string }>;
}

/**
 * First screen for strangers in enforced mode: real paths (join with code,
 * register a group, sign in to your group). Seed/demo accounts appear ONLY
 * behind the clearly-labeled practice door — never as fake neighbours.
 */
export const WelcomeView: React.FC<WelcomeViewProps> = ({
  language = 'EN',
  onEnterPractice,
  onLogin,
  availableGroups,
  currentGroupId,
  onSelectGroup,
  onCreateGroup,
  onJoinGroup,
  logoUrl,
  localGroup = null,
  onResumeLocalGroup,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'register' | 'join' | 'directory'>('join');
  const [signCode, setSignCode] = useState('');
  const [signGroup, setSignGroup] = useState<{ groupId: string; groupName: string; boxIdentifier: string } | null>(null);
  const [signAccounts, setSignAccounts] = useState<UserAccount[]>([]);
  const [signError, setSignError] = useState<string | null>(null);
  const [signBusy, setSignBusy] = useState(false);
  const [recoverPhone, setRecoverPhone] = useState('');
  const [recoverBusy, setRecoverBusy] = useState(false);
  const [recoverError, setRecoverError] = useState<string | null>(null);
  const [recovered, setRecovered] = useState<{ name: string; inviteCode: string }[]>([]);
  const [recoverDone, setRecoverDone] = useState(false);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const lu = language === 'LU';

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const doResume = async () => {
    if (!onResumeLocalGroup || resumeBusy) return;
    setResumeBusy(true);
    setResumeError(null);
    const res = await onResumeLocalGroup();
    setResumeBusy(false);
    if (!res.ok) setResumeError(res.error || (lu ? 'Waliwo ekikyamu. Gezaako nate.' : 'Something went wrong. Try again.'));
  };

  const openModal = (tab: 'register' | 'join' | 'directory') => {
    setModalTab(tab);
    setModalOpen(true);
  };

  const resolveSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = signCode.trim();
    if (!code) return;
    setSignBusy(true);
    setSignError(null);
    try {
      const inv = await fetch(`/api/groups/${encodeURIComponent(code)}/invite`);
      const invData = await inv.json().catch(() => ({}));
      if (!inv.ok || !invData.groupId) {
        setSignError(lu ? 'Tewali kibiina na koodi eno. Buuza Omuwandiisi.' : `No savings group found for "${code}". Ask your secretary.`);
        return;
      }
      const acc = await fetch(`/api/accounts?groupId=${encodeURIComponent(invData.groupId)}`);
      const accData = await acc.json().catch(() => ({}));
      if (!acc.ok || !Array.isArray(accData.accounts) || accData.accounts.length === 0) {
        setSignError(lu ? 'Tewali akawunti. Omuwandiisi akuyingize.' : 'No logins yet — ask the secretary to register you.');
        return;
      }
      setSignGroup({ groupId: invData.groupId, groupName: invData.groupName, boxIdentifier: invData.boxIdentifier });
      setSignAccounts(accData.accounts);
    } catch {
      setSignError(lu ? 'Tewali yintaneeti. Gezaako nate.' : 'No connection. Try again.');
    } finally {
      setSignBusy(false);
    }
  };

  const doRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoverPhone.trim() || recoverBusy) return;
    setRecoverBusy(true);
    setRecoverError(null);
    setRecovered([]);
    setRecoverDone(false);
    try {
      const res = await fetch('/api/groups/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPhone: recoverPhone.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Lookup failed.');
      setRecovered(Array.isArray(data.groups) ? data.groups : []);
      setRecoverDone(true);
    } catch (err: any) {
      setRecoverError(err?.message || (lu ? 'Waliwo ekikyamu. Gezaako nate.' : 'Something went wrong. Try again.'));
    } finally {
      setRecoverBusy(false);
    }
  };

  const useRecoveredCode = (code: string) => {
    setSignCode(code);
    setRecovered([]);
    setRecoverDone(false);
  };

  if (signGroup) {
    return (
      <div className="min-h-screen bg-canvas-bg text-on-surface flex flex-col font-sans">
        <div className="max-w-lg mx-auto w-full px-4 pt-3">
          <button
            type="button"
            onClick={() => { setSignGroup(null); setSignAccounts([]); setSignCode(''); }}
            className="text-xs font-bold text-text-muted underline"
          >
            ← {lu ? 'Ddayo' : 'Back'}
          </button>
        </div>
        <LoginView
          accounts={signAccounts}
          groupName={signGroup.groupName}
          boxIdentifier={signGroup.boxIdentifier}
          groupId={signGroup.groupId}
          onLogin={onLogin}
          language={language}
        />
      </div>
    );
  }

  const bigBtn =
    'w-full min-h-[60px] flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-left active:scale-[0.99] transition shadow-sm';

  return (
    <div className="min-h-screen bg-canvas-bg text-on-surface flex flex-col font-sans">
      <main className="flex-1 w-full max-w-lg mx-auto px-4 pt-10 pb-8 space-y-4">
        <div className="text-center space-y-1">
          <div className="flex justify-center">
            <GroupLogo logoUrl={logoUrl} alt="VSLA UG" className="w-14 h-14 rounded-2xl shadow" />
          </div>
          <h1 className="font-bold text-primary text-xl">VSLA UG</h1>
          <p className="text-xs text-text-muted">
            {lu ? 'Ensimbi z’Abatuuze — yingira mu kibiina kyo ekiddu' : 'Real groups only — enter your own savings group'}
          </p>
        </div>

        <div className="space-y-3">
          {localGroup && (
            <section className="rounded-xl bg-[#DCFCE7] border-2 border-[#006d30] p-4 space-y-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#166534]">
                {lu ? 'Ekibiina kyo kiri ku ssimu eno' : 'Your group is on this phone'}
              </p>
              <p className="font-bold text-primary">{localGroup.groupName}</p>
              {localGroup.inviteCode ? (
                <button
                  type="button"
                  onClick={() => copyCode(localGroup.inviteCode)}
                  className="w-full flex items-center justify-between gap-2 bg-white rounded-lg border border-border-strong px-3 py-2.5 active:scale-[0.99]"
                  title={lu ? 'Nyiga okukoppa' : 'Tap to copy'}
                >
                  <span className="font-mono font-bold tracking-widest text-primary">{localGroup.inviteCode}</span>
                  <span className="text-[11px] font-bold text-secondary">{codeCopied ? '✓' : (lu ? 'Koppa' : 'Copy')}</span>
                </button>
              ) : null}
              {localGroup.pendingSync && (
                <p className="text-[11px] text-[#166534]">
                  {lu ? 'Tekinnaterekebwa ku mutimbagano — ekyo kikolebwa bw’oddamu okuyingira.' : 'Not synced yet — that happens when you continue.'}
                </p>
              )}
              <button
                type="button"
                onClick={doResume}
                disabled={resumeBusy}
                className="w-full min-h-[52px] bg-[#006d30] text-white rounded-lg font-bold text-sm disabled:opacity-60 active:scale-[0.99]"
              >
                {resumeBusy ? '…' : (lu ? 'Weeyongereyo okuteekateeka' : 'Continue setting up')}
              </button>
              {resumeError && <p className="text-[11px] font-bold text-status-bad-tx">{resumeError}</p>}
            </section>
          )}
          <button type="button" onClick={() => openModal('join')} className={`${bigBtn} bg-[#006d30] text-white`}>
            <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg shrink-0">1</span>
            <span>
              <span className="block">{lu ? 'Yegatte ku kibiina' : 'Join my group'}</span>
              <span className="block text-xs font-normal opacity-80">{lu ? 'Kozesa koodi ya kibiina' : 'Use your group invite code'}</span>
            </span>
          </button>
          <button type="button" onClick={() => openModal('register')} className={`${bigBtn} bg-surface-card border-2 border-border-strong text-primary`}>
            <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">2</span>
            <span>
              <span className="block">{lu ? 'Kola ekibiina ekipya' : 'Register a new group'}</span>
              <span className="block text-xs font-normal text-text-muted">{lu ? 'Omuwandiisi w’ekibiina' : 'For the group secretary'}</span>
            </span>
          </button>
        </div>

        <section className="bg-surface-card border border-border-line rounded-xl p-4 space-y-2">
          <h2 className="font-bold text-sm text-primary">{lu ? 'Yingira (olina akawunti)' : 'Sign in (you have a login)'}</h2>
          <form onSubmit={resolveSignIn} className="flex gap-2">
            <input
              value={signCode}
              onChange={(e) => setSignCode(e.target.value.toUpperCase())}
              placeholder={lu ? 'Koodi y’ekibiina (e.g. BAK-4290)' : 'Group code (e.g. BAK-4290)'}
              className="flex-1 min-h-[48px] border border-border-strong rounded-lg px-3 text-sm font-mono font-bold uppercase bg-white"
            />
            <button
              type="submit"
              disabled={signBusy || !signCode.trim()}
              className="px-4 min-h-[48px] bg-primary-container text-white rounded-lg font-bold text-sm disabled:opacity-50 active:scale-95"
            >
              {signBusy ? '…' : lu ? 'Yingira' : 'Go'}
            </button>
          </form>
          {signError && <p className="text-[11px] font-bold text-status-bad-tx">{signError}</p>}
          <p className="text-[11px] text-text-muted">
            {lu ? 'Eri ku lupapula lwo olw’okuyita oba buuza Omuwandiisi.' : 'On your invitation slip — or ask the secretary.'}
          </p>
          <form onSubmit={doRecover} className="pt-1 border-t border-border-line space-y-2">
            <p className="text-[11px] font-bold text-primary pt-1">
              {lu ? 'Wabula koodi? Yingiza namba yo eya ssimu.' : 'Lost your code? Enter your phone number.'}
            </p>
            <div className="flex gap-2">
              <input
                value={recoverPhone}
                onChange={(e) => setRecoverPhone(e.target.value)}
                inputMode="tel"
                placeholder="07XX XXX XXX"
                className="flex-1 min-h-[48px] border border-border-strong rounded-lg px-3 text-sm font-mono bg-white"
              />
              <button
                type="submit"
                disabled={recoverBusy || !recoverPhone.trim()}
                className="px-4 min-h-[48px] bg-surface-container border border-border-strong text-primary rounded-lg font-bold text-sm disabled:opacity-50 active:scale-95"
              >
                {recoverBusy ? '…' : lu ? 'Noonya' : 'Find'}
              </button>
            </div>
            {recoverError && <p className="text-[11px] font-bold text-status-bad-tx">{recoverError}</p>}
            {recoverDone && recovered.length === 0 && (
              <p className="text-[11px] text-text-muted">
                {lu ? 'Tewali kibiina na namba eno.' : 'No group registered with this number.'}
              </p>
            )}
            {recovered.map((g) => (
              <button
                key={g.inviteCode}
                type="button"
                onClick={() => useRecoveredCode(g.inviteCode)}
                className="w-full flex items-center justify-between gap-2 bg-canvas-bg border border-border-strong rounded-lg px-3 py-2.5 active:scale-[0.99] text-left"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-primary truncate">{g.name}</span>
                  <span className="block font-mono font-bold text-secondary">{g.inviteCode}</span>
                </span>
                <span className="text-[11px] font-bold text-secondary underline shrink-0">
                  {lu ? 'Kozesa →' : 'Use →'}
                </span>
              </button>
            ))}
          </form>
        </section>

        <button
          type="button"
          onClick={onEnterPractice}
          className="w-full py-3 border-2 border-dashed border-border-strong rounded-xl text-xs font-bold text-text-muted active:scale-[0.99]"
        >
          {lu ? 'Gezaako demo — ssente za kuzannya, si za ddala' : 'Try the demo — play money, not real'}
        </button>
      </main>

      <GroupOnboardingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        availableGroups={availableGroups}
        currentGroupId={currentGroupId}
        onSelectGroup={onSelectGroup}
        onCreateGroup={onCreateGroup}
        onJoinGroup={onJoinGroup}
        defaultTab={modalTab}
        hideDirectory
      />
    </div>
  );
};
