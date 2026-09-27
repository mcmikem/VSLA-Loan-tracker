import React, { useState } from 'react';
import { Language, Member, OfficerChangeRecord, PendingOfficerChange, ScreenId, UserAccount } from '../types';
import { findMemberPhoto } from '../utils/photo';
import { MemberAvatar } from '../components/MemberAvatar';
import { ApprovalsKeyModal } from '../components/ApprovalsKeyModal';
import { KeyStepper } from '../components/KeyStepper';
import {
  EMPTY_OFFICER,
  NewOfficerDraft,
  OFFICER_CHANGE_LABEL,
  OFFICER_ROLES,
  OfficerChangeRequest,
  describeOfficerChangeKeys,
  approverCount,
  canManageOfficers,
  checkOfficerChange,
} from '../utils/officers';

interface UsersViewProps {
  accounts: UserAccount[];
  currentUserId: string;
  authEnforced?: boolean;
  onSwitchAccount: (account: UserAccount) => void;
  onLogout?: () => void;
  onNavigate: (screen: ScreenId) => void;
  /** Member directory — shows face photos where accounts link via memberId. */
  directory?: Member[];
  language?: Language;
  /** The signed-in account — only officers may change the roster. */
  currentUser?: UserAccount;
  /** Turns key 1. Returns an error message, or null. */
  onOfficerKey?: (request: OfficerChangeRequest, key: { officerId: string; pin: string }) => string | null;
  /** An authority change waiting for its second key. */
  pending?: PendingOfficerChange;
  /** Turns key 2. Returns an error message, or null. */
  onPendingOfficerKey?: (key: { officerId: string; pin: string }) => string | null;
  /** Every completed authority change, newest last. */
  changeLog?: OfficerChangeRecord[];
}

const ROLE_LABEL: Record<string, string> = {
  secretary: 'Secretary',
  treasurer: 'Treasurer',
  chairperson: 'Chairperson',
  keyholder: 'Keyholder',
  member: 'Member',
};

const ROLE_LABEL_LU: Record<string, string> = {
  secretary: 'Munaasiki',
  treasurer: 'Mufunye nsimbi',
  chairperson: 'Mukiizi w’ekibiina',
  keyholder: 'Omukwasi w’ebisumuluzo',
  member: 'Omukiise',
};

const ROLE_TITLE_LU: Record<string, string> = {
  'General Secretary & Box Teller': 'Munaasiki Mukulu & Omuwandiisi wa Kasanduuko',
  'Keyholder 1 (Padlock Key A)': 'Omukwasi 1 (Ebisumuluzo By’ekifulu A)',
  'Group Treasurer & Keyholder 2 (Key B)': 'Mufunye nsimbi w’ekibiina & Omukwasi 2 (Ebisumuluzo B)',
  'Keyholder 3 (Padlock Key C)': 'Omukwasi 3 (Ebisumuluzo By’ekifulu C)',
  'Active Member (Bodaboda Stage)': 'Omukiise Ayakola (Bodaboda Stage)',
  'Active Member (Market Tailor)': 'Omukiise Ayakola (Munyodo ku Market)',
  'Active Member (Produce Cashier)': 'Omukiise Ayakola (Muwandiisi wa Bibuuziba)',
  'Practice Secretary': 'Munaasiki w’Okukebera',
};


/** Says why a change cannot be recorded, and starts the ceremony when it can. */
const AuthorityCheck: React.FC<{
  request: OfficerChangeRequest;
  onConfirm: (r: OfficerChangeRequest) => void;
  language?: Language;
}> = ({ request, onConfirm, language = 'EN' }) => {
  const str = (en: string, lu: string) => (language === 'LU' ? lu : en);
  const check = checkOfficerChange(request);
  if (!check.ok) {
    return (
      <ul className="text-[11px] text-status-bad-tx bg-status-bad-bg rounded-lg p-2.5 space-y-0.5">
        {check.problems.map((problem) => (
          <li key={problem}>· {problem}</li>
        ))}
      </ul>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onConfirm(request)}
      className="w-full min-h-[48px] rounded-lg bg-primary-container text-white font-bold text-xs flex items-center justify-center gap-1.5"
    >
      <span className="material-symbols-outlined text-base">key</span>
      {`Two keys to ${check.summary.toLowerCase()}`}
    </button>
  );
};

/** True when the editor is really changing what the officer may do, not just the PIN. */
function roleOrPermissionsChanged(target: UserAccount | undefined, draft: NewOfficerDraft): boolean {
  if (!target) return true;
  return (
    draft.role !== target.role ||
    draft.canApproveLoans !== target.permissions.canApproveLoans ||
    draft.canLockBox !== target.permissions.canLockBox ||
    draft.canRecordShares !== target.permissions.canRecordShares ||
    draft.canDisburseWelfare !== target.permissions.canDisburseWelfare ||
    draft.canManageBackups !== target.permissions.canManageBackups
  );
}

/** Role, permissions, phone and PIN for an officer already on the roster. */
const AuthorityEditor: React.FC<{
  accounts: UserAccount[];
  currentUser: UserAccount;
  officerId: string;
  draft: NewOfficerDraft;
  setDraft: (d: NewOfficerDraft) => void;
  onCancel: () => void;
  onConfirm: (r: OfficerChangeRequest) => void;
  language?: Language;
}> = ({ accounts, currentUser, officerId, draft, setDraft, onCancel, onConfirm, language = 'EN' }) => {
  const str = (en: string, lu: string) => (language === 'LU' ? lu : en);
  const target = accounts.find((a) => a.id === officerId);
  return (
    <div className="space-y-2 border border-border-line rounded-lg p-3 bg-canvas-bg">
      <p className="text-xs font-bold text-primary">
        {target?.name}
        <span className="block text-[10px] font-normal text-text-muted">{str('Changing another officer — never yourself', 'Kyendereza omukozesa omulala — siwaako wekka')}</span>
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">{str('Role', 'Obunannyiriro')}</label>
          <select
            value={draft.role}
            onChange={(e) => setDraft({ ...draft, role: e.target.value as NewOfficerDraft['role'] })}
            className="w-full min-h-[44px] px-2 rounded-lg border border-border-strong bg-white text-sm"
          >
            {OFFICER_ROLES.map((role) => (
              <option key={role.id} value={role.id}>{role.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">{str('Phone', 'Essimu')}</label>
          <input
            inputMode="tel"
            value={draft.phone}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            className="w-full min-h-[44px] px-2 rounded-lg border border-border-strong bg-white text-sm"
          />
        </div>
      </div>
      <div>
        <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">{str('New PIN (leave empty to keep)', 'PIN mpyya (sikiba kikulu nga tekisanyisa)')}</label>
        <input
          type="password"
          inputMode="numeric"
          value={draft.pin}
          onChange={(e) => setDraft({ ...draft, pin: e.target.value.replace(/\D/g, '').slice(0, 8) })}
          className="w-full min-h-[44px] px-2 rounded-lg border border-border-strong bg-white font-mono"
        />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {([
          ['canApproveLoans', 'Can approve payments'],
          ['canLockBox', 'Holds the box key'],
          ['canRecordShares', 'Can record shares'],
          ['canDisburseWelfare', 'Can pay welfare'],
          ['canManageBackups', 'Can back up'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setDraft({ ...draft, [key]: !draft[key] })}
            className={`p-2 rounded-lg border text-left ${draft[key] ? 'bg-primary-container text-white border-primary-container' : 'bg-white border-border-line'}`}
          >
            <span className="text-[11px] font-bold">{label}</span>
          </button>
        ))}
      </div>
      {draft.pin === '1234' && (
        <p className="text-[11px] text-status-bad-tx bg-status-bad-bg rounded-lg p-2 font-bold">
          {str('PIN 1234 is the default — choose a different one.', 'PIN 1234 ye eyanjudde — kawuka olunnakidde.')}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 min-h-[48px] rounded-lg border border-border-line bg-white font-bold text-xs"
        >
          {str('Cancel', 'Sazaamu')}
        </button>
      </div>
      <AuthorityCheck
        request={{
          kind: roleOrPermissionsChanged(target, draft) ? 'permissions' : draft.pin ? 'pin' : 'permissions',
          actor: currentUser,
          accounts,
          targetId: officerId,
          draft,
        }}
        onConfirm={onConfirm}
      />
    </div>
  );
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
  language = 'EN',
  currentUser,
  onOfficerKey,
  pending,
  onPendingOfficerKey,
  changeLog = [],
}) => {
  const [query, setQuery] = useState('');
  // Authority changes: a draft to describe, then the same two keys as a payout.
  const [keyRequest, setKeyRequest] = useState<OfficerChangeRequest | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [secondKeyOpen, setSecondKeyOpen] = useState(false);
  const startEdit = (account: UserAccount) => {
    setEditingId(account.id);
    setNotice(null);
    setKeyError(null);
    setDraft({
      ...EMPTY_OFFICER,
      name: account.name,
      phone: account.phone,
      role: account.role === 'member' ? 'keyholder' : account.role,
      roleTitle: account.roleTitle,
      provider: account.provider,
      pin: '',
      canLockBox: account.permissions.canLockBox,
      canApproveLoans: account.permissions.canApproveLoans,
      canRecordShares: account.permissions.canRecordShares,
      canDisburseWelfare: account.permissions.canDisburseWelfare,
      canManageBackups: account.permissions.canManageBackups,
    });
  };
  const [draft, setDraft] = useState<NewOfficerDraft>(EMPTY_OFFICER);
  const manage = canManageOfficers(currentUser);
  const inputCls =
    'w-full min-h-[44px] px-2.5 rounded-lg border border-border-strong bg-white text-sm text-[#111827] focus:border-secondary focus:outline-none';
  const str = (en: string, lu: string) => (language === 'LU' ? lu : en);
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
          aria-label={str('Go back', 'Ddayo')}
        >
          <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_back</span>
        </button>
        <div>
          <h1 className="font-bold text-primary">{str('Users & Roles', 'Abakozesa n’Abakulembeza')}</h1>
          <p className="text-xs text-text-muted">
            {language === 'LU'
              ? `${accounts.length} abakozesa · ${secretaries} munaasiki · ${treasurers} mufunye nsimbi · ${members} bakiise`
              : `${accounts.length} logins · ${secretaries} secretary · ${treasurers} treasurer · ${members} members`}
          </p>
        </div>
      </div>

      <div className="relative">
        <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-[18px]" aria-hidden="true">
          search
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={str('Search name, member no, phone…', 'Sooka erinnya, namba y’omukiise, essimu…')}
          aria-label={str('Search users', 'Sooka mu bakozesa')}
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
                      {(language === 'LU' ? ROLE_LABEL_LU[a.role] : ROLE_LABEL[a.role]) || a.role}{a.memberNo ? ` · #${a.memberNo}` : ''}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold bg-secondary text-white px-1.5 py-0.5 rounded">{str('CURRENT', 'KIKOLO')}</span>
                    )}
                  </div>
                  <span className="text-[11px] text-text-muted block truncate">
                    {language === 'LU' ? ROLE_TITLE_LU[a.roleTitle] || a.roleTitle : a.roleTitle}
                  </span>
                  <span className="text-[11px] text-text-muted font-mono block">{a.phone} · {a.provider}</span>
                  <span className="text-[10px] text-text-muted block">
                    {a.permissions.canApproveLoans
                      ? `✓ ${str('approve', 'kukyikiza')}`
                      : `– ${str('approve', 'kukyikiza')}`} ·{' '}
                    {a.permissions.canLockBox
                      ? `✓ ${str('lock', 'kufumba')}`
                      : `– ${str('lock', 'kufumba')}`} ·{' '}
                    {a.permissions.canDisburseWelfare
                      ? `✓ ${str('welfare', 'obuyambi')}`
                      : `– ${str('welfare', 'obuyambi')}`} ·{' '}
                    {a.permissions.canRecordShares
                      ? `✓ ${str('shares', 'emigabo')}`
                      : `– ${str('shares', 'emigabo')}`}
                  </span>
                </div>
              </div>
              {!isCurrent && (
                <button
                  type="button"
                  onClick={() => onSwitchAccount(a)}
                  className="shrink-0 px-3 py-2 bg-primary text-white rounded-lg text-xs font-bold active:scale-95"
                >
                  {str('Switch', 'Kyusa')}
                </button>
              )}
            </div>
          );
        })}
        {visible.length === 0 && (
          <p className="text-xs text-text-muted bg-surface-card border border-border-line rounded-xl p-4 text-center">
            {language === 'LU' ? `Tewali mukozesa alagana na “${query}”.` : `No users match “${query}”.`}
          </p>
        )}
      </div>

      <p className="text-[11px] text-text-muted">
        {str(
          'New members registered from the passbook appear here automatically with a private member PIN.',
          'Abakiise bakaŋŋulwa mu ppaasibuku bayooleka buli lwo here n’ekikomo eky’omukiise ekisisirizwa (PIN).'
        )}
      </p>

      {/* Who may move money — adding or changing an officer is a two-key
          decision, because whoever can add a keyholder can turn both keys. */}
      {manage && onOfficerKey && (
        <section className="bg-surface-card border border-border-line rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
              {str('Officers and authority', 'Abakozesa n’obuwale')}
            </h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${approverCount(accounts) >= 2 ? 'bg-status-ok-bg text-status-ok-tx' : 'bg-status-warn-bg text-status-warn-tx'}`}>
              {approverCount(accounts)} {str('can approve', 'bafuna okukkiriza')}
            </span>
          </div>

          {approverCount(accounts) < 2 && (
            <p className="text-[11px] text-status-warn-tx bg-status-warn-bg rounded-lg p-2.5 font-bold">
              {str(
                'Fewer than two officers can approve payments, so the two-key rule cannot run. Add a second keyholder below.',
                'Abakozesa b’okukkiriza abali basinga ba na biri, nga kino bisumuluzo bibiri tebikiwa. Yongera omukwasi omulala wansi wona.'
              )}
            </p>
          )}

          {!editingId ? (
            <>
              <div className="space-y-2">
                {accounts.filter((a) => a.role !== 'member').map((a) => {
                  const self = currentUser && a.id === currentUser.id;
                  return (
                    <div key={a.id} className="p-2.5 bg-canvas-bg rounded-lg border border-border-line space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-primary block truncate">{a.name}</span>
                          <span className="text-[10px] text-text-muted">
                            {language === 'LU' ? ROLE_LABEL_LU[a.role] : ROLE_LABEL[a.role]}{self ? ` · ${str('you', 'wowe')}` : ''}
                          </span>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={self}
                            onClick={() => startEdit(a)}
                            className="min-h-[40px] px-2.5 rounded-lg bg-surface-container border border-border-line text-primary text-[11px] font-bold disabled:opacity-40"
                          >
                            {str('Change', 'Gikyendereza')}
                          </button>
                          <button
                            type="button"
                            disabled={self}
                            onClick={() => setKeyRequest({ kind: 'remove', actor: currentUser as UserAccount, accounts, targetId: a.id })}
                            className="min-h-[40px] px-2.5 rounded-lg bg-surface-container border border-border-line text-status-bad-tx text-[11px] font-bold disabled:opacity-40"
                          >
                            {str('Remove', 'Gana')}
                          </button>
                        </div>
                      </div>
                      {(!a.phone || a.pin === '1234' || String(a.pin).startsWith('hash:')) && (
                        <button
                          type="button"
                          onClick={() => startEdit(a)}
                          className="w-full min-h-[40px] rounded-lg border border-status-warn-tx/40 bg-status-warn-bg text-status-warn-tx text-[11px] font-bold"
                        >
                          {str('Set a real phone number and PIN', 'Teekatezza essimu n’ PIN ez’omwangwa')}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <details className="rounded-lg border border-border-line bg-canvas-bg p-3">
                <summary className="min-h-[44px] flex items-center gap-2 font-bold text-xs text-primary cursor-pointer">
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  {str('Add an officer', 'Yongera omukozesa')}
                </summary>
                <div className="space-y-2 mt-2">
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">{str('Full name', 'Erinnya liggwanja')}</label>
                    <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">{str('Phone', 'Essimu')}</label>
                      <input inputMode="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="0772 000 000" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">{str('New PIN (4–8 digits)', 'PIN empya (4–8 digits)')}</label>
                      <input type="password" inputMode="numeric" value={draft.pin} onChange={(e) => setDraft({ ...draft, pin: e.target.value.replace(/\D/g, '').slice(0, 8) })} className={`${inputCls} font-mono`} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">{str('Role', 'Obunannyiriro')}</label>
                      <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as NewOfficerDraft['role'] })} className={`${inputCls} bg-white`}>
                        {OFFICER_ROLES.map((role) => (
                          <option key={role.id} value={role.id}>{language === 'LU' ? role.labelLu : role.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">{str('Network', 'Ettwala')}</label>
                      <select value={draft.provider} onChange={(e) => setDraft({ ...draft, provider: e.target.value as 'MTN' | 'Airtel' })} className={`${inputCls} bg-white`}>
                        <option value="MTN">MTN</option>
                        <option value="Airtel">Airtel</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([
                      ['canApproveLoans', str('Can approve payments', 'Asubiriza okukkiriza ssente')],
                      ['canLockBox', str('Holds the box key', 'Alina kikwata kya ssanduku')],
                      ['canRecordShares', str('Can record shares', 'Asubiriza okuwandiika emigabo')],
                      ['canDisburseWelfare', str('Can pay welfare', 'Asubiriza obuyambi')],
                      ['canManageBackups', str('Can back up', 'Asubiriza okutereka endandikwa')],
                    ] as const).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setDraft({ ...draft, [key]: !draft[key] })}
                        className={`p-2 rounded-lg border text-left ${draft[key] ? 'bg-primary-container text-white border-primary-container' : 'bg-white border-border-line'}`}
                      >
                        <span className="text-[11px] font-bold">{label}</span>
                      </button>
                    ))}
                  </div>
                  <AuthorityCheck
                    language={language}
                    request={{ kind: 'add', actor: currentUser as UserAccount, accounts, draft }}
                    onConfirm={(request) => setKeyRequest(request)}
                  />
                </div>
              </details>
            </>
          ) : (
            <AuthorityEditor
              language={language}
              accounts={accounts}
              currentUser={currentUser as UserAccount}
              officerId={editingId}
              draft={draft}
              setDraft={setDraft}
              onCancel={() => setEditingId(null)}
              onConfirm={(request) => setKeyRequest(request)}
            />
          )}

          {pending && (
            <div className="rounded-lg border-2 border-status-warn-tx/40 bg-status-warn-bg p-3 space-y-2">
              <p className="text-[11px] font-bold text-status-warn-tx">
                {str('Waiting for a second key', 'Lindiriza kisumuluzo 2/2')}
              </p>
              <p className="text-xs font-bold text-primary">{pending.summary}</p>
              <p className="text-[11px] text-text-muted">
                {str(`${pending.firstKeyBy} turned key 1/2. Nothing has changed yet.`, `${pending.firstKeyBy} yafula kisumuluzo 1/2. Tewali kintu kikakyukidde.`)}
              </p>
              {onPendingOfficerKey && (
                <button
                  type="button"
                  onClick={() => setSecondKeyOpen(true)}
                  className="w-full min-h-[48px] rounded-lg bg-primary-container text-white font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">key</span>
                  {str('Turn key 2/2 to apply it', 'Yoola kisumuluzo 2/2 okukikola')}
                </button>
              )}
            </div>
          )}

          {changeLog.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-text-muted uppercase">
                {str('Authority register', 'Kiseera ky’obuwale')}
              </p>
              {changeLog.slice(-5).reverse().map((change) => (
                <div key={change.id} className="text-[11px] border-b border-border-line pb-1.5">
                  <span className="font-bold text-primary">{change.summary}</span>
                  <span className="block font-mono text-[10px] text-text-muted">
                    {change.at.slice(0, 10)} · {describeOfficerChangeKeys(change)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {notice && <p className="text-[11px] text-status-ok-tx bg-status-ok-bg rounded-lg p-2.5 font-bold">{notice}</p>}
          {keyError && !keyRequest && <p className="text-[11px] text-status-bad-tx bg-status-bad-bg rounded-lg p-2.5 font-bold">{keyError}</p>}
          {keyRequest && <KeyStepper firstBy={keyRequest.firstKeyBy} decided={false} language={language} />}
        </section>
      )}

      <ApprovalsKeyModal
        isOpen={secondKeyOpen}
        language={language}
        keyLabel={str('Key 2/2 — change the officers', 'Kisumuluzo 2/2 — kikyendereza abakozesa')}
        memberLine={pending?.summary || ''}
        amountText={str('AUTHORITY', 'OBUWALE')}
        officers={accounts.filter((a) => a.role !== 'member' && (!pending || a.name !== pending.firstKeyBy))}
        excludeName={pending?.firstKeyBy}
        onCancel={() => setSecondKeyOpen(false)}
        onConfirm={(officerId, pin) => {
          if (!onPendingOfficerKey) return 'This group cannot change the officers right now.';
          const err = onPendingOfficerKey({ officerId, pin });
          if (err) {
            setKeyError(err);
            return err;
          }
          setKeyError(null);
          setSecondKeyOpen(false);
          setNotice(str('The change is recorded and applied.', 'Ekikyendero kikikiddwe era kikozesebwa.'));
          return null;
        }}
      />

      <ApprovalsKeyModal
        isOpen={!!keyRequest}
        language={language}
        keyLabel={str('Key 1/2 — change the officers', 'Kisumuluzo 1/2 — kikyendereza abakozesa')}
        memberLine={checkOfficerChange(keyRequest || { kind: 'add', actor: currentUser as UserAccount, accounts }).summary}
        amountText={str('AUTHORITY', 'OBUWALE')}
        officers={(checkOfficerChange(keyRequest || { kind: 'add', actor: currentUser as UserAccount, accounts }).secondKeyOptions.length
          ? checkOfficerChange(keyRequest || { kind: 'add', actor: currentUser as UserAccount, accounts }).secondKeyOptions
          : accounts.filter((a) => a.role !== 'member'))}
        onCancel={() => {
          setKeyRequest(null);
          setKeyError(null);
        }}
        onConfirm={(officerId, pin) => {
          if (!keyRequest) return 'Nothing to approve.';
          const err = onOfficerKey(keyRequest, { officerId, pin });
          if (err) {
            setKeyError(err);
            return err;
          }
          setNotice(checkOfficerChange(keyRequest).summary + ' — ' + str('done', 'ekikiddwe'));
          setKeyError(null);
          setKeyRequest(null);
          setEditingId(null);
          return null;
        }}
      />

      {authEnforced && onLogout && (
        <button
          type="button"
          onClick={onLogout}
          className="w-full min-h-[48px] bg-white border-2 border-border-strong text-status-bad-tx rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <span className="material-symbols-outlined" aria-hidden="true">logout</span>
          {str('Sign out (lock this phone)', 'Fuluma (fumba ssimu eno)')}
        </button>
      )}
    </main>
  );
};
