import React, { useState } from 'react';
import { Language, Member, ScreenId, UserAccount } from '../types';
import { PRESET_SCENARIOS, SEED_ACCOUNTS } from '../data/mockData';
import { ConfirmDialog } from './ConfirmDialog';

interface AccountProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  availableAccounts: UserAccount[];
  members: Member[];
  groupId?: string;
  authEnforced?: boolean;
  language?: Language;
  onSwitchAccount: (account: UserAccount) => void;
  onLogout?: () => void;
  /** Returns an error message, or null on success. Receives current + new PIN. */
  onChangePin?: (newPin: string, oldPin: string) => Promise<string | null>;
  onSelectPreset: (presetId: string) => void;
  onResetToBaseline: () => void;
  onNavigate: (screen: ScreenId) => void;
  onSelectMember: (memberId: string) => void;
}

/** Dev tools (seed presets, full reset) never ship in production builds. */
function devToolsEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    return localStorage.getItem('bakwata_dev_tools') === '1';
  } catch {
    return false;
  }
}

export const AccountProfileModal: React.FC<AccountProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  availableAccounts = SEED_ACCOUNTS,
  members,
  groupId,
  authEnforced,
  language = 'EN',
  onSwitchAccount,
  onLogout,
  onChangePin,
  onSelectPreset,
  onResetToBaseline,
  onNavigate,
  onSelectMember,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'switcher' | 'presets'>('profile');
  const showDevTools = devToolsEnabled();
  const isDefaultPin = currentUser.pin === '1234';
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMsg, setPinMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pinBusy, setPinBusy] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const str = (en: string, lu: string) => language === 'LU' ? lu : en;

  if (!isOpen) return null;

  // Find linked member record if current user is also in the member roster
  const linkedMember = members.find(
    (m) =>
      m.id === currentUser.memberId ||
      m.no === currentUser.memberNo ||
      m.name.toLowerCase() === currentUser.name.toLowerCase()
  );

  const handleOpenMyPassbook = () => {
    if (linkedMember) {
      onSelectMember(linkedMember.id);
      onNavigate('member_passbook');
      onClose();
    }
  };

  const submitPinChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinBusy || !onChangePin) return;
    if (!/^\d{4}$/.test(newPin)) {
       setPinMsg({ ok: false, text: str('New PIN must be exactly 4 digits.', "PIN empya eriragana n'obunaku 4.") });
      return;
    }
    if (newPin !== confirmPin) {
      setPinMsg({ ok: false, text: str('New PIN and confirmation do not match.', 'PIN empya n\'okukyonnyosa tebikwatagana.') });
      return;
    }
    setPinBusy(true);
    setPinMsg(null);
    try {
      const stored = currentUser.pin || '';
      if (stored.startsWith('hash:')) {
        // Hashed PIN: verify the current one against the server (rate-limited).
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: currentUser.id, pin: currentPinInput, groupId }),
        });
        if (!res.ok) {
          setPinMsg({ ok: false, text: str('Current PIN is wrong.', 'PIN yo esooka si mungi.') });
          return;
        }
      } else if (currentPinInput !== stored) {
        setPinMsg({ ok: false, text: str('Current PIN is wrong.', 'PIN yo esooka si mungi.') });
        return;
      }
      if (newPin === currentPinInput && !stored.startsWith('hash:')) {
        setPinMsg({ ok: false, text: str('Pick a PIN different from the current one.', 'Londa PIN eyali n\'eyo esooka.') });
        return;
      }
      const err = await onChangePin(newPin, currentPinInput);
      if (err) {
        setPinMsg({ ok: false, text: err });
        return;
      }
      setCurrentPinInput('');
      setNewPin('');
      setConfirmPin('');
      setPinMsg({ ok: true, text: str('PIN changed. Use the new PIN next sign-in.', 'PIN ekyaliziddwa. Mozesa PIN empya okuyingira kabonako.') });
    } finally {
      setPinBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-surface-card border border-border-strong rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-border-line flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">account_circle</span>
            <div>
               <h2 className="font-bold text-primary text-base">{str('Actual User Account', 'Akawunti y\'Omukulu')}</h2>
               <p className="text-[11px] text-text-muted">{str('Bakwata VSLA Authentication & Identity', 'Bakwata VSLA — Kuyimiriza n\'Okutandika')}</p>
            </div>
          </div>
           <button
             aria-label={str('Close account profile', 'Ggalawo peesa y\'omukulu')}
             onClick={onClose}
             className="w-8 h-8 rounded-full bg-surface-card border border-border-strong flex items-center justify-center text-text-muted hover:text-primary transition"
            type="button"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-border-line bg-surface-card px-3 pt-2 gap-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-text-muted hover:text-primary'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-sm">badge</span>
             {str('Current Profile', 'Peesa y\'omuliro')}
          </button>
          <button
            onClick={() => setActiveTab('switcher')}
            className={`pb-2 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'switcher'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-text-muted hover:text-primary'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-sm">switch_account</span>
             {str(`Switch Account (${availableAccounts.length})`, `Kyusa Akawunti (${availableAccounts.length})`)}
          </button>
          {showDevTools && (
          <button
            onClick={() => setActiveTab('presets')}
            className={`pb-2 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'presets'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-text-muted hover:text-primary'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-sm">tune</span>
             {str('Seed Presets', 'Mfano okulonda')}
          </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="bg-primary-container text-white rounded-xl p-4 shadow space-y-3 relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-full ${currentUser.avatarBg || 'bg-emerald-600'} text-white flex items-center justify-center font-bold text-lg shadow-md border-2 border-white/20`}
                    >
                      {currentUser.avatarInitials}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-base font-bold text-white">{currentUser.name}</h3>
                        {currentUser.role === 'keyholder' && (
                          <span
                            className="material-symbols-outlined text-amber-300 text-sm"
                             title={str('Padlock Key Custodian', 'Omukwasi wa Kisumuluzo')}
                          >
                            key
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-primary-fixed block font-medium">
                        {currentUser.roleTitle}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-white/20 text-[10px] font-mono uppercase font-bold text-white">
                    {currentUser.memberNo ? `#${currentUser.memberNo}` : str('OFFICIAL', 'KASEKA')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-[11px]">
                  <div>
                     <span className="text-[#c0c8c3] block text-[10px]">{str('Mobile Contact', 'Ssimu y\'okutambula')}</span>
                    <span className="font-mono font-bold">{currentUser.phone}</span>
                    <span className="text-[9px] text-primary-fixed block">
                      {currentUser.provider} Mobile Money
                    </span>
                  </div>
                  <div>
                     <span className="text-[#c0c8c3] block text-[10px]">{str('Location / Zone', 'Ebbaliwo / Zone')}</span>
                    <span className="font-medium text-white truncate block">{currentUser.zone}</span>
                    <span className="text-[9px] text-[#c0c8c3] font-mono">
                      NIN: {currentUser.nationalId || 'CM84029103KL9'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Linked Member Personal Financial Snapshot */}
              {linkedMember ? (
                <div className="bg-canvas-bg rounded-xl border border-border-strong p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary text-xs uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-secondary">wallet</span>
                       {str('Personal VSLA Balances', 'Ebikwata ku VSLA by\'omukiise')}
                    </span>
                    <button
                      onClick={handleOpenMyPassbook}
                      className="text-xs text-secondary font-bold hover:underline flex items-center gap-0.5"
                      type="button"
                    >
                       <span>{str('Passbook', 'Ppaasibuku')}</span>
                      <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-white rounded-lg border border-border-line">
                       <span className="text-[10px] text-text-muted block">{str('Shares Saved', 'Emigabo eseridde')}</span>
                      <span className="font-mono font-bold text-primary text-xs block">
                        UGX {linkedMember.sharesTotal.toLocaleString('en-US')}
                      </span>
                      <span className="text-[9px] text-secondary font-semibold">
                         {linkedMember.sharesCount} {str('Stamps', 'Sitamu')}
                      </span>
                    </div>

                    <div className="p-2 bg-white rounded-lg border border-border-line">
                       <span className="text-[10px] text-text-muted block">{str('Active Loan', 'Ekyewolo ekikola')}</span>
                      <span
                        className={`font-mono font-bold text-xs block ${
                          linkedMember.loanBalance > 0 ? 'text-status-bad-tx' : 'text-status-ok-tx'
                        }`}
                      >
                        UGX {linkedMember.loanBalance.toLocaleString('en-US')}
                      </span>
                      <span className="text-[9px] text-text-muted">
                         {linkedMember.loanBalance > 0 ? str('Due 14 Oct', 'Tusiza 14 Oct') : str('No Debt', 'Tewali bbanja')}
                      </span>
                    </div>

                    <div className="p-2 bg-white rounded-lg border border-border-line">
                       <span className="text-[10px] text-text-muted block">{str('3x Max Limit', 'Ekkano ekikulu 3x')}</span>
                      <span className="font-mono font-bold text-secondary text-xs block">
                        UGX {linkedMember.maxBorrowLimit.toLocaleString('en-US')}
                      </span>
                       <span className="text-[9px] text-text-muted">{str('Eligible', 'Kiriziddwa')}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-canvas-bg rounded-xl border border-border-strong p-3 text-center space-y-1">
                   <span className="font-bold text-primary block text-xs">{str('Executive Box Admin Account', 'Akawunti y\'omusajja wa Sanduuko')}</span>
                   <p className="text-[11px] text-text-muted">
                     {str('Logged in as General Secretary. You have full custody over group ledgers, meeting minutes, and the strongbox audit trail.', 'Wayingira ng\'Omuwandiisi. Obeerera ku bitabo by\'ekibiina, ebikwata by\'olukuŋŋaana n\'amateeka ga sanduuko.')}
                   </p>
                </div>
              )}

              {/* Role Authority & Permissions */}
              <div className="bg-surface-card rounded-xl border border-border-strong p-3.5 space-y-2">
                <span className="font-bold text-primary uppercase text-[11px] tracking-wider block">
                   {str('Permissions & Governance Authority', 'Kibali n\'Obubali bw\'Obubali')}
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-on-surface">
                    <span
                      className={`material-symbols-outlined text-sm ${
                        currentUser.permissions.canLockBox ? 'text-secondary' : 'text-text-muted'
                      }`}
                    >
                      {currentUser.permissions.canLockBox ? 'check_circle' : 'cancel'}
                    </span>
                     <span>{str('Padlock Witness / Lock', 'Muji wa Padlock / Funga')}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-on-surface">
                    <span
                      className={`material-symbols-outlined text-sm ${
                        currentUser.permissions.canApproveLoans ? 'text-secondary' : 'text-text-muted'
                      }`}
                    >
                      {currentUser.permissions.canApproveLoans ? 'check_circle' : 'cancel'}
                    </span>
                     <span>{str('Approve Loan Requests', 'Kkiriza Ebisaba By\'Ebyewolo')}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-on-surface">
                    <span
                      className={`material-symbols-outlined text-sm ${
                        currentUser.permissions.canRecordShares ? 'text-secondary' : 'text-text-muted'
                      }`}
                    >
                      {currentUser.permissions.canRecordShares ? 'check_circle' : 'cancel'}
                    </span>
                     <span>{str('Stamp Shares & Cards', 'Teeka Emigabo n\'Kaadi')}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-on-surface">
                    <span
                      className={`material-symbols-outlined text-sm ${
                        currentUser.permissions.canDisburseWelfare
                          ? 'text-secondary'
                          : 'text-text-muted'
                      }`}
                    >
                      {currentUser.permissions.canDisburseWelfare ? 'check_circle' : 'cancel'}
                    </span>
                     <span>{str('Welfare Grants Sign-off', 'Kikasa Enkoba y\'Obuyambi')}</span>
                  </div>
                </div>
              </div>

              {/* PIN Security: warning + change form (PIN is never displayed) */}
              {isDefaultPin && (
                <div className="bg-red-50 border border-red-300 rounded-xl p-3 text-xs font-bold text-red-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">warning</span>
                   <span>{str('You still use the default PIN 1234. Anyone who knows it can sign in as you — change it below.', 'Omulandala atoodde PIN endala 1234. Oyo amazzi ki ayanga okuyingira nga ggwe — kikyuuse ku nsi.')}</span>
                </div>
              )}
              <form onSubmit={submitPinChange} className="bg-surface-container rounded-xl p-3 border border-border-line space-y-2">
                 <span className="font-bold text-primary block text-xs">{str('Change sign-in PIN', 'Kyuusa PIN okuyingira')}</span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={currentPinInput}
                    onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
                     placeholder={str('Current', 'Kati')}
                     aria-label={str('Current PIN', 'PIN yo kati')}
                    className="min-h-[44px] bg-white border border-border-strong rounded-lg px-2 text-center font-mono font-bold text-primary"
                  />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                     placeholder={str('New 4-digit', 'Namba 4 empya')}
                     aria-label={str('New PIN', 'PIN empya')}
                    className="min-h-[44px] bg-white border border-border-strong rounded-lg px-2 text-center font-mono font-bold text-primary"
                  />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                     placeholder={str('Confirm', 'Kakasa')}
                     aria-label={str('Confirm new PIN', 'Kakasa PIN empya')}
                    className="min-h-[44px] bg-white border border-border-strong rounded-lg px-2 text-center font-mono font-bold text-primary"
                  />
                </div>
                {pinMsg && (
                  <p className={`text-[11px] font-bold ${pinMsg.ok ? 'text-emerald-800' : 'text-red-800'}`}>{pinMsg.text}</p>
                )}
                <button
                  type="submit"
                  disabled={pinBusy || !onChangePin}
                  className="w-full py-2.5 bg-primary text-white rounded-lg font-bold text-xs disabled:opacity-60"
                >
                   {pinBusy ? str('Checking…', 'Kukebera…') : str('Change PIN', 'Kyuusa PIN')}
                </button>
              </form>

              {/* Switch Account Quick Action Button */}
              <button
                type="button"
                onClick={() => setActiveTab('switcher')}
                className="w-full py-2.5 bg-primary text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <span className="material-symbols-outlined text-base">swap_horiz</span>
                 <span>{str('Switch to Another Seeded Account', 'Kyusa ku Akawundi Ak\'ekaliro')}</span>
              </button>
            </div>
          )}

          {activeTab === 'switcher' && (
            <div className="space-y-3">
              <p className="text-text-muted text-[11px]">
                 {authEnforced
                   ? str('Pick an account, then enter its PIN on the sign-in screen:', 'Londa akawunti, olw\'emu ozikyalamu ku lusiko lw\'okuyingira:')
                   : str('Select any seeded account below to test real app permissions and user views:', 'Londa akawunti y\'okulondola w\'oku wa kikolo n\'endabikwa za muntu:')}
              </p>

              <div className="space-y-2">
                {availableAccounts.map((account) => {
                  const isSelected = account.id === currentUser.id;
                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => {
                        onSwitchAccount(account);
                        setActiveTab('profile');
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-status-ok-bg/40 border-secondary ring-1 ring-secondary'
                          : 'bg-canvas-bg border-border-line hover:border-primary'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full ${
                            account.avatarBg || 'bg-emerald-600'
                          } text-white flex items-center justify-center font-bold text-sm shadow-sm`}
                        >
                          {account.avatarInitials}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-primary text-xs">{account.name}</span>
                            {account.memberNo && (
                              <span className="text-[10px] font-mono bg-white px-1 rounded border">
                                #{account.memberNo}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-text-muted block">
                            {account.roleTitle}
                          </span>
                          <span className="text-[10px] text-text-muted font-mono">{account.phone}</span>
                        </div>
                      </div>

                      {isSelected ? (
                        <span className="px-2 py-0.5 rounded bg-secondary text-white text-[10px] font-bold">
                           {str('CURRENT', 'KATI')}
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-text-muted text-lg">
                          arrow_forward
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'presets' && showDevTools && (
            <div className="space-y-3">
              <p className="text-text-muted text-[11px]">
                 {str('Load structured test scenarios to instantly evaluate specific VSLA workflows:', 'Kikiza mirango egikwata ku kukebera VSLA:')}
              </p>

              <div className="space-y-2.5">
                {PRESET_SCENARIOS.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-3 bg-canvas-bg rounded-xl border border-border-line hover:border-primary transition space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-primary text-xs">{preset.title}</h4>
                      <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded font-bold text-secondary border">
                        {preset.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">{preset.subtitle}</p>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectPreset(preset.id);
                        onClose();
                      }}
                      className="w-full py-2 bg-primary-container text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 hover:bg-primary transition"
                    >
                      <span className="material-symbols-outlined text-sm">play_arrow</span>
                       {str('Load & Test This Scenario', 'Kikiza n\'ukebera mirango eno')}
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-border-line">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full py-2 bg-white border border-border-strong text-status-bad-tx hover:bg-rose-50 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition"
                >
                  <span className="material-symbols-outlined text-sm">restart_alt</span>
                     {str('Reset Entire Database to Seed Baseline', 'Zziza ebitabo byonna ku misinga ya seed')}
                </button>
              </div>
              <ConfirmDialog
                isOpen={showResetConfirm}
                 title={str('Reset everything?', 'Zziza byonna?')}
                 body={str('This resets practice/demo data only. Real group records require a protected backup and officer authorization.', 'Eno zzaaza ebizibu by\'ekizibu n\'okuzannya nga byokka. Ebizibu by\'ekibiina bisinga backup ebikwattiddwa n\'olukusa lw\'omukulu.')}
                 confirmLabel={str('Yes, reset all', 'Yee, zzaaza byonna')}
                 language={language}
                 danger
                onConfirm={() => {
                  setShowResetConfirm(false);
                  onResetToBaseline();
                  onClose();
                }}
                onCancel={() => setShowResetConfirm(false)}
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-surface-container-low border-t border-border-line flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
             <span>{authEnforced ? str('Signed-in session (24h)', 'Kiseera ky\'okuyingira (24h)') : str('Actual Account Mode Active', 'Enkola y\'Akawunti y\'omukulu ekikola')}</span>
          </div>
          <div className="flex items-center gap-2">
            {authEnforced && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="py-1.5 px-3 bg-white border border-red-300 font-bold text-xs text-status-bad-tx rounded-lg"
              >
                 {str('Sign out', 'Fula ku mulyeko')}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="py-1.5 px-4 bg-surface-card border border-border-strong font-bold text-xs text-primary rounded-lg hover:bg-surface-container"
            >
               {str('Done', 'Kikira')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
