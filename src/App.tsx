import React, { useState, useEffect, useCallback } from 'react';
import {
  ApprovalItem,
  CreateGroupPayload,
  GroupSummary,
  JoinGroupPayload,
  Language,
  MainTab,
  Member,
  PendingFine,
  ScreenId,
  UserAccount,
  WelfareGrant,
  VSLAState,
} from './types';
import { DEFAULT_INITIAL_STATE, SEED_ACCOUNTS } from './data/mockData';
import { TopAppBar } from './components/TopAppBar';
import { BottomNavBar } from './components/BottomNavBar';
import { CashDiscrepancyModal } from './components/CashDiscrepancyModal';
import { AccountProfileModal } from './components/AccountProfileModal';
import { GroupOnboardingModal } from './components/GroupOnboardingModal';
import { ShareInviteModal } from './components/ShareInviteModal';
import { HomeView } from './views/HomeView';
import { MeetingCloseBoxView } from './views/MeetingCloseBoxView';
import { ApprovalsQueueView } from './views/ApprovalsQueueView';
import { MemberPassbookView } from './views/MemberPassbookView';
import { MoMoPushView } from './views/MoMoPushView';
import { NewLoanRequestView } from './views/NewLoanRequestView';
import { CycleShareOutView } from './views/CycleShareOutView';
import { WelfareFundView } from './views/WelfareFundView';
import { AudioBroadcastView } from './views/AudioBroadcastView';
import { ConstitutionFinesView } from './views/ConstitutionFinesView';
import { BackupAuditView } from './views/BackupAuditView';
import { LegalView } from './views/LegalView';
import { MeetingWizardView } from './views/MeetingWizardView';
import { ShopView, NewProductInput, SaleInput } from './views/ShopView';
import { UsersView } from './views/UsersView';
import { GroupSettingsView, GroupSettingsPatch } from './views/GroupSettingsView';
import { AddMemberModal, NewMemberInput } from './components/AddMemberModal';
import { ReportsView, LATE_FINE_AMOUNT } from './views/ReportsView';
import { AboutView } from './views/AboutView';
import { HelpView } from './views/HelpView';
import { OnboardingTour, ONBOARDING_KEY, SEEN_VERSION_KEY } from './components/OnboardingTour';
import { WhatsNewModal } from './components/WhatsNewModal';
import { APP_VERSION } from './data/changelog';
import { withAudit } from './utils/audit';
import { getTranslations } from './i18n/translations';
import { appliedRepayment, changeDue, WELFARE_FAST_TRACK_CAP, welfareNeedsQueue } from './utils/policy';
import { downloadBackupFile } from './utils/backupFile';
import {
  buildLocalGroup,
  clearPendingGroup,
  loadPendingGroup,
  savePendingGroup,
} from './utils/offlineGroup';
import { ShareOutResult } from './utils/shareout';
import { firstKeyUpdate, isSameOfficer } from './utils/dualApproval';
import { isDefaultPin } from './utils/pin';
import { PublicDisplayModal } from './components/PublicDisplayModal';
import { LoginView } from './views/LoginView';
import { apiFetch, fetchAuthStatus, getSessionToken, setSessionToken } from './utils/api';

export function App() {
  // Default Luganda: local users first. Persisted once the user picks.
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('vsla_lang');
      return saved === 'EN' || saved === 'LU' ? (saved as Language) : 'LU';
    } catch {
      return 'LU';
    }
  });
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('home');
  const [isDiscrepancyModalOpen, setIsDiscrepancyModalOpen] = useState(false);
  const [selectedBox, setSelectedBox] = useState('Bakwata Box 01 • Weekly Friday Cycle');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('m1');
  const [isServerConnected, setIsServerConnected] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  // Session auth: token (24h) + server-advertised enforcement + storage honesty
  const [sessionToken, setSessionTokenState] = useState<string | null>(() => getSessionToken());
  const [authEnforced, setAuthEnforced] = useState(false);
  const [storageDriver, setStorageDriver] = useState<string | null>(null);
  const [storageShared, setStorageShared] = useState<boolean | null>(null);
  const [loginPreselectId, setLoginPreselectId] = useState<string | undefined>(undefined);
  // Accessibility for village reality: elder big-text + sunlight contrast (persisted).
  // Elder text is ON unless explicitly switched off — old eyes are the norm.
  const [elderMode, setElderMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vsla_elder_mode') !== '0';
    } catch {
      return true;
    }
  });
  const [sunlightMode, setSunlightMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vsla_sunlight_mode') === '1';
    } catch {
      return false;
    }
  });
  const [isPublicDisplayOpen, setIsPublicDisplayOpen] = useState(false);
  // Simple Mode: 3 giant buttons, 4 tabs, no SaaS jargon. ON unless explicitly off.
  const [simpleMode, setSimpleMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vsla_simple_mode') !== '0';
    } catch {
      return true;
    }
  });

  // Multi-Tenant SaaS State
  const [currentGroupId, setCurrentGroupId] = useState<string>(() => {
    try {
      return localStorage.getItem('bakwata_active_group_id') || 'bakwata-01';
    } catch (e) {
      return 'bakwata-01';
    }
  });
  const [availableGroups, setAvailableGroups] = useState<GroupSummary[]>([]);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupModalDefaultTab, setGroupModalDefaultTab] = useState<'directory' | 'register' | 'join'>('directory');
  const [isShareInviteOpen, setIsShareInviteOpen] = useState(false);
  const [showTour, setShowTour] = useState<boolean>(() => {
    try {
      return !localStorage.getItem(ONBOARDING_KEY);
    } catch (e) {
      return false;
    }
  });
  const [showWhatsNew, setShowWhatsNew] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SEEN_VERSION_KEY) !== APP_VERSION && !!localStorage.getItem(ONBOARDING_KEY);
    } catch (e) {
      return false;
    }
  });

  const dismissTour = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, '1');
      localStorage.setItem(SEEN_VERSION_KEY, APP_VERSION);
    } catch (e) {}
    setShowTour(false);
  };

  const dismissWhatsNew = () => {
    try {
      localStorage.setItem(SEEN_VERSION_KEY, APP_VERSION);
    } catch (e) {}
    setShowWhatsNew(false);
  };

  // Centralized VSLA State
  const [vslaState, setVslaState] = useState<VSLAState>(() => {
    try {
      const cached = localStorage.getItem('bakwata_vsla_state');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('LocalStorage read error:', e);
    }
    return DEFAULT_INITIAL_STATE;
  });

  const currentUser: UserAccount = vslaState.currentUser || SEED_ACCOUNTS[0];

  // Fetch groups list from SaaS registry
  const fetchGroupsList = useCallback(async () => {
    try {
      const res = await apiFetch('/api/groups');
      if (res.ok) {
        const data = await res.json();
        if (data.groups && Array.isArray(data.groups)) {
          setAvailableGroups(data.groups);
        }
      }
    } catch (err) {
      console.warn('Could not fetch groups list:', err);
    }
  }, []);

  // Fetch state for a specific group from server
  const fetchStateFromServer = useCallback(async (targetGroupId?: string) => {
    const gid = targetGroupId || currentGroupId || 'bakwata-01';
    // Never let the server clobber an offline-created group the server
    // doesn't know yet — its only copy lives on this phone.
    try {
      const local = JSON.parse(localStorage.getItem('bakwata_vsla_state') || 'null');
      if (local && local.groupId === gid && local.pendingSync) {
        setIsSyncing(false);
        return;
      }
    } catch {
      /* fall through to server */
    }
    try {
      setIsSyncing(true);
      const res = await apiFetch(`/api/state?groupId=${gid}`, {
        headers: { 'x-group-id': gid },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state && Array.isArray(data.state.members)) {
          setVslaState(data.state);
          setCurrentGroupId(gid);
          setSelectedBox(`${data.state.groupName || 'Bakwata'} • ${data.state.boxIdentifier || 'BOX-01'}`);
          try {
            localStorage.setItem('bakwata_vsla_state', JSON.stringify(data.state));
            localStorage.setItem('bakwata_active_group_id', gid);
          } catch (e) {}
          setIsServerConnected(true);
        }
      }
    } catch (err) {
      console.warn('Could not connect to backend server, operating offline:', err);
      setIsServerConnected(false);
    } finally {
      setIsSyncing(false);
    }
  }, [currentGroupId]);

  // Persist to Server and LocalStorage
  const persistState = useCallback(async (nextState: VSLAState) => {
    nextState.groupId = currentGroupId;
    setVslaState(nextState);
    try {
      localStorage.setItem('bakwata_vsla_state', JSON.stringify(nextState));
    } catch (e) {
      console.warn('LocalStorage write error:', e);
    }

    try {
      setIsSyncing(true);
      const res = await apiFetch(`/api/state?groupId=${currentGroupId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-group-id': currentGroupId,
        },
        body: JSON.stringify({ state: nextState, groupId: currentGroupId }),
      });
      if (res.ok) {
        setIsServerConnected(true);
        fetchGroupsList();
      } else {
        setIsServerConnected(false);
      }
    } catch (err) {
      console.warn('Backend sync failed, offline fallback active:', err);
      setIsServerConnected(false);
    } finally {
      setIsSyncing(false);
    }
  }, [currentGroupId, fetchGroupsList]);

  const handleSelectGroup = async (groupId: string) => {
    setCurrentGroupId(groupId);
    try {
      localStorage.setItem('bakwata_active_group_id', groupId);
    } catch (e) {}
    await fetchStateFromServer(groupId);
  };

  const handleCreateGroup = async (payload: CreateGroupPayload) => {
    const applyState = (state: VSLAState, gid: string) => {
      setVslaState(state);
      setCurrentGroupId(gid);
      setSelectedBox(`${state.groupName} • ${state.boxIdentifier}`);
      try {
        localStorage.setItem('bakwata_vsla_state', JSON.stringify(state));
        localStorage.setItem('bakwata_active_group_id', gid);
      } catch (e) {}
    };
    try {
      const res = await apiFetch('/api/groups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchGroupsList();
        if (data.state) applyState({ ...data.state, pendingSync: false }, data.groupId);
        return { success: true, group: data.group, inviteCode: data.group?.inviteCode };
      } else {
        return { success: false, error: data.error || 'Failed to create savings group' };
      }
    } catch (err: any) {
      // No network (gap 1a): create a fully working group on this phone and
      // sync it to /api/state later. Nothing the secretary typed is lost.
      try {
        const { state, group, inviteCode } = buildLocalGroup(payload);
        applyState(state, group.id);
        savePendingGroup(group.id);
        return { success: true, group, inviteCode, offline: true };
      } catch (e: any) {
        return { success: false, error: err.message || 'Network error' };
      }
    }
  };

  // Push an offline-created group to the server once network is back.
  const syncPendingGroup = async (): Promise<boolean> => {
    const pendingId = loadPendingGroup();
    if (!pendingId) return true;
    let stored: VSLAState | null = null;
    try {
      stored = JSON.parse(localStorage.getItem('bakwata_vsla_state') || 'null');
    } catch {
      stored = null;
    }
    if (!stored || stored.groupId !== pendingId) {
      clearPendingGroup();
      return true;
    }
    try {
      const res = await apiFetch(`/api/state?groupId=${pendingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-group-id': pendingId },
        body: JSON.stringify({ state: { ...stored, pendingSync: false }, groupId: pendingId }),
      });
      if (res.ok) {
        const cleared = { ...stored, pendingSync: false };
        setVslaState(cleared);
        try {
          localStorage.setItem('bakwata_vsla_state', JSON.stringify(cleared));
        } catch {}
        clearPendingGroup();
        setIsServerConnected(true);
        fetchGroupsList();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleJoinGroup = async (payload: JoinGroupPayload) => {
    try {
      const res = await apiFetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchGroupsList();
        if (data.state) {
          setVslaState(data.state);
          setCurrentGroupId(data.groupId);
          setSelectedBox(`${data.state.groupName} • ${data.state.boxIdentifier}`);
          try {
            localStorage.setItem('bakwata_vsla_state', JSON.stringify(data.state));
            localStorage.setItem('bakwata_active_group_id', data.groupId);
          } catch (e) {}
        }
        return { success: true, groupName: data.groupName, memberNo: data.memberNo };
      } else {
        return { success: false, error: data.error || 'Failed to join savings group' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const handleSwitchAccount = async (account: UserAccount) => {
    // When the server enforces auth, in-app switching would bypass the PIN —
    // send the user to the PIN gate pre-selected on that account instead.
    if (authEnforced) {
      setSessionToken(null);
      setSessionTokenState(null);
      setLoginPreselectId(account.id);
      setIsAccountModalOpen(false);
      return;
    }
    const updatedState: VSLAState = {
      ...vslaState,
      currentUser: account,
    };
    if (account.memberId) {
      setSelectedMemberId(account.memberId);
    }
    await persistState(updatedState);
    try {
      await apiFetch(`/api/accounts/switch?groupId=${currentGroupId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-group-id': currentGroupId,
        },
        body: JSON.stringify({ accountId: account.id, groupId: currentGroupId }),
      });
    } catch (err) {
      console.warn('Could not notify server of account switch:', err);
    }
  };

  const handleLogin = async (account: UserAccount) => {
    setSessionTokenState(getSessionToken());
    setLoginPreselectId(undefined);
    if (account.memberId) {
      setSelectedMemberId(account.memberId);
    }
    await persistState({ ...vslaState, currentUser: account });
    setCurrentScreen('home');
    setActiveTab('home');
  };

  const handleLogout = () => {
    setSessionToken(null);
    setSessionTokenState(null);
    setLoginPreselectId(undefined);
    setIsAccountModalOpen(false);
  };

  // ---- Change sign-in PIN (stored plaintext until next login migrates it to scrypt) ----
  const handleChangePin = (newPin: string) => {
    const updated: UserAccount = { ...currentUser, pin: newPin };
    persistState(
      withAudit(
        {
          ...vslaState,
          currentUser: updated,
          availableAccounts: (vslaState.availableAccounts || []).map((a) =>
            a.id === updated.id ? updated : a
          ),
        },
        currentUser.name,
        'Changed sign-in PIN',
        `${currentUser.name} (#${currentUser.memberNo || 'EXEC'})`,
        undefined
      )
    );
  };

  const handleSelectPreset = async (presetId: string) => {
    try {
      setIsSyncing(true);
      const res = await apiFetch(`/api/seed/preset?groupId=${currentGroupId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-group-id': currentGroupId,
        },
        body: JSON.stringify({ presetId, groupId: currentGroupId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setVslaState(data.state);
          localStorage.setItem('bakwata_vsla_state', JSON.stringify(data.state));
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to switch preset on server, applying fallback:', err);
    } finally {
      setIsSyncing(false);
    }

    let boxCash = vslaState.boxCashBalance;
    let loanFund = vslaState.loanFundBalance;
    let welfareFund = vslaState.welfareFundBalance;
    let targetUser = currentUser;

    if (presetId === 'meeting_close') {
      boxCash = 1420000;
      loanFund = 9950000;
      welfareFund = 790000;
      targetUser = SEED_ACCOUNTS[0]; // Grace Akello (Sec)
    } else if (presetId === 'active_loans') {
      boxCash = 850000;
      loanFund = 8400000;
      welfareFund = 650000;
      targetUser = SEED_ACCOUNTS[4]; // Joseph Mukasa (Borrower)
      setSelectedMemberId('m2');
    } else if (presetId === 'share_out') {
      boxCash = 3450000;
      loanFund = 12500000;
      welfareFund = 1100000;
      targetUser = SEED_ACCOUNTS[1]; // Sarah Nabukalu (Top Saver)
      setSelectedMemberId('m1');
    }

    persistState({
      ...vslaState,
      boxCashBalance: boxCash,
      loanFundBalance: loanFund,
      welfareFundBalance: welfareFund,
      activePreset: presetId,
      currentUser: targetUser,
    });
  };

  useEffect(() => {
    document.title = 'Bakwata VSLA — Group App';
    fetchGroupsList();
    fetchStateFromServer(currentGroupId);
    fetchAuthStatus().then((s) => {
      if (!s) return;
      setAuthEnforced(s.authEnforced);
      setStorageDriver(s.storage.driver);
      // Local dev file store is durable on one machine; Vercel memory is not
      // shared. Warn unless we have a truly shared store.
      setStorageShared(s.storage.driver === 'postgres' ? true : (s.storage.shared ?? false));
    });
  }, [fetchGroupsList, fetchStateFromServer, currentGroupId]);

  const pendingApprovalsCount = vslaState.approvals.filter((a) => a.status === 'pending').length;

  // Retry pending offline-group sync whenever we (re)connect.
  useEffect(() => {
    if (isServerConnected && loadPendingGroup()) {
      syncPendingGroup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isServerConnected]);

  const handleToggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === 'EN' ? 'LU' : 'EN';
      try {
        localStorage.setItem('vsla_lang', next);
      } catch {}
      return next;
    });
  };

  const handleSelectLanguage = (lang: Language) => {
    setLanguage(lang);
    try {
      localStorage.setItem('vsla_lang', lang);
    } catch {}
  };

  const handleNavigateScreen = (screen: ScreenId) => {
    setCurrentScreen(screen);
    if (screen === 'home') setActiveTab('home');
    else if (screen === 'meeting_close' || screen === 'meeting_wizard' || screen === 'audio_broadcast') setActiveTab('meetings');
    else if (screen === 'member_passbook') setActiveTab('members');
    else if (screen === 'new_loan') setActiveTab('loans');
    else if (screen === 'approvals') setActiveTab('approvals');
    else setActiveTab('more');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Approval Handlers — TWO-KEY RULE: money moves only on 2nd DISTINCT officer key.
  // Blocks default PIN 1234 from authorizing money (fix #16, #20, #48).
  const handleApproveItem = (id: string, payoutMethod?: string) => {
    const targetItem = vslaState.approvals.find((a) => a.id === id);
    if (!targetItem) return;
    if (targetItem.status !== 'pending') return;
    if (isDefaultPin(currentUser.pin)) {
      alert('Change your default PIN 1234 first (Account → Change PIN). Money cannot move on a default PIN.');
      setIsAccountModalOpen(true);
      return;
    }
    const method = payoutMethod || targetItem.provider || 'Cash';
    const nowIso = new Date().toISOString();

    // Key 1/2: record first officer, move NO money.
    if (!targetItem.firstApprovedBy) {
      const updatedApprovals = vslaState.approvals.map((item) =>
        item.id === id ? firstKeyUpdate(item, currentUser.name, nowIso) : item
      );
      persistState(
        withAudit(
          { ...vslaState, approvals: updatedApprovals },
          currentUser.name,
          `First key (1/2) for ${targetItem.type.replace(/_/g, ' ')} ${targetItem.reqNumber} via ${method}`,
          `${targetItem.memberName} (#${targetItem.memberNo}) · needs a DIFFERENT officer for key 2/2 · no money moved`,
          targetItem.amount
        )
      );
      return;
    }

    // Same officer cannot turn both keys.
    if (isSameOfficer(targetItem, currentUser.name)) {
      alert(`${currentUser.name} already turned key 1/2. A DIFFERENT officer must turn key 2/2.`);
      return;
    }

    // Key 2/2 by a different officer: move money now.
    let boxCash = vslaState.boxCashBalance;
    let loanFund = vslaState.loanFundBalance;
    let welfareFund = vslaState.welfareFundBalance;

    if (targetItem.type === 'vsla_loan') {
      loanFund = Math.max(0, loanFund - targetItem.amount);
      boxCash = Math.max(0, boxCash - targetItem.amount);
    } else if (targetItem.type === 'welfare_grant') {
      welfareFund = Math.max(0, welfareFund - targetItem.amount);
      boxCash = Math.max(0, boxCash - targetItem.amount);
    } else if (targetItem.type === 'savings_withdrawal') {
      boxCash = Math.max(0, boxCash - targetItem.amount);
    }

    const updatedApprovals = vslaState.approvals.map((item) =>
      item.id === id
        ? {
            ...item,
            status: 'approved' as const,
            provider: (method === 'MTN' || method === 'Airtel' ? method : item.provider) as 'MTN' | 'Airtel' | 'Cash',
            decidedBy: `${targetItem.firstApprovedBy} + ${currentUser.name}`,
            decidedAt: nowIso,
            secondApprovedBy: currentUser.name,
            secondApprovedAt: nowIso,
            payoutMethod: method,
          }
        : item
    );

    persistState(
      withAudit(
        {
          ...vslaState,
          boxCashBalance: boxCash,
          loanFundBalance: loanFund,
          welfareFundBalance: welfareFund,
          approvals: updatedApprovals,
        },
        currentUser.name,
        `Second key (2/2) APPROVED ${targetItem.type.replace(/_/g, ' ')} ${targetItem.reqNumber} via ${method}`,
        `${targetItem.memberName} (#${targetItem.memberNo}) · keys: ${targetItem.firstApprovedBy} + ${currentUser.name} · payout ${method}`,
        targetItem.amount
      )
    );
  };

  const handleRejectItem = (id: string) => {
    const targetItem = vslaState.approvals.find((a) => a.id === id);
    const updatedApprovals = vslaState.approvals.map((item) =>
      item.id === id
        ? { ...item, status: 'rejected' as const, decidedBy: currentUser.name, decidedAt: new Date().toISOString() }
        : item
    );
    persistState(
      withAudit(
        {
          ...vslaState,
          approvals: updatedApprovals,
        },
        currentUser.name,
        `Rejected ${targetItem?.type.replace(/_/g, ' ') || 'request'} ${targetItem?.reqNumber || ''}`,
        `${targetItem?.memberName || 'Unknown'} (#${targetItem?.memberNo || '-'})`,
        targetItem?.amount
      )
    );
  };

  // Discrepancy Adjustment
  const handleDiscrepancyAdjustment = (amount: number, reason: string, method: string) => {
    let welfareFund = vslaState.welfareFundBalance;
    let boxCash = vslaState.boxCashBalance;

    if (method === 'welfare') {
      welfareFund = Math.max(0, welfareFund - amount);
    } else {
      boxCash = boxCash + amount;
    }

    persistState(
      withAudit(
        {
          ...vslaState,
          welfareFundBalance: welfareFund,
          boxCashBalance: boxCash,
        },
        currentUser.name,
        `Cash discrepancy adjustment (${method})`,
        reason,
        amount
      )
    );
  };

  // Member Repayment
  const handleRecordRepaymentInPassbook = (amount: number, memberId: string) => {
    const targetMember = vslaState.members.find((m) => m.id === memberId);
    // Gap 3a: overpayments used to inflate the fund and vanish. Cap at the
    // balance, credit the fund with what was applied, flag change to hand back.
    const pay = appliedRepayment(amount, targetMember?.loanBalance || 0);
    const change = changeDue(amount, targetMember?.loanBalance || 0);
    const updatedMembers = vslaState.members.map((m) => {
      if (m.id === memberId) {
        const newLoanBalance = Math.max(0, m.loanBalance - pay);
        const newActiveLoan = m.activeLoan
          ? {
              ...m.activeLoan,
              repaid: m.activeLoan.repaid + pay,
              balance: Math.max(0, m.activeLoan.balance - pay),
            }
          : undefined;

        const newLedgerEntry = {
          id: 'led-' + Date.now(),
          title: 'Meeting #28: Loan Repayment (Cash)',
          badge: 'CASH',
          subtitle: `Physical cash received by box teller. Balance: UGX ${newLoanBalance.toLocaleString()}${change > 0 ? ` · CHANGE DUE UGX ${change.toLocaleString()} — hand back` : ''}`,
          amountText: `+UGX ${pay.toLocaleString()}`,
          isPositive: true,
          date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        };

        return {
          ...m,
          loanBalance: newLoanBalance,
          activeLoan: newActiveLoan,
          ledger: [newLedgerEntry, ...m.ledger],
        };
      }
      return m;
    });

    persistState(
      withAudit(
        {
          ...vslaState,
          members: updatedMembers,
          boxCashBalance: vslaState.boxCashBalance + pay,
          loanFundBalance: vslaState.loanFundBalance + pay,
        },
        currentUser.name,
        'Recorded loan repayment',
        `${targetMember?.name || 'Member'} (#${targetMember?.no || '-'})${change > 0 ? ` · change UGX ${change.toLocaleString()} handed back` : ''}`,
        pay
      )
    );
  };

  // Member Buy Shares
  const handleBuyShares = (sharesCount: number, memberId: string) => {
    const cost = sharesCount * 10000;
    const targetMember = vslaState.members.find((m) => m.id === memberId);
    const updatedMembers = vslaState.members.map((m) => {
      if (m.id === memberId) {
        const newSharesCount = m.sharesCount + sharesCount;
        const newSharesTotal = m.sharesTotal + cost;
        const newMaxBorrow = newSharesTotal * 3;

        // Stamp cards: mark next unvalidated stamp
        let stamped = false;
        const newStamps = m.stamps.map((st) => {
          if (!stamped && (st.status === 'current' || st.status === 'next')) {
            stamped = true;
            return { ...st, status: 'validated' as const, shares: st.shares + sharesCount };
          }
          return st;
        });

        const newLedgerEntry = {
          id: 'led-' + Date.now(),
          title: `Meeting #28: Bought ${sharesCount} Share(s)`,
          badge: 'SAVINGS',
          subtitle: `Stamped into member physical passbook card. Total: ${newSharesCount} shares`,
          amountText: `+UGX ${cost.toLocaleString()}`,
          isPositive: true,
          date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        };

        return {
          ...m,
          sharesCount: newSharesCount,
          sharesTotal: newSharesTotal,
          maxBorrowLimit: newMaxBorrow,
          stamps: newStamps,
          ledger: [newLedgerEntry, ...m.ledger],
        };
      }
      return m;
    });

    persistState(
      withAudit(
        {
          ...vslaState,
          members: updatedMembers,
          boxCashBalance: vslaState.boxCashBalance + cost,
          loanFundBalance: vslaState.loanFundBalance + cost,
        },
        currentUser.name,
        `Stamped ${sharesCount} share(s)`,
        `${targetMember?.name || 'Member'} (#${targetMember?.no || '-'})`,
        cost
      )
    );
  };

  // Mobile Money Success
  const handleMoMoSuccess = (amount: number, desc: string) => {
    persistState(
      withAudit(
        {
          ...vslaState,
          boxCashBalance: vslaState.boxCashBalance + amount,
        },
        currentUser.name,
        'Mobile Money collection confirmed',
        desc,
        amount
      )
    );
  };

  // Submit New Loan Application
  const handleSubmitNewLoan = (loan: {
    memberName: string;
    memberNo: string;
    amount: number;
    term: string;
    serviceFee: number;
    phone: string;
    provider: 'MTN' | 'Airtel';
  }) => {
    const member = vslaState.members.find((m) => m.no === loan.memberNo) || vslaState.members[0];
    const newApproval: ApprovalItem = {
      id: 'app-' + Date.now(),
      type: 'vsla_loan',
      reqNumber: 'Req #LN-' + Math.floor(880 + Math.random() * 100),
      timeText: 'Just now',
      memberName: loan.memberName,
      memberNo: loan.memberNo,
      phone: loan.phone,
      provider: loan.provider,
      initiator: 'Grace A. (Sec)',
      amount: loan.amount,
      term: loan.term,
      serviceFee: loan.serviceFee,
      status: 'pending',
      totalSavings: member.sharesTotal,
      maxBorrowable: member.maxBorrowLimit,
    };

    persistState(
      withAudit(
        {
          ...vslaState,
          approvals: [newApproval, ...vslaState.approvals],
        },
        currentUser.name,
        `Submitted loan request ${newApproval.reqNumber}`,
        `${loan.memberName} (#${loan.memberNo})`,
        loan.amount
      )
    );
  };

  // Disburse Welfare Grant — blocked on default PIN like approvals
  const handleDisburseWelfareGrant = (grant: WelfareGrant): string | null => {
    if (isDefaultPin(currentUser.pin)) {
      alert('Change your default PIN 1234 first. Welfare money cannot move on a default PIN.');
      setIsAccountModalOpen(true);
      return 'Change your default PIN first.';
    }
    // Gap 4b: one rule, two doors. Direct payout is the emergency fast-track:
    // capped single-key; anything bigger must pass the 2-key approvals queue.
    if (welfareNeedsQueue(grant.amount)) {
      return `UGX ${grant.amount.toLocaleString()} is above the UGX ${WELFARE_FAST_TRACK_CAP.toLocaleString()} fast-track cap — file it as a welfare request so 2 officers approve it.`;
    }
    persistState(
      withAudit(
        {
          ...vslaState,
          welfareFundBalance: Math.max(0, vslaState.welfareFundBalance - grant.amount),
          welfareGrants: [grant, ...vslaState.welfareGrants],
        },
        currentUser.name,
        `Disbursed welfare grant (FAST-TRACK single key ≤ UGX ${WELFARE_FAST_TRACK_CAP.toLocaleString()})`,
        `${grant.memberName} (#${grant.memberNo}) — ${grant.reason}`,
        grant.amount
      )
    );
    return null;
  };

  // Fine Handlers
  const handleCollectFine = (id: string) => {
    const target = vslaState.fines.find((f) => f.id === id);
    const amount = target ? target.amount : 0;
    const updatedFines = vslaState.fines.map((f) =>
      f.id === id ? { ...f, status: 'collected' as const } : f
    );
    persistState(
      withAudit(
        {
          ...vslaState,
          fines: updatedFines,
          boxCashBalance: vslaState.boxCashBalance + amount,
        },
        currentUser.name,
        'Collected fine',
        `${target?.memberName || 'Member'} (#${target?.memberNo || '-'}) — ${target?.reason || ''}`,
        amount
      )
    );
  };

  const handleWaiveFine = (id: string) => {
    const target = vslaState.fines.find((f) => f.id === id);
    const updatedFines = vslaState.fines.map((f) =>
      f.id === id ? { ...f, status: 'waived' as const } : f
    );
    persistState(
      withAudit(
        {
          ...vslaState,
          fines: updatedFines,
        },
        currentUser.name,
        'Waived fine',
        `${target?.memberName || 'Member'} (#${target?.memberNo || '-'}) — ${target?.reason || ''}`,
        target?.amount
      )
    );
  };

  const handleLevyFine = (fine: PendingFine) => {
    persistState(
      withAudit(
        {
          ...vslaState,
          fines: [fine, ...vslaState.fines],
        },
        currentUser.name,
        'Levied fine',
        `${fine.memberName} (#${fine.memberNo}) — ${fine.reason}`,
        fine.amount
      )
    );
  };

  // Backup & Restore Handlers
  const handleRestoreState = async (newState: VSLAState): Promise<boolean> => {
    try {
      const res = await apiFetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState }),
      });
      if (res.ok) {
        const json = await res.json();
        setVslaState(json.state || newState);
        localStorage.setItem('bakwata_vsla_state', JSON.stringify(json.state || newState));
        return true;
      }
    } catch (e) {
      console.warn('Backend restore failed, setting state locally:', e);
      setVslaState(newState);
      localStorage.setItem('bakwata_vsla_state', JSON.stringify(newState));
      return true;
    }
    return false;
  };

  const handleCreateSnapshot = async (label: string) => {
    try {
      const res = await apiFetch('/api/backup/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.state) {
          setVslaState(json.state);
          return;
        }
      }
    } catch (e) {
      console.warn('Backend snapshot failed, taking local snapshot:', e);
    }

    // Local snapshot fallback
    const newSnapshot = {
      id: 'snap-' + Date.now(),
      label,
      timestamp: new Date().toISOString(),
      membersCount: vslaState.members.length,
      boxCashBalance: vslaState.boxCashBalance,
      data: JSON.stringify(vslaState),
    };
    persistState({
      ...vslaState,
      snapshots: [newSnapshot, ...(vslaState.snapshots || [])],
      lastBackupDate: new Date().toISOString(),
    });
  };

  const handleResetToBaseline = async () => {
    try {
      const res = await apiFetch('/api/backup/reset', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.state) {
          setVslaState(json.state);
          localStorage.setItem('bakwata_vsla_state', JSON.stringify(json.state));
          return;
        }
      }
    } catch (e) {
      console.warn('Backend reset call failed, resetting locally:', e);
    }
    setVslaState(DEFAULT_INITIAL_STATE);
    localStorage.setItem('bakwata_vsla_state', JSON.stringify(DEFAULT_INITIAL_STATE));
  };

  // Execute Cycle Share-Out: post payouts to ledgers, clear debts, start new cycle
  const handleExecuteShareOut = (result: ShareOutResult) => {
    if (isDefaultPin(currentUser.pin)) {
      alert('Change your default PIN 1234 first. Share-out cannot run on a default PIN.');
      setIsAccountModalOpen(true);
      return;
    }
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const updatedMembers = vslaState.members.map((m) => {
      const p = result.payouts.find((x) => x.memberId === m.id);
      const net = p?.netPayout || 0;
      const entry = {
        id: 'led-shareout-' + Date.now() + '-' + m.id,
        meetingNo: vslaState.recentMeetingsCount,
        meetingCode: 'SHARE-OUT',
        title: `Cycle ${vslaState.cycle} Share-Out Paid`,
        badge: 'SHARE-OUT',
        subtitle: `Gross UGX ${((p?.grossPayout) || 0).toLocaleString()} · Loan deducted UGX ${((p?.deductedLoan) || 0).toLocaleString()} · New cycle started`,
        amountText: `UGX ${net.toLocaleString()}`,
        isPositive: true,
        date: dateStr,
      };
      return {
        ...m,
        sharesCount: 0,
        sharesTotal: 0,
        maxBorrowLimit: 0,
        loanBalance: 0,
        activeLoan: undefined,
        ledger: [entry, ...m.ledger],
      };
    });

    persistState(
      withAudit(
        {
          ...vslaState,
          members: updatedMembers,
          boxCashBalance: 0,
          loanFundBalance: 0,
          welfareFundBalance: 0,
          cycle: vslaState.cycle + 1,
          cycleMonth: 1,
        },
        currentUser.name,
        `Executed Cycle ${vslaState.cycle} share-out`,
        `${result.payouts.length} members paid UGX ${result.totalNetPayout.toLocaleString()}; loans recovered UGX ${result.totalDeductedLoans.toLocaleString()}`,
        result.totalNetPayout
      )
    );
  };

  // ---- Meeting wizard bulk commits (single state write each) ----
  const wizardSharePrice = vslaState.groupProfile?.sharePrice || 10000;
  const handleWizardShares = (items: { memberId: string; shares: number }[]) => {
    const map = new Map(items.map((i) => [i.memberId, Math.min(5, Math.max(0, i.shares))]));
    let total = 0;
    const updatedMembers = vslaState.members.map((m) => {
      const n = map.get(m.id) || 0;
      if (!n) return m;
      const cost = n * wizardSharePrice;
      total += cost;
      let stamped = false;
      const newStamps = m.stamps.map((st) => {
        if (!stamped && (st.status === 'current' || st.status === 'next')) {
          stamped = true;
          return { ...st, status: 'validated' as const, shares: st.shares + n };
        }
        return st;
      });
      return {
        ...m,
        sharesCount: m.sharesCount + n,
        sharesTotal: m.sharesTotal + cost,
        maxBorrowLimit: (m.sharesTotal + cost) * 3,
        stamps: newStamps,
        ledger: [
          {
            id: 'led-' + Date.now() + '-' + m.id,
            title: `Meeting #${vslaState.recentMeetingsCount + 1}: Bought ${n} Share(s)`,
            badge: 'SAVINGS',
            subtitle: `Wizard-recorded. Total: ${m.sharesCount + n} shares`,
            amountText: `+UGX ${cost.toLocaleString()}`,
            isPositive: true,
            date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          },
          ...m.ledger,
        ],
      };
    });
    persistState(
      withAudit(
        { ...vslaState, members: updatedMembers, boxCashBalance: vslaState.boxCashBalance + total, loanFundBalance: vslaState.loanFundBalance + total },
        currentUser.name,
        `Wizard: recorded shares for ${items.length} member(s)`,
        `Meeting #${vslaState.recentMeetingsCount + 1}`,
        total
      )
    );
  };

  const handleWizardWelfare = (memberIds: string[], amount: number) => {
    const set = new Set(memberIds);
    const total = memberIds.length * amount;
    const updatedMembers = vslaState.members.map((m) =>
      set.has(m.id)
        ? {
            ...m,
            welfareBalance: m.welfareBalance + amount,
            ledger: [
              {
                id: 'led-' + Date.now() + '-' + m.id,
                title: `Meeting #${vslaState.recentMeetingsCount + 1}: Welfare Contribution`,
                badge: 'WELFARE',
                subtitle: 'Wizard-recorded enkoba',
                amountText: `+UGX ${amount.toLocaleString()}`,
                isPositive: true,
                date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
              },
              ...m.ledger,
            ],
          }
        : m
    );
    persistState(
      withAudit(
        { ...vslaState, members: updatedMembers, boxCashBalance: vslaState.boxCashBalance + total, welfareFundBalance: vslaState.welfareFundBalance + total },
        currentUser.name,
        `Wizard: welfare collected from ${memberIds.length} member(s)`,
        `Meeting #${vslaState.recentMeetingsCount + 1}`,
        total
      )
    );
  };

  const handleWizardRepayments = (items: { memberId: string; amount: number }[]) => {
    const map = new Map(items.map((i) => [i.memberId, Math.max(0, Math.floor(i.amount))]));
    let total = 0;
    const changeNotes: string[] = [];
    const updatedMembers = vslaState.members.map((m) => {
      const amt = map.get(m.id) || 0;
      if (!amt) return m;
      const pay = Math.min(amt, m.loanBalance);
      const change = changeDue(amt, m.loanBalance);
      total += pay;
      if (change > 0) changeNotes.push(`${m.name} (#${m.no}): hand back UGX ${change.toLocaleString()}`);
      const newLoanBalance = m.loanBalance - pay;
      return {
        ...m,
        loanBalance: newLoanBalance,
        activeLoan: m.activeLoan
          ? { ...m.activeLoan, repaid: m.activeLoan.repaid + pay, balance: Math.max(0, m.activeLoan.balance - pay) }
          : undefined,
        ledger: [
          {
            id: 'led-' + Date.now() + '-' + m.id,
            title: `Meeting #${vslaState.recentMeetingsCount + 1}: Loan Repayment (Cash)`,
            badge: 'CASH',
            subtitle: `Wizard-recorded. Balance: UGX ${newLoanBalance.toLocaleString()}`,
            amountText: `+UGX ${pay.toLocaleString()}`,
            isPositive: true,
            date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          },
          ...m.ledger,
        ],
      };
    });
    persistState(
      withAudit(
        { ...vslaState, members: updatedMembers, boxCashBalance: vslaState.boxCashBalance + total, loanFundBalance: vslaState.loanFundBalance + total },
        currentUser.name,
        `Wizard: repayments from ${items.length} member(s)`,
        `Meeting #${vslaState.recentMeetingsCount + 1}${changeNotes.length > 0 ? ` · CHANGE DUE — ${changeNotes.join('; ')}` : ''}`,
        total
      )
    );
  };

  const handleWizardFines = (items: { memberNo: string; memberName: string; reason: string; amount: number; paid: boolean }[]) => {
    const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const newFines: PendingFine[] = items.map((f, i) => ({
      id: 'fine-' + Date.now() + '-' + i,
      memberNo: f.memberNo,
      memberName: f.memberName,
      reason: f.reason,
      amount: f.amount,
      timeNote: `Meeting #${vslaState.recentMeetingsCount + 1} · ${now}`,
      meetingRef: `Meeting #${vslaState.recentMeetingsCount + 1}`,
      status: f.paid ? ('collected' as const) : ('pending' as const),
    }));
    const paidTotal = items.filter((f) => f.paid).reduce((s, f) => s + f.amount, 0);
    persistState(
      withAudit(
        {
          ...vslaState,
          fines: [...newFines, ...vslaState.fines],
          boxCashBalance: vslaState.boxCashBalance + paidTotal,
          welfareFundBalance: vslaState.welfareFundBalance + paidTotal,
        },
        currentUser.name,
        `Wizard: levied ${items.length} fine(s) (${items.filter((f) => f.paid).length} paid now)`,
        `Meeting #${vslaState.recentMeetingsCount + 1}`,
        paidTotal
      )
    );
  };

  const handleWizardSales = (items: { productId: string; qty: number; unitPrice: number; buyer: string }[]) => {
    const products = vslaState.products || [];
    let revenue = 0;
    let profit = 0;
    const sales: any[] = [];
    const updatedProducts = products.map((p) => {
      const item = items.find((i) => i.productId === p.id);
      if (!item || p.sellerType !== 'group') return p;
      const qty = Math.min(Math.max(0, Math.floor(item.qty)), p.stockQty);
      if (qty <= 0) return p;
      const rev = qty * item.unitPrice;
      revenue += rev;
      profit += (item.unitPrice - p.costPrice) * qty;
      sales.push({
        id: 'sale-' + Date.now().toString(36) + '-' + p.id,
        productId: p.id,
        productName: p.name,
        sellerType: 'group',
        qty,
        unitPrice: item.unitPrice,
        costAtSale: p.costPrice,
        buyer: item.buyer,
        method: 'cash',
        timestamp: new Date().toISOString(),
      });
      return { ...p, stockQty: p.stockQty - qty, soldQty: p.soldQty + qty };
    });
    if (sales.length === 0) return;
    persistState(
      withAudit(
        {
          ...vslaState,
          products: updatedProducts,
          productSales: [...sales, ...(vslaState.productSales || [])],
          boxCashBalance: vslaState.boxCashBalance + revenue,
          loanFundBalance: vslaState.loanFundBalance + profit,
        },
        currentUser.name,
        `Wizard: meeting sales (${sales.length} product(s))`,
        `Meeting #${vslaState.recentMeetingsCount + 1} · revenue UGX ${revenue.toLocaleString()}`,
        revenue
      )
    );
  };

  const handleRequestWelfarePayout = (memberId: string, amount: number, reason: string) => {
    const member = vslaState.members.find((m) => m.id === memberId) || vslaState.members[0];
    const payout: ApprovalItem = {
      id: 'app-' + Date.now(),
      type: 'welfare_grant',
      reqNumber: 'Req #WF-' + Math.floor(100 + Math.random() * 900),
      timeText: 'Just now',
      memberName: member.name,
      memberNo: member.no,
      initiator: `${currentUser.name} (wizard)`,
      amount,
      status: 'pending',
      reason,
      welfareAvailable: vslaState.welfareFundBalance,
    };
    persistState(
      withAudit(
        { ...vslaState, approvals: [payout, ...vslaState.approvals] },
        currentUser.name,
        `Wizard: welfare payout requested ${payout.reqNumber}`,
        `${member.name} (#${member.no}) — ${reason}`,
        amount
      )
    );
  };

  const handleCompleteWizardMeeting = (countedCash: number, minutes: string) => {
    const meetingNo = vslaState.recentMeetingsCount + 1;
    const sealed: VSLAState = withAudit(
      { ...vslaState, recentMeetingsCount: meetingNo, boxCashBalance: countedCash },
      currentUser.name,
      `Wizard: sealed Meeting #${meetingNo} at UGX ${countedCash.toLocaleString()}`,
      minutes || 'No minutes recorded',
      countedCash
    );
    persistState(sealed);
    return sealed;
  };

  // Arrears automation: propose a standard late fine for a debtor
  const handleProposeArrearsFine = (member: Member) => {    handleLevyFine({
      id: 'fine-' + Date.now(),
      memberNo: member.no,
      memberName: member.name,
      reason: `Overdue loan balance UGX ${member.loanBalance.toLocaleString()} (auto-proposed)`,
      amount: LATE_FINE_AMOUNT,
      timeNote: 'Auto-proposed from Reports',
      meetingRef: `Meeting #${vslaState.recentMeetingsCount}`,
      status: 'pending',
    });
  };

  // ---- Shop / marketplace ----
  const handleAddProduct = (input: NewProductInput): string | null => {
    if (!input.name) return 'Give the product a name.';
    if (input.costPrice < 0 || input.salePrice <= 0) return 'Set a valid cost and sale price.';
    if (input.stockQty <= 0) return 'Stock quantity must be at least 1.';
    const stockCost = input.costPrice * input.stockQty;
    if (input.sellerType === 'group' && stockCost > vslaState.boxCashBalance) {
      return `Not enough box cash (UGX ${vslaState.boxCashBalance.toLocaleString()} < UGX ${stockCost.toLocaleString()}).`;
    }
    const product = {
      id: 'prod-' + Date.now().toString(36),
      name: input.name,
      sellerType: input.sellerType,
      sellerName: input.sellerName,
      costPrice: input.costPrice,
      salePrice: input.salePrice,
      stockQty: input.stockQty,
      soldQty: 0,
      unit: input.unit,
    };
    const expense = input.sellerType === 'group'
      ? [{ id: 'exp-' + Date.now().toString(36), label: `Stock purchase: ${input.name} × ${input.stockQty}`, amount: stockCost, timestamp: new Date().toISOString() }, ...(vslaState.productExpenses || [])]
      : vslaState.productExpenses || [];
    persistState(
      withAudit(
        {
          ...vslaState,
          products: [...(vslaState.products || []), product],
          productExpenses: expense,
          boxCashBalance: input.sellerType === 'group' ? vslaState.boxCashBalance - stockCost : vslaState.boxCashBalance,
        },
        currentUser.name,
        input.sellerType === 'group' ? `Bought group stock: ${input.name} × ${input.stockQty}` : `Listed member business: ${input.name}`,
        input.sellerType === 'group' ? `Cost UGX ${stockCost.toLocaleString()} from box cash` : (input.sellerName || ''),
        input.sellerType === 'group' ? stockCost : undefined
      )
    );
    return null;
  };

  const handleSellProduct = (sale: SaleInput) => {
    const product = (vslaState.products || []).find((p) => p.id === sale.productId);
    if (!product) return;
    const qty = Math.min(Math.max(0, Math.floor(sale.qty)), product.stockQty);
    if (qty <= 0) return;
    const revenue = qty * sale.unitPrice;
    const profit = (sale.unitPrice - product.costPrice) * qty;
    const isGroup = product.sellerType === 'group';
    const updatedProducts = (vslaState.products || []).map((p) =>
      p.id === product.id ? { ...p, stockQty: p.stockQty - qty, soldQty: p.soldQty + qty } : p
    );
    const record = {
      id: 'sale-' + Date.now().toString(36),
      productId: product.id,
      productName: product.name,
      sellerType: product.sellerType,
      qty,
      unitPrice: sale.unitPrice,
      costAtSale: product.costPrice,
      buyer: sale.buyer,
      method: sale.method,
      timestamp: new Date().toISOString(),
    };
    persistState(
      withAudit(
        {
          ...vslaState,
          products: updatedProducts,
          productSales: [record, ...(vslaState.productSales || [])],
          boxCashBalance: isGroup ? vslaState.boxCashBalance + revenue : vslaState.boxCashBalance,
          loanFundBalance: isGroup ? vslaState.loanFundBalance + profit : vslaState.loanFundBalance,
        },
        currentUser.name,
        `Sold ${qty} × ${product.name} to ${sale.buyer} (${sale.method})`,
        isGroup ? `Revenue UGX ${revenue.toLocaleString()} · profit UGX ${profit.toLocaleString()} to loan fund` : 'Member business sale (no fund movement)',
        revenue
      )
    );
  };

  const handleAddExpense = (label: string, amount: number) => {
    const amt = Math.min(Math.max(0, Math.floor(amount)), vslaState.boxCashBalance);
    if (amt <= 0) return;
    persistState(
      withAudit(
        {
          ...vslaState,
          productExpenses: [{ id: 'exp-' + Date.now().toString(36), label, amount: amt, timestamp: new Date().toISOString() }, ...(vslaState.productExpenses || [])],
          boxCashBalance: vslaState.boxCashBalance - amt,
        },
        currentUser.name,
        `Shop expense: ${label}`,
        'Paid from box cash',
        amt
      )
    );
  };

  // ---- Member registration (MEM numbers, kin, account) ----
  const handleRegisterMember = (input: NewMemberInput): string | null => {
    const first = input.firstName.trim();
    const last = input.lastName.trim();
    if (!first || !last) return 'First and last name are required.';
    // Gap 2a: phoneless members exist. Phone optional — validated only if given.
    const digits = input.phone.replace(/\D/g, '');
    if (digits.length > 0 && digits.length < 9) return 'Enter a valid phone number.';
    const phone = digits.length >= 9 ? input.phone.trim() : '';
    const name = `${first} ${last}`;
    if (vslaState.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
      return 'A member with this name already exists.';
    }
    const nextNo = vslaState.members.length + 1;
    const no = nextNo < 10 ? `0${nextNo}` : `${nextNo}`;
    const memNumber = `MEM-${String(nextNo).padStart(4, '0')}`;
    const memberId = `m-${Date.now().toString(36)}`;
    const initials = (first[0] + (last[0] || '')).toUpperCase();
    const newMember: Member = {
      id: memberId,
      no,
      memNumber,
      name,
      initials,
      zone: input.village.trim() || 'General',
      phone: phone || '—',
      provider: input.provider,
      photoUrl: input.photoUrl || undefined,
      nationalId: input.nationalId.trim() || undefined,
      business: input.business.trim() || undefined,
      kinName: input.kinName.trim() || undefined,
      kinPhone: input.kinPhone.trim() || undefined,
      guarantorName: input.guarantorName.trim() || undefined,
      guarantorPhone: input.guarantorPhone.trim() || undefined,
      attendance: '1/1',
      sharesCount: 0,
      sharesTotal: 0,
      maxBorrowLimit: 0,
      loanBalance: 0,
      welfareBalance: 0,
      isKeyholder: false,
      stamps: [{ week: vslaState.recentMeetingsCount + 1, shares: 0, status: 'next' }],
      ledger: [
        {
          id: 'led-reg-' + Date.now().toString(36),
          meetingNo: vslaState.recentMeetingsCount + 1,
          meetingCode: 'REG',
          title: `Registered as ${memNumber}`,
          badge: 'MEMBER',
          subtitle: `Kin: ${input.kinName.trim() || '-'} (${input.kinPhone.trim() || '-'}) · Guarantor: ${input.guarantorName.trim() || '-'} (${input.guarantorPhone.trim() || '-'})${input.business.trim() ? ` · ${input.business.trim()}` : ''}${input.nationalId.trim() ? ` · ID ${input.nationalId.trim()}` : ''}`,
          amountText: 'UGX 0',
          isPositive: true,
          extraText: '',
          date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        },
      ],
    };
    const newAccount: UserAccount = {
      id: `acc-${Date.now().toString(36)}`,
      memberId,
      memberNo: no,
      name,
      phone,
      provider: input.provider,
      role: 'member',
      roleTitle: `Member #${no}`,
      zone: input.village.trim() || 'General Member',
      pin: '1234',
      avatarInitials: initials,
      avatarBg: 'bg-teal-700',
      nationalId: input.nationalId.trim(),
      permissions: { canLockBox: false, canApproveLoans: false, canDisburseWelfare: false, canRecordShares: false, canRequestLoan: true, canManageBackups: false },
    };
    persistState(
      withAudit(
        {
          ...vslaState,
          members: [...vslaState.members, newMember],
          availableAccounts: [...(vslaState.availableAccounts || []), newAccount],
        },
        currentUser.name,
        `Registered member ${memNumber}`,
        `${name} (#${no}) · default PIN 1234 — ask them to change it`,
        undefined
      )
    );
    setSelectedMemberId(memberId);
    return null;
  };

  // ---- Group settings (name, box, share price, welfare, cycle) ----
  const handleUpdateGroupSettings = (patch: GroupSettingsPatch) => {
    persistState(
      withAudit(
        {
          ...vslaState,
          groupName: patch.groupName,
          boxIdentifier: patch.boxIdentifier,
          totalCycleMonths: patch.totalCycleMonths,
          groupProfile: {
            ...(vslaState.groupProfile || {
              id: currentGroupId,
              name: patch.groupName,
              boxIdentifier: patch.boxIdentifier,
              inviteCode: vslaState.inviteCode || 'BAK-4290',
              plan: 'pro' as const,
              createdAt: new Date().toISOString(),
              adminName: currentUser.name,
              adminPhone: currentUser.phone,
            }),
            name: patch.groupName,
            boxIdentifier: patch.boxIdentifier,
            location: patch.location,
            meetingDay: patch.meetingDay,
            sharePrice: patch.sharePrice,
            welfareMonthly: patch.welfareMonthly,
          },
        },
        currentUser.name,
        'Updated group settings',
        `${patch.groupName} · ${patch.boxIdentifier} · share UGX ${patch.sharePrice.toLocaleString()}`,
        undefined
      )
    );
    setSelectedBox(`${patch.groupName} • ${patch.boxIdentifier}`);
  };

  const selectedMember =
    vslaState.members.find((m) => m.id === selectedMemberId) || vslaState.members[0];

  // PIN gate: when the server enforces auth, no app content without a session.
  if (authEnforced && !sessionToken) {
    return (
      <div className="min-h-screen bg-canvas-bg text-on-surface flex flex-col font-sans">
        <LoginView
          key={loginPreselectId || 'login'}
          accounts={vslaState.availableAccounts || SEED_ACCOUNTS}
          groupName={vslaState.groupName || vslaState.groupProfile?.name || 'Bakwata Savings Group'}
          boxIdentifier={vslaState.boxIdentifier || vslaState.groupProfile?.boxIdentifier || 'BOX-KLA-042'}
          groupId={currentGroupId}
          initialAccountId={loginPreselectId}
          onLogin={handleLogin}
        />
      </div>
    );
  }

  const showLocalOnlyBanner = storageDriver !== null && storageShared === false;
  const t = getTranslations(language);

  return (
    <div className={`min-h-screen bg-canvas-bg text-on-surface flex flex-col font-sans selection:bg-secondary/20 ${elderMode ? 'elder-mode' : ''} ${sunlightMode ? 'sunlight-mode' : ''}`}>
      {/* Village accessibility bar: big-text + sunlight + public display + simple/advanced */}
      <div className="bg-primary text-white text-[11px] font-bold px-3 py-1.5 flex items-center justify-center gap-2 no-print flex-wrap">
        <button
          type="button"
          onClick={() => {
            const next = !simpleMode;
            setSimpleMode(next);
            try {
              localStorage.setItem('vsla_simple_mode', next ? '1' : '0');
            } catch {}
          }}
          className={`px-2 py-1 rounded border ${simpleMode ? 'bg-[#EAB308] text-[#00261b] border-[#EAB308]' : 'border-white/40'}`}
          title={simpleMode ? t.a11y.advanced : t.a11y.simple}
        >
          {simpleMode ? `✓ ${t.a11y.simple}` : t.a11y.advanced}
        </button>
        <button
          type="button"
          onClick={() => {
            const next = !elderMode;
            setElderMode(next);
            try {
              localStorage.setItem('vsla_elder_mode', next ? '1' : '0');
            } catch {}
          }}
          className={`px-2 py-1 rounded border ${elderMode ? 'bg-[#EAB308] text-[#00261b] border-[#EAB308]' : 'border-white/40'}`}
          title={t.a11y.bigText}
        >
          {elderMode ? `✓ ${t.a11y.bigText}` : t.a11y.bigText}
        </button>
        <button
          type="button"
          onClick={() => {
            const next = !sunlightMode;
            setSunlightMode(next);
            try {
              localStorage.setItem('vsla_sunlight_mode', next ? '1' : '0');
            } catch {}
          }}
          className={`px-2 py-1 rounded border ${sunlightMode ? 'bg-white text-black border-white' : 'border-white/40'}`}
          title={t.a11y.sunlight}
        >
          {sunlightMode ? `✓ ${t.a11y.sunlight}` : t.a11y.sunlight}
        </button>
        <button
          type="button"
          onClick={() => setIsPublicDisplayOpen(true)}
          className="px-2 py-1 rounded border border-[#EAB308] text-[#EAB308]"
          title={t.a11y.publicDisplay}
        >
          {t.a11y.publicDisplay}
        </button>
      </div>
      {vslaState.pendingSync && (
        <div className="bg-blue-50 border-b border-blue-200 text-blue-900 text-[11px] font-bold px-4 py-1.5 text-center flex items-center justify-center gap-2 flex-wrap">
          <span>
            {language === 'LU'
              ? 'Ekibiina kino tekinnatuuka ku mutimbagano — kikolebwa ku ssimu eno yokka.'
              : 'This group is saved on this phone only — not yet synced.'}
          </span>
          <button
            type="button"
            onClick={() => syncPendingGroup()}
            className="underline font-bold"
          >
            {language === 'LU' ? 'Gezaako okusindika kati' : 'Try sync now'}
          </button>
        </div>
      )}
      {showLocalOnlyBanner && (
        <div className="bg-amber-100 border-b border-amber-300 text-amber-900 text-[11px] font-bold px-4 py-1.5 text-center">
          Records stay on this phone only — connect the shared database (DATABASE_URL) so all officers see the same ledger.
        </div>
      )}
      {currentUser.pin === '1234' && (
        <div className="bg-red-50 border-b border-red-200 text-red-800 text-[11px] font-bold px-4 py-1.5 text-center">
          You use the default PIN 1234.{' '}
          <button type="button" onClick={() => setIsAccountModalOpen(true)} className="underline">
            Change it now
          </button>
        </div>
      )}
      {/* Universal Top App Bar */}
      <TopAppBar
        language={language}
        onToggleLanguage={handleToggleLanguage}
        onSelectLanguage={handleSelectLanguage}
        pendingApprovalsCount={pendingApprovalsCount}
        selectedBox={selectedBox}
        onSelectBox={setSelectedBox}
        onOpenNotifications={() => handleNavigateScreen('approvals')}
        onOpenBackup={() => handleNavigateScreen('backup')}
        currentUser={currentUser}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
        isOnline={isServerConnected}
        availableGroups={availableGroups}
        currentGroupId={currentGroupId}
        onSelectGroup={handleSelectGroup}
        onOpenGroupModal={(tab) => {
          setGroupModalDefaultTab(tab || 'directory');
          setIsGroupModalOpen(true);
        }}
        onOpenShareInvite={() => setIsShareInviteOpen(true)}
        simpleMode={simpleMode}
      />

      {/* Screen Router */}
      <div className="flex-1 flex flex-col">
        {currentScreen === 'home' && (
          <HomeView
            onNavigate={handleNavigateScreen}
            pendingApprovalsCount={pendingApprovalsCount}
            boxCashBalance={vslaState.boxCashBalance}
            loanFundBalance={vslaState.loanFundBalance}
            welfareFundBalance={vslaState.welfareFundBalance}
            recentMeetingsCount={vslaState.recentMeetingsCount}
            totalMembersCount={vslaState.members.length}
            currentUser={currentUser}
            onOpenAccountModal={() => setIsAccountModalOpen(true)}
            activePreset={vslaState.activePreset}
            groupName={vslaState.groupName || vslaState.groupProfile?.name || 'Bakwata Savings Group'}
            boxIdentifier={vslaState.boxIdentifier || vslaState.groupProfile?.boxIdentifier || 'BOX-KLA-042'}
            inviteCode={vslaState.inviteCode || vslaState.groupProfile?.inviteCode || 'BAK-4290'}
            onOpenGroupModal={(tab) => {
              setGroupModalDefaultTab(tab || 'directory');
              setIsGroupModalOpen(true);
            }}
            onOpenShareInvite={() => setIsShareInviteOpen(true)}
            language={language}
            simpleMode={simpleMode}
          />
        )}

        {currentScreen === 'backup' && (
          <BackupAuditView
            state={vslaState}
            onNavigate={handleNavigateScreen}
            onRestoreState={handleRestoreState}
            onCreateSnapshot={handleCreateSnapshot}
            onResetToBaseline={handleResetToBaseline}
            onRefreshFromServer={fetchStateFromServer}
          />
        )}

        {currentScreen === 'legal' && (
          <LegalView
            onNavigate={handleNavigateScreen}
            language={language}
            groupName={vslaState.groupName || vslaState.groupProfile?.name || 'Bakwata Savings Group'}
          />
        )}

        {currentScreen === 'reports' && (
          <ReportsView
            state={vslaState}
            onNavigate={handleNavigateScreen}
            onProposeFine={handleProposeArrearsFine}
            language={language}
          />
        )}

        {currentScreen === 'about' && (
          <AboutView
            onNavigate={handleNavigateScreen}
            language={language}
            groupName={vslaState.groupName || vslaState.groupProfile?.name || 'Bakwata Savings Group'}
          />
        )}

        {currentScreen === 'help' && (
          <HelpView onNavigate={handleNavigateScreen} language={language} />
        )}

        {currentScreen === 'shop' && (
          <ShopView
            products={vslaState.products || []}
            boxCashBalance={vslaState.boxCashBalance}
            onNavigate={handleNavigateScreen}
            onAddProduct={handleAddProduct}
            onSell={handleSellProduct}
            onAddExpense={handleAddExpense}
            language={language}
          />
        )}

        {currentScreen === 'users' && (
          <UsersView
            accounts={vslaState.availableAccounts || SEED_ACCOUNTS}
            currentUserId={currentUser.id}
            authEnforced={authEnforced}
            onSwitchAccount={handleSwitchAccount}
            onLogout={handleLogout}
            onNavigate={handleNavigateScreen}
          />
        )}

        {currentScreen === 'group_settings' && (
          <GroupSettingsView
            groupName={vslaState.groupName || vslaState.groupProfile?.name || 'Bakwata Savings Group'}
            boxIdentifier={vslaState.boxIdentifier || vslaState.groupProfile?.boxIdentifier || 'BOX-KLA-042'}
            location={vslaState.groupProfile?.location || 'Kalerwe Market, Kawempe'}
            meetingDay={vslaState.groupProfile?.meetingDay || 'Every Friday 4:00 PM'}
            sharePrice={vslaState.groupProfile?.sharePrice || 10000}
            welfareMonthly={vslaState.groupProfile?.welfareMonthly || 5000}
            totalCycleMonths={vslaState.totalCycleMonths || 10}
            inviteCode={vslaState.inviteCode || vslaState.groupProfile?.inviteCode || 'BAK-4290'}
            membersCount={vslaState.members.length}
            onSave={handleUpdateGroupSettings}
            onNavigate={handleNavigateScreen}
          />
        )}

        {currentScreen === 'meeting_wizard' && (
          <MeetingWizardView
            members={vslaState.members}
            products={vslaState.products || []}
            meetingNo={vslaState.recentMeetingsCount + 1}
            sharePrice={vslaState.groupProfile?.sharePrice || 10000}
            welfareAmount={vslaState.groupProfile?.welfareMonthly || 5000}
            expectedCash={vslaState.boxCashBalance}
            language={language}
            onNavigate={handleNavigateScreen}
            onExit={() => handleNavigateScreen('home')}
            onRecordSharesBulk={handleWizardShares}
            onCollectWelfareBulk={handleWizardWelfare}
            onRequestWelfarePayout={handleRequestWelfarePayout}
            onRecordRepaymentsBulk={handleWizardRepayments}
            onSubmitLoan={handleSubmitNewLoan}
            onRecordFinesBulk={handleWizardFines}
            onRecordSalesBulk={handleWizardSales}
            onCompleteMeeting={handleCompleteWizardMeeting}
            onDownloadBackup={(sealed) => downloadBackupFile(sealed)}
            onAdjustDiscrepancy={handleDiscrepancyAdjustment}
            currentUserName={currentUser.name}
          />
        )}

        {currentScreen === 'meeting_close' && (
          <MeetingCloseBoxView
            onOpenDiscrepancyModal={() => setIsDiscrepancyModalOpen(true)}
            onNavigate={handleNavigateScreen}
            expectedTotal={vslaState.boxCashBalance}
            meetingNumber={vslaState.recentMeetingsCount}
            onCompleteMeeting={(countedCash) => {
              persistState({
                ...vslaState,
                recentMeetingsCount: vslaState.recentMeetingsCount + 1,
                boxCashBalance: countedCash,
              });
            }}
          />
        )}

        {currentScreen === 'approvals' && (
          <ApprovalsQueueView
            approvals={vslaState.approvals}
            onApprove={handleApproveItem}
            onReject={handleRejectItem}
            dualAuth={authEnforced}
            currentUserName={currentUser.name}
          />
        )}

        {currentScreen === 'member_passbook' && (
          <MemberPassbookView
            members={vslaState.members}
            selectedMember={selectedMember}
            onSelectMember={setSelectedMemberId}
            onNavigate={handleNavigateScreen}
            onRecordRepayment={handleRecordRepaymentInPassbook}
            onBuyShares={handleBuyShares}
            onAddMember={() => setIsAddMemberOpen(true)}
            language={language}
            groupName={vslaState.groupName || vslaState.groupProfile?.name || 'Bakwata Savings Group'}
            boxIdentifier={vslaState.boxIdentifier || vslaState.groupProfile?.boxIdentifier || 'BOX-KLA-042'}
            issuerName={currentUser.name}
          />
        )}

        {currentScreen === 'momo_push' && (
          <MoMoPushView
            onNavigate={handleNavigateScreen}
            onSuccessTransaction={handleMoMoSuccess}
          />
        )}

        {currentScreen === 'new_loan' && (
          <NewLoanRequestView
            members={vslaState.members}
            onNavigate={handleNavigateScreen}
            onSubmitLoan={handleSubmitNewLoan}
          />
        )}

        {currentScreen === 'share_out' && (
          <CycleShareOutView
            members={vslaState.members}
            loanFundBalance={vslaState.loanFundBalance}
            finesCollected={
              vslaState.fines
                .filter((f) => f.status === 'collected')
                .reduce((sum, f) => sum + f.amount, 0) || 750000
            }
            onNavigate={handleNavigateScreen}
            onExecuteShareOut={handleExecuteShareOut}
          />
        )}

        {currentScreen === 'welfare_fund' && (
          <WelfareFundView
            welfareBalance={vslaState.welfareFundBalance}
            grants={vslaState.welfareGrants}
            members={vslaState.members}
            onDisburseGrant={handleDisburseWelfareGrant}
            onNavigate={handleNavigateScreen}
          />
        )}

        {currentScreen === 'audio_broadcast' && (
          <AudioBroadcastView
            onNavigate={handleNavigateScreen}
            boxCashBalance={vslaState.boxCashBalance}
            meetingNumber={vslaState.recentMeetingsCount}
            membersCount={vslaState.members.length}
          />
        )}

        {currentScreen === 'constitution_fines' && (
          <ConstitutionFinesView
            fines={vslaState.fines}
            onCollectFine={handleCollectFine}
            onWaiveFine={handleWaiveFine}
            onLevyFine={handleLevyFine}
            onNavigate={handleNavigateScreen}
            language={language}
          />
        )}
      </div>

      {/* Cash Discrepancy Modal */}
      <CashDiscrepancyModal
        isOpen={isDiscrepancyModalOpen}
        onClose={() => setIsDiscrepancyModalOpen(false)}
        onApplyAdjustment={handleDiscrepancyAdjustment}
      />

      {/* Actual Account Profile & Switcher Modal */}
      <AccountProfileModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        currentUser={currentUser}
        availableAccounts={vslaState.availableAccounts || SEED_ACCOUNTS}
        members={vslaState.members}
        groupId={currentGroupId}
        authEnforced={authEnforced}
        onSwitchAccount={handleSwitchAccount}
        onLogout={handleLogout}
        onChangePin={handleChangePin}
        onSelectPreset={handleSelectPreset}
        onResetToBaseline={handleResetToBaseline}
        onNavigate={handleNavigateScreen}
        onSelectMember={(id) => {
          setSelectedMemberId(id);
          handleNavigateScreen('member_passbook');
        }}
      />

      {/* SaaS Group Onboarding & Directory Modal */}
      <GroupOnboardingModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        availableGroups={availableGroups}
        currentGroupId={currentGroupId}
        onSelectGroup={handleSelectGroup}
        onCreateGroup={handleCreateGroup}
        onJoinGroup={handleJoinGroup}
        defaultTab={groupModalDefaultTab}
      />

      {/* Member Invite Kit Modal */}
      <ShareInviteModal
        isOpen={isShareInviteOpen}
        onClose={() => setIsShareInviteOpen(false)}
        groupName={vslaState.groupName || vslaState.groupProfile?.name || 'Bakwata Savings Group'}
        boxIdentifier={vslaState.boxIdentifier || vslaState.groupProfile?.boxIdentifier || 'BOX-KLA-042'}
        inviteCode={vslaState.inviteCode || vslaState.groupProfile?.inviteCode || 'BAK-4290'}
        location={vslaState.groupProfile?.location || 'Kalerwe Market, Kawempe'}
      />

      {/* Member Registration Modal (MEM numbers, kin/guarantor) */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onRegister={handleRegisterMember}
        language={language}
        nextMemNumber={`MEM-${String(vslaState.members.length + 1).padStart(4, '0')}`}
        nextMemberNo={vslaState.members.length + 1 < 10 ? `0${vslaState.members.length + 1}` : `${vslaState.members.length + 1}`}
      />

      {/* First-run tour + What's-new sheet */}
      {showTour && <OnboardingTour language={language} onDone={dismissTour} />}
      {!showTour && showWhatsNew && <WhatsNewModal onClose={dismissWhatsNew} />}

      <PublicDisplayModal
        isOpen={isPublicDisplayOpen}
        onClose={() => setIsPublicDisplayOpen(false)}
        state={vslaState}
      />

      {/* Universal Sticky Bottom Navigation Bar */}
      <BottomNavBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingApprovalsCount={pendingApprovalsCount}
        onNavigateScreen={handleNavigateScreen}
        language={language}
        simpleMode={simpleMode}
      />
    </div>
  );
}

export default App;
