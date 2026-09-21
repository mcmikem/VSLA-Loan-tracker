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
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'register' | 'join' | 'directory'>('join');
  const [signCode, setSignCode] = useState('');
  const [signGroup, setSignGroup] = useState<{ groupId: string; groupName: string; boxIdentifier: string } | null>(null);
  const [signAccounts, setSignAccounts] = useState<UserAccount[]>([]);
  const [signError, setSignError] = useState<string | null>(null);
  const [signBusy, setSignBusy] = useState(false);
  const lu = language === 'LU';

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
