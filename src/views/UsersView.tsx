import React, { useState } from 'react';
import { Member, ScreenId, UserAccount } from '../types';
import { findMemberPhoto } from '../utils/photo';
import { MemberAvatar } from '../components/MemberAvatar';

interface UsersViewProps {
  accounts: UserAccount[];
  currentUserId: string;
  authEnforced?: boolean;
  onSwitchAccount: (account: UserAccount) => void;
  onLogout?: () => void;
  onNavigate: (screen: ScreenId) => void;
  /** Member directory — shows face photos where accounts link via memberId. */
  directory?: Member[];
}

const ROLE_LABEL: Record<string, string> = {
  secretary: 'Secretary',
  treasurer: 'Treasurer',
  chairperson: 'Chairperson',
  keyholder: 'Keyholder',
  member: 'Member',
};

/** Users screen: roster of logins, roles + permissions, switch active account. */
export const UsersView: React.FC<UsersViewProps> = ({
  accounts,
  currentUserId,
  authEnforced,
  onSwitchAccount,
  onLogout,
  onNavigate,
  directory = [],
}) => {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const visible = q
    ? accounts.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.memberNo || '').toLowerCase().includes(q) ||
          (a.roleTitle || '').toLowerCase().includes(q) ||
          a.phone.replace(/[\s-]/g, '').includes(q.replace(/[\s-]/g, ''))
      )
    : accounts;

  const secretaries = accounts.filter((a) => a.role === 'secretary').length;
  const treasurers = accounts.filter((a) => a.role === 'treasurer').length;
  const members = accounts.filter((a) => a.role === 'member').length;

  return (
    <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-12 flex-1 space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate('home')}
          className="w-9 h-9 rounded-lg bg-surface-card border border-border-strong flex items-center justify-center text-primary"
          type="button"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
        </button>
        <div>
          <h1 className="font-bold text-primary">Users & Roles</h1>
          <p className="text-xs text-text-muted">
            {accounts.length} logins · {secretaries} secretary · {treasurers} treasurer · {members} members
          </p>
        </div>
      </div>

      <div className="relative">
        <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-[18px]">
          search
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, member no, phone…"
          className="w-full min-h-[42px] pl-9 pr-3 bg-surface-card border border-border-line rounded-lg text-sm"
        />
      </div>

      <div className="space-y-2">
        {visible.map((a) => {
          const isCurrent = a.id === currentUserId;
          const linked = a.memberId ? directory.find((m) => m.id === a.memberId) : undefined;
          const face = linked?.photoUrl || findMemberPhoto(directory, a.memberNo, a.name);
          return (
            <div
              key={a.id}
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${isCurrent ? 'bg-emerald-50 border-emerald-300' : 'bg-surface-card border-border-line'}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <MemberAvatar
                  name={a.name}
                  initials={a.avatarInitials}
                  photoUrl={face}
                  avatarBg={a.avatarBg}
                  sizeClass="w-10 h-10 text-sm"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-primary text-sm truncate">{a.name}</span>
                    <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border">
                      {ROLE_LABEL[a.role] || a.role}{a.memberNo ? ` · #${a.memberNo}` : ''}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold bg-secondary text-white px-1.5 py-0.5 rounded">CURRENT</span>
                    )}
                  </div>
                  <span className="text-[11px] text-text-muted block truncate">{a.roleTitle}</span>
                  <span className="text-[11px] text-text-muted font-mono block">{a.phone} · {a.provider}</span>
                  <span className="text-[10px] text-text-muted block">
                    {a.permissions.canApproveLoans ? '✓ approve' : '– approve'} ·{' '}
                    {a.permissions.canLockBox ? '✓ lock' : '– lock'} ·{' '}
                    {a.permissions.canDisburseWelfare ? '✓ welfare' : '– welfare'} ·{' '}
                    {a.permissions.canRecordShares ? '✓ shares' : '– shares'}
                  </span>
                </div>
              </div>
              {!isCurrent && (
                <button
                  type="button"
                  onClick={() => onSwitchAccount(a)}
                  className="shrink-0 px-3 py-2 bg-primary text-white rounded-lg text-xs font-bold active:scale-95"
                >
                  Switch
                </button>
              )}
            </div>
          );
        })}
        {visible.length === 0 && (
          <p className="text-xs text-text-muted bg-surface-card border border-border-line rounded-xl p-4 text-center">
            No users match “{query}”.
          </p>
        )}
      </div>

      <p className="text-[11px] text-text-muted">
        New members registered from the passbook appear here automatically with the member role and default PIN 1234.
      </p>

      {authEnforced && onLogout && (
        <button
          type="button"
          onClick={onLogout}
          className="w-full min-h-[48px] bg-white border-2 border-border-strong text-status-bad-tx rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <span className="material-symbols-outlined">logout</span>
          Sign out (lock this phone)
        </button>
      )}
    </main>
  );
};
