import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import {
  ApprovalItem,
  AppNotification,
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
  SurplusResolution,
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
import { MemberHomeView } from './views/MemberHomeView';
import { fundBalances, totalFunds, transferError, applyTransfer, FundLocation } from './utils/fundLocations';
// Cheap-phone rule: only the two home screens ship in the first download.
// Every other screen lazy-loads on first visit (one small chunk each).
const MeetingCloseBoxView = lazy(() => import('./views/MeetingCloseBoxView').then((m) => ({ default: m.MeetingCloseBoxView })));
const ApprovalsQueueView = lazy(() => import('./views/ApprovalsQueueView').then((m) => ({ default: m.ApprovalsQueueView })));
const MemberPassbookView = lazy(() => import('./views/MemberPassbookView').then((m) => ({ default: m.MemberPassbookView })));
const MoMoPushView = lazy(() => import('./views/MoMoPushView').then((m) => ({ default: m.MoMoPushView })));
const NewLoanRequestView = lazy(() => import('./views/NewLoanRequestView').then((m) => ({ default: m.NewLoanRequestView })));
const CycleShareOutView = lazy(() => import('./views/CycleShareOutView').then((m) => ({ default: m.CycleShareOutView })));
const WelfareFundView = lazy(() => import('./views/WelfareFundView').then((m) => ({ default: m.WelfareFundView })));
const AudioBroadcastView = lazy(() => import('./views/AudioBroadcastView').then((m) => ({ default: m.AudioBroadcastView })));
const ConstitutionFinesView = lazy(() => import('./views/ConstitutionFinesView').then((m) => ({ default: m.ConstitutionFinesView })));
const BackupAuditView = lazy(() => import('./views/BackupAuditView').then((m) => ({ default: m.BackupAuditView })));
const LegalView = lazy(() => import('./views/LegalView').then((m) => ({ default: m.LegalView })));
const MeetingWizardView = lazy(() => import('./views/MeetingWizardView').then((m) => ({ default: m.MeetingWizardView })));
const ShopView = lazy(() => import('./views/ShopView').then((m) => ({ default: m.ShopView })));
const UsersView = lazy(() => import('./views/UsersView').then((m) => ({ default: m.UsersView })));
const GroupSettingsView = lazy(() => import('./views/GroupSettingsView').then((m) => ({ default: m.GroupSettingsView })));
const ReportsView = lazy(() => import('./views/ReportsView').then((m) => ({ default: m.ReportsView })));
const AboutView = lazy(() => import('./views/AboutView').then((m) => ({ default: m.AboutView })));
const HelpView = lazy(() => import('./views/HelpView').then((m) => ({ default: m.HelpView })));
const NotificationsView = lazy(() => import('./views/NotificationsView').then((m) => ({ default: m.NotificationsView })));
import type { NewProductInput, SaleInput } from './views/ShopView';
import type { ApprovalCodeResult } from './views/ApprovalsQueueView';
import type { GroupSettingsPatch } from './views/GroupSettingsView';
import { AddMemberModal, NewMemberInput } from './components/AddMemberModal';
import { OnboardingTour, ONBOARDING_KEY, SEEN_VERSION_KEY } from './components/OnboardingTour';
import { WhatsNewModal } from './components/WhatsNewModal';
import { APP_VERSION } from './data/changelog';
import { withAudit } from './utils/audit';
import { appendNotifications, markNotificationsRead, notificationsFor, unreadNotificationCount } from './utils/notifications';
import { getTranslations } from './i18n/translations';
import { shareClassesFor } from './utils/sacco';
import { addSaccoFunds, policyFor, resolutionFor } from './utils/surplus';
import {
  OfficerChangeRequest,
  applyPending,
  buildPending,
  canManageOfficers,
  checkOfficerChange,
  pendingStillValid,
} from './utils/officers';
import { appliedRepayment, changeDue, groupSharePrice, LATE_FINE_AMOUNT, WELFARE_FAST_TRACK_CAP, memberCapForPlan, sharePurchaseLedgerFields, welfareNeedsQueue } from './utils/policy';
import { downloadBackupFile, redactBackupState } from './utils/backupFile';
import {
  buildLocalGroup,
  clearPendingGroup,
  loadPendingGroup,
  savePendingGroup,
} from './utils/offlineGroup';
import { ShareOutResult } from './utils/shareout';
import { buildPracticeState, isPracticeGroup, popStashedGroup, PRACTICE_GROUP_ID, stashRealGroup } from './utils/practiceGroup';
import { readEntryIntent, stripEntryIntent, type EntryIntent } from './utils/entryIntent';
import {
  ShareOutKeyResult,
  firstKeyShareOut,
  firstKeyUpdate,
  isSameOfficer,
  sameName,
  secondKeyShareOut,
  shareOutForCycle,
  twoKeyPossible,
  verifyOfficerKey,
} from './utils/dualApproval';
import { mergePhotosIntoRestored, stripPhotosForSnapshot } from './utils/photo';
import { isDefaultPin } from './utils/pin';
import { hasPermission, permissionRefusal } from './utils/permissions';
import { PublicDisplayModal } from './components/PublicDisplayModal';
import { WelcomeView } from './components/WelcomeView';
import { DefaultPinGate } from './components/DefaultPinGate';
import { LanguagePicker } from './components/LanguagePicker';
import { BootSplash } from './components/BootSplash';
import { LoginView } from './views/LoginView';
import { apiFetch, approveWithCodeRemote, changePinRequest, createLoanRequestRemote, fetchAuthStatus, getSessionToken, requestApprovalCodeRemote, sessionGroupId, setSessionToken } from './utils/api';

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
  const [discrepancyDetails, setDiscrepancyDetails] = useState<{ expectedTotal: number; countedTotal: number; meetingNumber: number; difference: number } | null>(null);
  const [selectedBox, setSelectedBox] = useState('Practice Group — play money');
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
  // Members land on their own account; officers see the group home.
  // Members can peek at the group home via a quiet link (resets on switch).
  const [showGroupHome, setShowGroupHome] = useState(false);
  // Simple Mode: 3 giant buttons, 4 tabs, no SaaS jargon. ON unless explicitly off.
  const [simpleMode, setSimpleMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vsla_simple_mode') !== '0';
    } catch {
      return true;
    }
  });
  // First-run language picker: show once until the user chooses.
  const [langChosen, setLangChosen] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem('vsla_lang');
    } catch {
      return true;
    }
  });

  // Display toggles: defaults are the easy ones (simple view + big text ON).
  // They are only reachable from the top-bar menu, so nobody trips over them.
  const persistFlag = (key: string, next: boolean) => {
    try {
      localStorage.setItem(key, next ? '1' : '0');
    } catch {}
  };
  const toggleSimpleMode = () => {
    const next = !simpleMode;
    setSimpleMode(next);
    persistFlag('vsla_simple_mode', next);
  };
  const toggleElderMode = () => {
    const next = !elderMode;
    setElderMode(next);
    persistFlag('vsla_elder_mode', next);
  };
  const toggleSunlightMode = () => {
    const next = !sunlightMode;
    setSunlightMode(next);
    persistFlag('vsla_sunlight_mode', next);
  };

  // Multi-Tenant SaaS State
  const [currentGroupId, setCurrentGroupId] = useState<string>(() => {
    try {
      const pointer = localStorage.getItem('bakwata_active_group_id');
      if (pointer) return pointer;
      const cached = JSON.parse(localStorage.getItem('bakwata_vsla_state') || 'null');
      return cached?.groupId || PRACTICE_GROUP_ID;
    } catch (e) {
      return PRACTICE_GROUP_ID;
    }
  });
  const [availableGroups, setAvailableGroups] = useState<GroupSummary[]>([]);
  // Groups signed in on THIS phone (id → name + session token). The switcher
  // and directory only ever offer these — strangers' groups are unreachable.
  const [knownGroups, setKnownGroups] = useState<Record<string, { name: string; token: string }>>(() => {
    try {
      return JSON.parse(localStorage.getItem('bakwata_known_groups') || '{}');
    } catch {
      return {};
    }
  });
  const visibleGroups = availableGroups.filter((g) => g.id === currentGroupId || knownGroups[g.id]);
  const rememberSession = (gid: string, name: string) => {
    const token = getSessionToken();
    if (!token) return;
    setKnownGroups((prev) => {
      const next = { ...prev, [gid]: { name, token } };
      try {
        localStorage.setItem('bakwata_known_groups', JSON.stringify(next));
      } catch {}
      return next;
    });
  };
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
    return buildPracticeState();
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
      } else if (res.status === 401) {
        // Dead/foreign session: drop it so the welcome gate appears instead
        // of a PIN screen for an account that isn't yours.
        setSessionToken(null);
        setSessionTokenState(null);
      }
    } catch (err) {
      console.warn('Could not fetch groups list:', err);
    }
  }, []);

  // Fetch state for a specific group from server
  const fetchStateFromServer = useCallback(async (targetGroupId?: string) => {
    const gid = targetGroupId || currentGroupId || 'bakwata-01';
    // Practice group lives only on this phone — never fetch/overwrite from server.
    if (isPracticeGroup(gid)) {
      setIsSyncing(false);
      return;
    }
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
           setSelectedBox(`${data.state.groupName || 'Savings Group'} • ${data.state.boxIdentifier || 'BOX'}`);
          try {
            localStorage.setItem('bakwata_vsla_state', JSON.stringify(data.state));
            localStorage.setItem('bakwata_active_group_id', gid);
          } catch (e) {}
           setIsServerConnected(true);
         }
       } else {
         setIsServerConnected(false);
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
      localStorage.setItem(isPracticeGroup(currentGroupId) ? 'vsla_practice_state_v1' : 'bakwata_vsla_state', JSON.stringify(nextState));
    } catch (e) {
      console.warn('LocalStorage write error:', e);
    }

    // Practice group never touches the server — play money stays on this phone.
    if (isPracticeGroup(currentGroupId)) {
      setIsSyncing(false);
      return;
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
      } else if (res.status === 403) {
        // Forbidden (e.g. member rank) still proves the server is reachable.
        setIsServerConnected(true);
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
    if (groupId === currentGroupId) return;
    // You can only enter groups signed in on this phone — the directory never
    // offers strangers' groups, and the server would 403 them anyway.
    const known = knownGroups[groupId];
    if (!known?.token) return;
    setSessionToken(known.token);
    setSessionTokenState(known.token);
    setShowGroupHome(false);
    setCurrentGroupId(groupId);
    try {
      localStorage.setItem('bakwata_active_group_id', groupId);
    } catch (e) {}
    await fetchStateFromServer(groupId);
  };

  // Sign in with fresh credentials (welcome gate: just registered/joined).
  // Returns true when a session token was stored.
  const loginWithCredentials = async (groupId: string, accountId: string, pin: string, groupName?: string): Promise<boolean> => {
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, accountId, pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) {
        setSessionToken(data.token);
        setSessionTokenState(data.token);
        rememberSession(groupId, groupName || data.account?.groupName || groupId);
        return true;
      }
    } catch {
      /* offline — caller keeps local flow */
    }
    return false;
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
        // Sessionless (welcome gate): sign straight in with the PIN just set.
        if (!getSessionToken() && data.account?.id) {
          await loginWithCredentials(data.groupId, data.account.id, payload.adminPin, data.group?.name);
        }
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

    const handleJoinGroup = async (payload: JoinGroupPayload) => {    try {
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
        // Sessionless (welcome gate): sign straight in with the PIN just set.
        if (!getSessionToken() && data.account?.id) {
          await loginWithCredentials(data.groupId, data.account.id, payload.pin, data.groupName);
        }
        return { success: true, groupName: data.groupName, memberNo: data.memberNo };
      } else {
        return { success: false, error: data.error || 'Failed to join savings group' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  // Recovery for interrupted setup: a group saved on THIS phone (online or
  // offline) can be resumed — its invite code is shown so it is never lost.
  // Seed demo data never qualifies; only groups with a local login or an
  // unsynced offline registration. A stale group pointer heals to the state.
  const SEED_GROUP_IDS = ['bakwata-01', 'kibuli-01'];
  const readKnownGroupsStore = (): Record<string, { name: string; token: string }> => {
    try {
      return JSON.parse(localStorage.getItem('bakwata_known_groups') || '{}');
    } catch {
      return {};
    }
  };
  const readLocalGroup = (): { groupId: string; groupName: string; inviteCode: string; pendingSync: boolean } | null => {
    try {
      const raw = localStorage.getItem('bakwata_vsla_state');
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || typeof s.groupId !== 'string' || isPracticeGroup(s.groupId)) return null;
      if (!Array.isArray(s.members)) return null;
      if (SEED_GROUP_IDS.includes(s.groupId)) return null;
      const stored = readKnownGroupsStore();
      const pointer = (() => { try { return localStorage.getItem('bakwata_active_group_id'); } catch { return null; } })();
      // Interrupted switch (pointer aims elsewhere): the loaded books win.
      const stranded = !!pointer && pointer !== s.groupId;
      if (!s.pendingSync && !stored[s.groupId]?.token && !stranded) return null;
      try {
        if (localStorage.getItem('bakwata_active_group_id') !== s.groupId) {
          localStorage.setItem('bakwata_active_group_id', s.groupId);
        }
      } catch {}
      return {
        groupId: s.groupId,
        groupName: s.groupName || s.groupProfile?.name || 'Savings Group',
        inviteCode: s.inviteCode || s.groupProfile?.inviteCode || '',
        pendingSync: !!s.pendingSync,
      };
    } catch {
      return null;
    }
  };

  const handleResumeLocalGroup = async (): Promise<{ ok: boolean; error?: string }> => {
    const lg = readLocalGroup();
    if (!lg) return { ok: false, error: 'Nothing saved on this phone yet.' };
    let stored: VSLAState | null = null;
    try {
      stored = JSON.parse(localStorage.getItem('bakwata_vsla_state') || 'null');
    } catch {
      stored = null;
    }
    if (!stored || stored.groupId !== lg.groupId) {
      return { ok: false, error: 'Saved data looks broken — register again.' };
    }
    // 1. Activate locally first (works fully offline).
    setVslaState(stored);
    setCurrentGroupId(lg.groupId);
    setSelectedBox(`${stored.groupName} • ${stored.boxIdentifier}`);
    if (stored.members?.[0]) setSelectedMemberId(stored.members[0].id);
    // 2. Push if it was created offline (server bootstraps unknown grp-* ids).
    if (stored.pendingSync) {
      try {
        const res = await apiFetch(`/api/state?groupId=${lg.groupId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-group-id': lg.groupId },
          body: JSON.stringify({ state: { ...stored, pendingSync: false }, groupId: lg.groupId }),
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
          stored = cleared;
        }
      } catch {
        /* offline — local copy stands */
      }
    }
    // 3. Sign in with the credentials stored on this phone.
    const acct = (stored as VSLAState).currentUser;
    const pin = acct?.pin ? String(acct.pin) : '';
    if (acct?.id && pin && !pin.startsWith('hash:')) {
      const ok = await loginWithCredentials(lg.groupId, acct.id, pin, lg.groupName);
      if (ok) {
        setCurrentScreen('home');
        setActiveTab('home');
        return { ok: true };
      }
    }
    return { ok: false, error: 'Could not sign in automatically — use your invite code below.' };
  };

  /**
   * Changing who may move money is a two-key decision: whoever can add a
   * keyholder can otherwise turn both keys on a share-out alone. Key 1 freezes
   * the exact change; key 2 from a different officer writes it.
   */
  const handleOfficerKey = (
    request: OfficerChangeRequest,
    key: { officerId: string; pin: string }
  ): string | null => {
    if (!canManageOfficers(currentUser)) {
      return language === 'LU' ? 'Abali ku kizibu naba soma okukyendereza abakozesa.' : 'Only an officer can change the officers.';
    }
    const check = verifyOfficerKey(vslaState.availableAccounts, key.officerId, key.pin, {
      requireApprover: true,
      language,
    });
    if (!check.ok) return check.error || 'Unknown officer.';
    const nowIso = new Date().toISOString();
    const validated = checkOfficerChange({ ...request, actor: currentUser, accounts: vslaState.availableAccounts || [], firstKeyBy: check.name, firstKeyAt: nowIso });
    if (!validated.ok) return validated.problems[0];

    const id = `oc-${Date.now().toString(36)}`;
    const pending = buildPending(
      { ...request, actor: currentUser, accounts: vslaState.availableAccounts || [] },
      check.name,
      nowIso,
      id
    );
    persistState(
      withAudit(
        { ...vslaState, pendingOfficerChange: pending },
        check.name,
        `Key 1/2 — ${pending.summary}`,
        `${pending.kind === 'add' ? 'New officer' : pending.targetName} · nothing changed yet · needs a DIFFERENT officer for key 2/2`,
        undefined
      )
    );
    return null;
  };

  const handlePendingOfficerKey = (key: { officerId: string; pin: string }): string | null => {
    const pending = vslaState.pendingOfficerChange;
    if (!pending) return language === 'LU' ? 'Teri kintu kirindirira.' : 'There is nothing waiting for a second key.';
    const check = verifyOfficerKey(vslaState.availableAccounts, key.officerId, key.pin, {
      requireApprover: true,
      language,
    });
    if (!check.ok) return check.error || 'Unknown officer.';
    if (sameName(pending.firstKeyBy, check.name)) {
      return language === 'LU'
        ? `${check.name} yafula kisumuluzo 1/2 — omukulu omulala ayoola 2/2.`
        : `${check.name} already turned key 1/2. A different officer must turn key 2/2.`;
    }
    if (!pendingStillValid(vslaState.availableAccounts || [], pending)) {
      return language === 'LU'
        ? 'Ebikyenderoza bikyali bulungi. Bateekerezza ko mulyekezo terandikidde.'
        : 'The officers have changed since this was requested. Cancel it and start again.';
    }
    const record = {
      id: pending.id,
      at: new Date().toISOString(),
      kind: pending.kind,
      officerId: pending.targetId,
      officerName: pending.targetName,
      summary: pending.summary,
      firstKeyBy: pending.firstKeyBy,
      firstKeyAt: pending.firstKeyAt,
      secondKeyBy: check.name,
      secondKeyAt: new Date().toISOString(),
    };
    persistState(
      withAudit(
        {
          ...vslaState,
          availableAccounts: applyPending(vslaState.availableAccounts || [], pending),
          officerChanges: [...(vslaState.officerChanges || []), record],
          pendingOfficerChange: undefined,
        },
        check.name,
        `${pending.summary} (two keys)`,
        `${pending.firstKeyBy} then ${check.name} · the officers on this group are changed`,
        undefined
      )
    );
    return null;
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
     setShowGroupHome(false);
     if (account.role === 'member') {
       setCurrentScreen('member_home');
       setActiveTab('members');
     } else {
       setCurrentScreen('home');
       setActiveTab('home');
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
     setShowGroupHome(false);
     setCurrentScreen(account.role === 'member' ? 'member_home' : 'home');
     setActiveTab(account.role === 'member' ? 'members' : 'home');
     rememberSession(currentGroupId, vslaState.groupName || currentGroupId);
    if (account.memberId) {
      setSelectedMemberId(account.memberId);
    }
    await persistState({ ...vslaState, currentUser: account });
    // Pull the shared ledger now that we hold a session (cross-device sync),
    // keeping THIS login as the current user — never the server's stale one.
    try {
      const res = await apiFetch(`/api/state?groupId=${currentGroupId}`, {
        headers: { 'x-group-id': currentGroupId },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state && Array.isArray(data.state.members)) {
          const merged: VSLAState = { ...data.state, groupId: currentGroupId, currentUser: account };
          setVslaState(merged);
          try {
            localStorage.setItem('bakwata_vsla_state', JSON.stringify(merged));
            localStorage.setItem('bakwata_active_group_id', currentGroupId);
          } catch {}
          setIsServerConnected(true);
        }
      }
    } catch {
      /* offline — local seed stands */
    }
    setCurrentScreen('home');
    setActiveTab('home');
  };

  const handleLogout = () => {
    setSessionToken(null);
    setSessionTokenState(null);
    setLoginPreselectId(undefined);
    setIsAccountModalOpen(false);
  };

  // ---- Change sign-in PIN: server-first (scrypt hash), local fallback ----
  // In open-dev mode the full state POST below also carries the new PIN to the
  // memory store; in enforced mode the server already hashed it, so we only
  // update this device (a full-state POST would 403 for member rank).
  // Write an already-audited state to this device only (no server POST).
  const applyLocalPinState = (next: VSLAState) => {
    setVslaState(next);
    try {
      localStorage.setItem(isPracticeGroup(currentGroupId) ? 'vsla_practice_state_v1' : 'bakwata_vsla_state', JSON.stringify(next));
    } catch {}
  };

  const applyLocalPin = (newPin: string) => {
    const updated: UserAccount = { ...currentUser, pin: newPin };
    const next: VSLAState = withAudit(
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
    );
    next.groupId = currentGroupId;
    applyLocalPinState(next);
  };

  const handleChangePin = async (newPin: string, oldPin?: string): Promise<string | null> => {
    const res = await changePinRequest({ groupId: currentGroupId, accountId: currentUser.id, oldPin, newPin });
    if (res.ok) {
      const updated: UserAccount = { ...currentUser, pin: newPin };
      const next: VSLAState = withAudit(
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
      );
      // Open-dev: the full-state POST also teaches the memory store the PIN.
      // Enforced: server already hashed it — local-only update (a state POST
      // would 403 for member rank).
      if (!authEnforced) persistState(next);
      else {
        next.groupId = currentGroupId;
        applyLocalPinState(next);
      }
      return null;
    }
    if (!isServerConnected) {
      // Fully offline: local-only change; user re-confirms at next login.
      applyLocalPin(newPin);
      return null;
    }
    return res.error || 'PIN change failed.';
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
    // Heal a poisoned group pointer: the session token knows which group you
    // belong to — trust it over a stale local pointer (e.g. after tapping a
    // group you could never enter). Runs before any fetch.
    const tokenGid = sessionGroupId(getSessionToken());
    if (tokenGid && tokenGid !== currentGroupId && !isPracticeGroup(tokenGid) && !isPracticeGroup(currentGroupId)) {
      setCurrentGroupId(tokenGid);
      try {
        localStorage.setItem('bakwata_active_group_id', tokenGid);
      } catch {}
      return;
    }
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
  const isPractice = isPracticeGroup(currentGroupId);

  const handleEnterPractice = () => {
    if (isPractice) return;
    stashRealGroup(vslaState, currentGroupId);
    const p = buildPracticeState();
    setVslaState(p);
    setCurrentGroupId(PRACTICE_GROUP_ID);
    setSelectedMemberId('p-m1');
    try {
      localStorage.setItem('vsla_practice_state_v1', JSON.stringify(p));
      localStorage.setItem('bakwata_active_group_id', PRACTICE_GROUP_ID);
    } catch {}
    setCurrentScreen('home');
    setActiveTab('home');
  };

  // The landing page's "Open the app" button asks which door to use, then
  // sends /app?intent=demo|login|register. Honour the choice, then clean the
  // URL so a refresh does not re-trigger the demo.
  const [entryIntent] = useState<EntryIntent | null>(() =>
    readEntryIntent(typeof window === 'undefined' ? '' : window.location.search)
  );
  const entryApplied = useRef(false);
  useEffect(() => {
    if (!entryIntent || entryApplied.current) return;
    entryApplied.current = true;
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', stripEntryIntent(window.location.href));
    }
    if (entryIntent === 'demo') handleEnterPractice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryIntent]);

  const handleExitPractice = () => {
    const restored = popStashedGroup();
    if (restored) {
      setVslaState(restored.state);
      setCurrentGroupId(restored.groupId);
      try {
        localStorage.setItem('bakwata_vsla_state', JSON.stringify(restored.state));
        localStorage.setItem('bakwata_active_group_id', restored.groupId);
      } catch {}
      if (restored.state.members?.[0]) setSelectedMemberId(restored.state.members[0].id);
    } else {
      fetchStateFromServer('bakwata-01');
    }
    try {
      localStorage.removeItem('vsla_practice_state_v1');
    } catch {}
    setCurrentScreen('home');
    setActiveTab('home');
  };

  // Say it out loud when there is no signal — a silent failure costs trust,
  // and people cannot read a console error. Nothing breaks offline: writes go
  // to this phone first and sync when signal returns.
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(
    () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false)
  );
  useEffect(() => {
    const up = () => setIsBrowserOnline(true);
    const down = () => setIsBrowserOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  // Ask the browser not to evict the group's ledger when storage runs low
  // (research: navigator.storage.persist() survives "clear cache" cleanups).
  useEffect(() => {
    try {
      navigator.storage?.persist?.();
    } catch {
      /* not supported — localStorage still holds the data */
    }
  }, []);

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
    setLangChosen(true);
  };

  const handleSelectLanguage = (lang: Language) => {
    setLanguage(lang);
    setLangChosen(true);
    try {
      localStorage.setItem('vsla_lang', lang);
    } catch {}
  };

  const handleNavigateScreen = (screen: ScreenId) => {
    const officerOnlyScreens: ScreenId[] = ['meeting_wizard', 'meeting_close', 'approvals', 'reports', 'users', 'group_settings', 'constitution_fines', 'share_out', 'backup'];
    if (currentUser.role === 'member' && officerOnlyScreens.includes(screen)) {
      setCurrentScreen('member_home');
      setActiveTab('members');
      return;
    }
    if (screen === 'approvals' && currentUser.role === 'member') {
      setCurrentScreen('member_home');
      setActiveTab('members');
      return;
    }
    setCurrentScreen(screen);
    if (screen === 'home') {
      setActiveTab('home');
      setShowGroupHome(false);
    }
    else if (screen === 'meeting_close' || screen === 'meeting_wizard' || screen === 'audio_broadcast') setActiveTab('meetings');
    else if (screen === 'member_passbook' || screen === 'member_home') {
      setActiveTab('members');
      // Members opening the passbook land on their OWN book, not the roster.
      if (screen === 'member_passbook' && currentUser.role === 'member') {
        const self =
          vslaState.members.find((m) => m.id === currentUser.memberId) ||
          vslaState.members.find((m) => m.no === currentUser.memberNo);
        if (self) setSelectedMemberId(self.id);
      }
    }
    else if (screen === 'new_loan') setActiveTab('loans');
    else if (screen === 'approvals') setActiveTab('approvals');
    else if (screen === 'shop') setActiveTab('shop');
    else setActiveTab('more');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

   const handleOpenNotifications = () => {
     if (!isPracticeGroup(currentGroupId)) void fetchStateFromServer(currentGroupId);
     handleNavigateScreen('notifications');
   };

   const handleApproveItem = (
    id: string,
    payoutMethod?: string,
    key?: { officerId: string; pin: string }
  ): string | null => {
    if (currentUser.role === 'member') return 'Members cannot approve group requests.';
    const targetItem = vslaState.approvals.find((a) => a.id === id);
    if (!targetItem) return language === 'LU' ? 'Request tewali.' : 'Request not found.';
    if (targetItem.status !== 'pending') return language === 'LU' ? 'Kiwedde.' : 'Already decided.';
    const liveMember = vslaState.members.find((member) => member.no === targetItem.memberNo);
    if (targetItem.type === 'vsla_loan') {
      if (!liveMember) return 'The member record is missing. Refresh the group first.';
      if ((liveMember.loanBalance || 0) > 0) return 'This member already has an active loan.';
      if (targetItem.amount > (liveMember.maxBorrowLimit || 0)) return 'The request is above this member’s current borrowing limit.';
      if (targetItem.amount > vslaState.loanFundBalance) return 'The loan fund does not have enough money.';
    }
    if (targetItem.type === 'welfare_grant' && targetItem.amount > vslaState.welfareFundBalance) return 'The welfare fund does not have enough money.';
    if (targetItem.type === 'savings_withdrawal' && (!liveMember || targetItem.amount > liveMember.sharesTotal)) return 'The member does not have enough savings.';

    // Verify the officer holding the phone — not whoever is logged in.
    let officerName = currentUser.name;
    if (key) {
      const check = verifyOfficerKey(vslaState.availableAccounts, key.officerId, key.pin, { language });
      if (!check.ok) return check.error || 'Unknown officer.';
      officerName = check.name;
    } else if (isDefaultPin(currentUser.pin)) {
      return language === 'LU' ? 'Kyuusa PIN (1234) esooke.' : 'Change your default PIN 1234 first (Account → Change PIN). Money cannot move on a default PIN.';
    }
    const method = payoutMethod || targetItem.provider || 'Cash';
    const payoutBalance = method === 'Cash' ? vslaState.boxCashBalance : (vslaState.momoBalance || 0);
    if (targetItem.type === 'vsla_loan' && payoutBalance < targetItem.amount) return 'The selected payment balance is too low for this loan.';
    if (targetItem.type === 'welfare_grant' && payoutBalance < targetItem.amount) return 'The selected payment balance is too low for this grant.';
    if (targetItem.type === 'savings_withdrawal' && payoutBalance < targetItem.amount) return 'The selected payment balance is too low for this withdrawal.';
    const nowIso = new Date().toISOString();

    // Key 1/2: record first officer, move NO money.
    if (!targetItem.firstApprovedBy) {
      const updatedApprovals = vslaState.approvals.map((item) =>
        item.id === id ? firstKeyUpdate(item, officerName, nowIso, method) : item
      );
      const firstKeyState = withAudit(
        { ...vslaState, approvals: updatedApprovals },
        officerName,
        `First key (1/2) for ${targetItem.type.replace(/_/g, ' ')} ${targetItem.reqNumber} via ${method}`,
        `${targetItem.memberName} (#${targetItem.memberNo}) · needs a DIFFERENT officer for key 2/2 · no money moved`,
        targetItem.amount
      );
      persistState(
        appendNotifications(firstKeyState, [
          {
            audience: 'officer',
            kind: 'approval',
            title: `Key 1/2 recorded for ${targetItem.memberName}`,
            body: `${targetItem.reqNumber} needs a different officer to turn key 2/2. No money has moved.`,
            approvalId: targetItem.id,
            actionScreen: 'approvals',
          },
          {
            audience: 'member',
            memberNo: targetItem.memberNo,
            kind: 'approval',
            title: 'Your request received key 1/2',
            body: `${targetItem.reqNumber} still needs a second officer. No money has moved.`,
            approvalId: targetItem.id,
            actionScreen: 'member_passbook',
          },
        ])
      );
      return null;
    }

    // Same officer cannot turn both keys.
    if (isSameOfficer(targetItem, officerName)) {
      return language === 'LU'
        ? `${officerName} yakkirizza dda. Omukulu omulala yeetaagisa.`
        : `${officerName} already turned key 1/2. A DIFFERENT officer must turn key 2/2.`;
    }

    // Key 2/2 by a different officer: approve the request, but wait for payout confirmation.
    const updatedApprovals = vslaState.approvals.map((item) =>
      item.id === id
        ? {
            ...item,
            status: 'approved' as const,
            provider: (method === 'MTN' || method === 'Airtel' ? method : item.provider) as 'MTN' | 'Airtel' | 'Cash',
            decidedBy: `${targetItem.firstApprovedBy} + ${officerName}`,
            decidedAt: nowIso,
            secondApprovedBy: officerName,
            secondApprovedAt: nowIso,
            payoutMethod: method,
            payoutStatus: 'pending' as const,
          }
        : item
    );

    const approvedState = withAudit(
      {
        ...vslaState,
        approvals: updatedApprovals,
      },
      officerName,
      `Second key (2/2) APPROVED ${targetItem.type.replace(/_/g, ' ')} ${targetItem.reqNumber} via ${method}`,
      `${targetItem.memberName} (#${targetItem.memberNo}) · keys: ${targetItem.firstApprovedBy} + ${officerName} · payout awaits confirmation`,
      targetItem.amount
    );
    persistState(
      appendNotifications(approvedState, [
        {
          audience: 'officer',
          kind: 'approval',
          title: `${targetItem.reqNumber} approved`,
          body: `${targetItem.memberName} passed both keys. Confirm the ${method} payout before money moves.`,
          approvalId: targetItem.id,
          actionScreen: 'approvals',
        },
        {
          audience: 'member',
          memberNo: targetItem.memberNo,
          kind: 'approval',
          title: 'Your request was approved',
          body: `${targetItem.reqNumber} passed both keys. The group will confirm the payout next.`,
          approvalId: targetItem.id,
          actionScreen: 'member_passbook',
        },
      ])
    );
    return null;
  };

  const handleRequestApprovalCode = async (id: string, officerId: string): Promise<ApprovalCodeResult | null> => {
    if (currentUser.role === 'member') return null;
    const targetItem = vslaState.approvals.find((a) => a.id === id);
    const officer = (vslaState.availableAccounts || []).find((account) => account.id === officerId);
    if (!targetItem || targetItem.status !== 'pending' || targetItem.type !== 'vsla_loan' || !officer || !officer.permissions.canApproveLoans || !officer.phone) return null;

    if (!isPractice) {
      const remote = await requestApprovalCodeRemote({ groupId: currentGroupId, approvalId: id, officerId });
      if (remote.ok) {
        setVslaState(remote.result.state);
        try {
          localStorage.setItem('bakwata_vsla_state', JSON.stringify(remote.result.state));
        } catch {}
        setIsServerConnected(true);
        return {
           code: remote.result.code,
           phone: remote.result.phone,
           officerName: remote.result.officerName,
           expiresAt: remote.result.expiresAt,
         };
      }
        if ('error' in remote) {
          if (!/no connection|failed to fetch|network|load failed/i.test(remote.error)) return null;
        }
    }

    const random = new Uint32Array(1);
    globalThis.crypto?.getRandomValues(random);
    const code = String(100000 + ((random[0] || Date.now()) % 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const nextState = appendNotifications(
      withAudit(
        {
          ...vslaState,
          approvals: vslaState.approvals.map((item) => item.id === id ? { ...item, confirmationCode: code, confirmationCodeExpiresAt: expiresAt, confirmationOfficerId: officerId } : item),
        },
        currentUser.name,
        `Created phone approval code for ${targetItem.reqNumber}`,
        `${officer.name} · expires in 10 minutes · no money moved`,
        undefined
      ),
      [
        {
          audience: 'officer',
          kind: 'approval_code',
          recipientAccountId: officerId,
          approvalId: id,
          title: `Approval code ready for ${targetItem.memberName}`,
          body: `${targetItem.reqNumber} is waiting for key 1/2. Use the code from the secure message.`,
          actionScreen: 'approvals',
        },
      ]
    );
    persistState(nextState);
     return { code, phone: officer.phone, officerName: officer.name, expiresAt };
  };

  const handleApproveWithCode = async (id: string, code: string, payoutMethod?: string): Promise<string | null> => {
    if (!isPractice) {
      const remote = await approveWithCodeRemote({ groupId: currentGroupId, approvalId: id, code: code.trim(), payoutMethod });
      if (remote.ok) {
        setVslaState(remote.result.state);
        try {
          localStorage.setItem('bakwata_vsla_state', JSON.stringify(remote.result.state));
        } catch {}
        setIsServerConnected(true);
        return null;
      }
        if ('error' in remote) {
          if (!/no connection|failed to fetch|network|load failed/i.test(remote.error)) return remote.error;
        }
    }

    const targetItem = vslaState.approvals.find((a) => a.id === id);
    if (!targetItem || targetItem.status !== 'pending' || targetItem.type !== 'vsla_loan') return 'Request is no longer waiting for approval.';
    if (targetItem.firstApprovedBy) return 'This request already has key 1/2.';
    if (!targetItem.confirmationCode || targetItem.confirmationCode !== code) return 'That approval code is not correct.';
    if (!targetItem.confirmationCodeExpiresAt || new Date(targetItem.confirmationCodeExpiresAt).getTime() < Date.now()) return 'That approval code has expired.';
    const liveMember = vslaState.members.find((member) => member.no === targetItem.memberNo);
    if (!liveMember || (liveMember.loanBalance || 0) > 0 || targetItem.amount > (liveMember.maxBorrowLimit || 0) || targetItem.amount > vslaState.loanFundBalance) return 'The request no longer passes the live loan checks.';
    const officer = (vslaState.availableAccounts || []).find((account) => account.id === targetItem.confirmationOfficerId);
    if (!officer) return 'The approving officer is no longer on this group.';
    const method = payoutMethod || targetItem.provider || 'Cash';
    const nowIso = new Date().toISOString();
    const updatedApprovals = vslaState.approvals.map((item) => item.id === id ? {
      ...firstKeyUpdate(item, officer.name, nowIso, method),
      confirmationCode: undefined,
      confirmationCodeHash: undefined,
      confirmationCodeExpiresAt: undefined,
    } : item);
    const nextState = appendNotifications(
      withAudit(
        { ...vslaState, approvals: updatedApprovals },
        officer.name,
        `Phone code approved ${targetItem.reqNumber}`,
        `${targetItem.memberName} (#${targetItem.memberNo}) · key 1/2 · no money moved`,
        undefined
      ),
      [
        {
          audience: 'officer',
          kind: 'approval',
          approvalId: id,
          title: `${targetItem.memberName} received key 1/2`,
          body: `${targetItem.reqNumber} still needs a different officer for key 2/2.`,
          actionScreen: 'approvals',
        },
        {
          audience: 'member',
          memberNo: targetItem.memberNo,
          kind: 'approval',
          approvalId: id,
          title: 'Your request received key 1/2',
          body: `${targetItem.reqNumber} still needs a second officer. No money has moved.`,
          actionScreen: 'member_passbook',
        },
      ]
    );
    persistState(nextState);
    return null;
  };

  const handleConfirmPayout = (id: string, method?: string): string | null => {
    if (currentUser.role === 'member') return 'Members cannot confirm group payouts.';
    if (!hasPermission(currentUser, 'canApproveLoans')) {
      return permissionRefusal(currentUser, 'canApproveLoans', language);
    }
    if (isDefaultPin(currentUser.pin)) return 'Change the default PIN before confirming a payout.';
    const targetItem = vslaState.approvals.find((a) => a.id === id);
    if (!targetItem || targetItem.status !== 'approved') return 'This request is not awaiting payout.';
    if (targetItem.payoutStatus === 'confirmed') return 'This payout was already confirmed.';
    const member = vslaState.members.find((m) => m.no === targetItem.memberNo);
    if ((targetItem.type === 'vsla_loan' || targetItem.type === 'savings_withdrawal') && !member) return 'The member record is missing. Refresh the group first.';

    const payoutMethod = method || targetItem.payoutMethod || targetItem.provider || 'Cash';
    const isMoMo = payoutMethod === 'MTN' || payoutMethod === 'Airtel';
    let boxCash = vslaState.boxCashBalance;
    let loanFund = vslaState.loanFundBalance;
    let welfareFund = vslaState.welfareFundBalance;
    let momoBalance = vslaState.momoBalance || 0;

    if (targetItem.type === 'vsla_loan') {
      if (loanFund < targetItem.amount) return 'The loan fund no longer has enough money for this payout.';
      if (isMoMo ? momoBalance < targetItem.amount : boxCash < targetItem.amount) return 'The selected payment balance is too low.';
      loanFund -= targetItem.amount;
      if (isMoMo) momoBalance -= targetItem.amount;
      else boxCash -= targetItem.amount;
    } else if (targetItem.type === 'welfare_grant') {
      if (welfareFund < targetItem.amount) return 'The welfare fund no longer has enough money for this payout.';
      if (isMoMo ? momoBalance < targetItem.amount : boxCash < targetItem.amount) return 'The selected payment balance is too low.';
      welfareFund -= targetItem.amount;
      if (isMoMo) momoBalance -= targetItem.amount;
      else boxCash -= targetItem.amount;
    } else if (targetItem.type === 'savings_withdrawal') {
      if (isMoMo ? momoBalance < targetItem.amount : boxCash < targetItem.amount) return 'The selected payment balance is too low.';
      if (isMoMo) momoBalance -= targetItem.amount;
      else boxCash -= targetItem.amount;
    }

    const updatedMembers = targetItem.type === 'vsla_loan' && member
      ? vslaState.members.map((m) => {
          if (m.id !== member.id) return m;
          const newBalance = (m.loanBalance || 0) + targetItem.amount;
          return {
            ...m,
             loanBalance: newBalance,
             activeLoan: {
              code: `LN-${Date.now().toString(36).toUpperCase()}`,
              purpose: targetItem.purpose || 'Loan approved by the group',
              principal: targetItem.amount,
              repaid: 0,
              balance: targetItem.amount,
              interestRate: targetItem.serviceFee ? `UGX ${targetItem.serviceFee.toLocaleString()} service fee` : 'Group rate',
              maturity: 'Set at first meeting',
            },
            ledger: [
              {
                id: 'led-disbursed-' + Date.now().toString(36) + '-' + m.id,
                title: `Loan disbursed via ${payoutMethod}`,
                subtitle: targetItem.purpose || 'Approved loan',
                badge: 'DISBURSED',
                amountText: `UGX ${targetItem.amount.toLocaleString()}`,
                isPositive: false,
                date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
              },
              ...m.ledger,
            ],
          };
        })
      : targetItem.type === 'savings_withdrawal' && member
        ? vslaState.members.map((m) => {
            if (m.id !== member.id) return m;
            const sharePrice = groupSharePrice(vslaState.groupProfile);
            const sharesOut = sharePrice > 0 ? Math.min(m.sharesCount, Math.ceil(targetItem.amount / sharePrice)) : 0;
            const newShares = Math.max(0, m.sharesCount - sharesOut);
            const newTotal = Math.max(0, m.sharesTotal - (sharesOut * sharePrice));
            return {
              ...m,
              sharesCount: newShares,
              sharesTotal: newTotal,
              maxBorrowLimit: newTotal * (vslaState.groupProfile?.borrowMultiplier || 3),
              ledger: [
                {
                  id: 'led-withdrawal-' + Date.now().toString(36) + '-' + m.id,
                  title: `Savings withdrawal via ${payoutMethod}`,
                  subtitle: 'Withdrawal confirmed by the group',
                  badge: 'WITHDRAWN',
                  amountText: `UGX ${targetItem.amount.toLocaleString()}`,
                  isPositive: false,
                  date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                },
                ...m.ledger,
              ],
            };
          })
        : vslaState.members;

    const welfareGrants = targetItem.type === 'welfare_grant'
      ? [{
          id: 'grant-' + Date.now().toString(36),
          memberNo: targetItem.memberNo,
          memberName: targetItem.memberName,
          reason: targetItem.reason || 'Emergency support',
          amount: targetItem.amount,
          paymentMethod: `Confirmed via ${payoutMethod}`,
          date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          minutesRef: targetItem.reqNumber,
          type: 'other' as const,
        }, ...vslaState.welfareGrants]
      : vslaState.welfareGrants;

    const updatedApprovals = vslaState.approvals.map((item) =>
      item.id === id
        ? {
            ...item,
            payoutMethod: payoutMethod,
            payoutStatus: 'confirmed' as const,
            payoutConfirmedAt: new Date().toISOString(),
            payoutConfirmedBy: currentUser.name,
          }
        : item
    );

     const nextState = appendNotifications(
       withAudit(
         {
           ...vslaState,
           boxCashBalance: boxCash,
           loanFundBalance: loanFund,
           welfareFundBalance: welfareFund,
           momoBalance,
           members: updatedMembers,
           welfareGrants,
           approvals: updatedApprovals,
         },
         currentUser.name,
         `Confirmed ${targetItem.type.replace(/_/g, ' ')} payout via ${payoutMethod}`,
         `${targetItem.memberName} (#${targetItem.memberNo}) · ${targetItem.reqNumber}`,
         targetItem.amount
       ),
       [
         {
           audience: 'officer',
           kind: 'payout',
           approvalId: targetItem.id,
           title: `${targetItem.memberName}'s payout was confirmed`,
           body: `${targetItem.reqNumber} · UGX ${targetItem.amount.toLocaleString()} sent via ${payoutMethod}.`,
           actionScreen: 'approvals',
         },
         {
           audience: 'member',
           memberNo: targetItem.memberNo,
           kind: 'payout',
           approvalId: targetItem.id,
           title: 'Your payout was confirmed',
           body: `${targetItem.reqNumber} · UGX ${targetItem.amount.toLocaleString()} sent via ${payoutMethod}.`,
           actionScreen: 'member_passbook',
         },
       ]
     );
     persistState(nextState);
    return null;
  };

  const handleRejectItem = (id: string, reason?: string) => {
    if (currentUser.role === 'member') return;
    const targetItem = vslaState.approvals.find((a) => a.id === id);
    const updatedApprovals = vslaState.approvals.map((item) =>
      item.id === id
        ? { ...item, status: 'rejected' as const, decidedBy: currentUser.name, decidedAt: new Date().toISOString(), rejectReason: reason || undefined }
        : item
    );
     if (!targetItem) return;
     const nextState = appendNotifications(
       withAudit(
         {
           ...vslaState,
           approvals: updatedApprovals,
         },
         currentUser.name,
         `Rejected ${targetItem.type.replace(/_/g, ' ')} ${targetItem.reqNumber}`,
         `${targetItem.memberName} (#${targetItem.memberNo})${reason ? ` — ${reason}` : ''}`,
         targetItem.amount
       ),
       [
         {
           audience: 'officer',
           kind: 'rejection',
           approvalId: targetItem.id,
           title: `${targetItem.memberName}'s request was rejected`,
           body: `${targetItem.reqNumber}${reason ? ` · ${reason}` : ''}`,
           actionScreen: 'approvals',
         },
         {
           audience: 'member',
           memberNo: targetItem.memberNo,
           kind: 'rejection',
           approvalId: targetItem.id,
           title: 'Your request was rejected',
           body: `${targetItem.reqNumber}${reason ? ` · ${reason}` : 'Please speak to the group secretary.'}`,
           actionScreen: 'member_passbook',
         },
       ]
     );
     persistState(nextState);
  };

  // Discrepancy Adjustment
  const handleDiscrepancyAdjustment = (amount: number, reason: string, method: string) => {
    if (amount <= 0 || !reason.trim()) return;
    persistState(
      withAudit(
        vslaState,
        currentUser.name,
        `Recorded cash discrepancy note (${method})`,
        `${reason} · UGX ${amount.toLocaleString()} · recount required before sealing`,
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
           title: `Meeting #${vslaState.recentMeetingsCount + 1}: Loan Repayment (Cash)`,
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
  const handleBuyShares = (sharesCount: number, memberId: string, requestedShareClassId?: string) => {
    if (!Number.isInteger(sharesCount) || sharesCount <= 0) return;
    const selectedClass = vslaState.groupProfile?.shareClasses?.find((shareClass) => shareClass.id === requestedShareClassId && shareClass.active);
     const price = selectedClass?.price || groupSharePrice(vslaState.groupProfile);
     const shareClassId = selectedClass?.id || 'default';
     const shareClassName = selectedClass?.name || 'Standard share';
     const cost = sharesCount * price;
     const targetMember = vslaState.members.find((m) => m.id === memberId);
    const updatedMembers = vslaState.members.map((m) => {
      if (m.id === memberId) {
        const newSharesCount = m.sharesCount + sharesCount;
        const newSharesTotal = m.sharesTotal + cost;
         const newMaxBorrow = newSharesTotal * (vslaState.groupProfile?.borrowMultiplier || 3);

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
           title: `Meeting #${vslaState.recentMeetingsCount + 1}: Bought ${sharesCount} Share(s)`,
          badge: 'SAVINGS',
             subtitle: `Stamped into member physical passbook card. Total: ${newSharesCount} shares`,
             amountText: `+UGX ${cost.toLocaleString()}`,
             isPositive: true,
             date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
             ...sharePurchaseLedgerFields(shareClassId, shareClassName, sharesCount, price),
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

  // Mobile Money collection lands in the MoMo float — NOT the metal box.
  // The group reconciles where money sits in Home → Where money sits.
  const handleMoMoSuccess = (amount: number, desc: string) => {
    persistState(
      withAudit(
        {
          ...vslaState,
          momoBalance: (vslaState.momoBalance || 0) + amount,
        },
        currentUser.name,
        'Mobile Money collection confirmed (MoMo float)',
        `${desc} · now MoMo UGX ${((vslaState.momoBalance || 0) + amount).toLocaleString()}, cash UGX ${vslaState.boxCashBalance.toLocaleString()}`,
        amount
      )
    );
  };

  // Move group money between box cash ↔ MoMo float ↔ bank. Audited, no
  // money leaves the group — only the storage place changes.
  const handleTransferFunds = (from: FundLocation, to: FundLocation, amount: number, note: string): string | null => {
    if (!hasPermission(currentUser, 'canLockBox')) {
      return permissionRefusal(currentUser, 'canLockBox', language);
    }
    const err = transferError(vslaState, from, to, amount);
    if (err) return err;
    const amt = Math.floor(amount);
    const balances = applyTransfer(vslaState, from, to, amt);
    const record = {
      id: 'ft-' + Date.now().toString(36),
      timestamp: new Date().toISOString(),
      from,
      to,
      amount: amt,
      actorName: currentUser.name,
      note: note.trim() || 'Fund move',
    };
    persistState(
      withAudit(
        {
          ...vslaState,
          ...balances,
          fundTransfers: [record, ...(vslaState.fundTransfers || [])].slice(0, 100),
        },
        currentUser.name,
        `Moved UGX ${amt.toLocaleString()} ${from} → ${to}`,
        record.note,
        amt
      )
    );
    return null;
  };

  // Submit New Loan Application
  const handleSubmitNewLoan = (loan: {
    memberName: string;
    memberNo: string;
    amount: number;
    term: string;
    serviceFee: number;
    purpose: string;
    guarantorNos: string[];
    phone: string;
    provider: 'MTN' | 'Airtel';
  }) => {
    const member = vslaState.members.find((m) => m.no === loan.memberNo) || vslaState.members[0];
    if (!member) return;
    const newApproval: ApprovalItem = {
      id: 'app-' + Date.now(),
      type: 'vsla_loan',
       reqNumber: 'Req #LN-' + Date.now().toString(36).slice(-5).toUpperCase(),
      timeText: 'Just now',
      memberName: loan.memberName,
      memberNo: loan.memberNo,
      phone: loan.phone,
       provider: loan.provider,
       initiator: currentUser.name,
       amount: loan.amount,
       term: loan.term,
       serviceFee: loan.serviceFee,
       purpose: loan.purpose,
       guarantorNos: loan.guarantorNos,
       status: 'pending',
      totalSavings: member.sharesTotal,
      maxBorrowable: member.maxBorrowLimit,
    };

     const nextState = appendNotifications(
       withAudit(
         {
           ...vslaState,
           approvals: [newApproval, ...vslaState.approvals],
         },
         currentUser.name,
         `Submitted loan request ${newApproval.reqNumber}`,
         `${loan.memberName} (#${loan.memberNo})`,
         loan.amount
       ),
       [
         {
           audience: 'officer',
           kind: 'loan_request',
           approvalId: newApproval.id,
           title: `Loan request from ${newApproval.memberName}`,
           body: `${newApproval.reqNumber} · UGX ${newApproval.amount.toLocaleString()} needs two officers.`,
           actionScreen: 'approvals',
         },
         {
           audience: 'member',
           memberNo: newApproval.memberNo,
           kind: 'loan_request',
           approvalId: newApproval.id,
           title: 'Loan request sent',
           body: `${newApproval.reqNumber} is waiting for the group’s two officers.`,
           actionScreen: 'member_passbook',
         },
       ]
     );
      persistState(nextState);
      if (!isPractice) {
        void createLoanRequestRemote({
          groupId: currentGroupId,
          approvalId: newApproval.id,
          reqNumber: newApproval.reqNumber,
          memberName: newApproval.memberName,
          memberNo: newApproval.memberNo,
          amount: newApproval.amount,
          term: newApproval.term || '3 months',
          serviceFee: newApproval.serviceFee || 0,
          purpose: newApproval.purpose || '',
          guarantorNos: newApproval.guarantorNos || [],
          phone: newApproval.phone || '',
          provider: newApproval.provider === 'Airtel' ? 'Airtel' : 'MTN',
        }).then((remote) => {
          if (remote.ok) {
            setVslaState(remote.result.state);
            try {
              localStorage.setItem('bakwata_vsla_state', JSON.stringify(remote.result.state));
            } catch {}
            setIsServerConnected(true);
          }
        });
      }
  };

  // Disburse Welfare Grant — blocked on default PIN like approvals
  const handleDisburseWelfareGrant = (grant: WelfareGrant): string | null => {
    if (!hasPermission(currentUser, 'canDisburseWelfare')) {
      return permissionRefusal(currentUser, 'canDisburseWelfare', language);
    }
    if (isDefaultPin(currentUser.pin)) {
      alert(language === 'LU' ? 'Kyuusa PIN (1234) esooke — obuyambi tebufuluma ku PIN 1234.' : 'Change your default PIN 1234 first. Welfare money cannot move on a default PIN.');
      setIsAccountModalOpen(true);
      return language === 'LU' ? 'Kyuusa PIN esooke.' : 'Change your default PIN first.';
    }
    // Gap 4b: one rule, two doors. Direct payout is the emergency fast-track:
    // capped single-key; anything bigger must pass the 2-key approvals queue.
    if (welfareNeedsQueue(grant.amount)) {
      return `UGX ${grant.amount.toLocaleString()} is above the UGX ${WELFARE_FAST_TRACK_CAP.toLocaleString()} fast-track cap — file it as a welfare request so 2 officers approve it.`;
    }
    if (grant.amount > vslaState.welfareFundBalance) {
      return `Only UGX ${vslaState.welfareFundBalance.toLocaleString()} is available in the welfare fund.`;
    }
    const categoryCap = vslaState.groupProfile?.welfareCategoryCaps?.[grant.type] ?? 0;
    if (categoryCap > 0 && grant.amount > categoryCap) {
      return `This welfare category is limited to UGX ${categoryCap.toLocaleString()}.`;
    }
     const nextState = appendNotifications(
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
       ),
       [
         {
           audience: 'officer',
           kind: 'payout',
           title: `${grant.memberName}'s welfare payout was confirmed`,
           body: `UGX ${grant.amount.toLocaleString()} · ${grant.reason}`,
           actionScreen: 'welfare_fund',
         },
         {
           audience: 'member',
           memberNo: grant.memberNo,
           kind: 'payout',
           title: 'Your welfare payout was confirmed',
           body: `UGX ${grant.amount.toLocaleString()} · ${grant.reason}`,
           actionScreen: 'member_passbook',
         },
       ]
     );
     persistState(nextState);
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

  // Backup & Restore Handlers — restores always keep live face photos.
  const handleRestoreState = async (newState: VSLAState): Promise<boolean> => {
    if (!hasPermission(currentUser, 'canManageBackups')) {
      alert(permissionRefusal(currentUser, 'canManageBackups', language));
      return false;
    }
    const restoreState = (restored: VSLAState): VSLAState => {
      const merged = mergePhotosIntoRestored(restored, vslaState);
      return {
        ...merged,
        availableAccounts: vslaState.availableAccounts || merged.availableAccounts,
        currentUser: vslaState.currentUser || merged.currentUser,
      };
    };
    try {
      const res = await apiFetch(`/api/backup/restore?groupId=${currentGroupId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-group-id': currentGroupId },
        body: JSON.stringify({ state: newState, groupId: currentGroupId }),
      });
      if (res.ok) {
        const json = await res.json();
         const merged = restoreState(json.state || newState);
        setVslaState(merged);
        localStorage.setItem('bakwata_vsla_state', JSON.stringify(merged));
        return true;
      }
    } catch (e) {
      console.warn('Backend restore failed, setting state locally:', e);
       const merged = restoreState(newState);
      setVslaState(merged);
      localStorage.setItem('bakwata_vsla_state', JSON.stringify(merged));
      return true;
    }
    return false;
  };

  const handleCreateSnapshot = async (label: string) => {
    try {
      const res = await apiFetch(`/api/backup/snapshot?groupId=${currentGroupId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-group-id': currentGroupId },
        body: JSON.stringify({ label, groupId: currentGroupId }),
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

    // Local snapshot fallback — faces stripped (books only), max 8 kept.
    // Full-group snapshots multiply ~1MB of photos each; cheap phones die at ~5MB.
    const newSnapshot = {
      id: 'snap-' + Date.now(),
      label,
      timestamp: new Date().toISOString(),
      membersCount: vslaState.members.length,
      boxCashBalance: vslaState.boxCashBalance,
       data: JSON.stringify(redactBackupState(stripPhotosForSnapshot(vslaState))),
    };
    persistState({
      ...vslaState,
      snapshots: [newSnapshot, ...(vslaState.snapshots || [])].slice(0, 8),
      lastBackupDate: new Date().toISOString(),
    });
  };

  // Delete a snapshot to free phone storage (books stay, faces untouched).
  const handleDeleteSnapshot = (id: string) => {
    persistState({
      ...vslaState,
      snapshots: (vslaState.snapshots || []).filter((s) => s.id !== id),
    });
  };

  const handleResetToBaseline = async () => {
    if (!isPractice && currentUser.role === 'member') return;
    if (!isPractice && !hasPermission(currentUser, 'canManageBackups')) {
      alert(permissionRefusal(currentUser, 'canManageBackups', language));
      return;
    }
    if (!isPractice && isDefaultPin(currentUser.pin)) {
      setIsAccountModalOpen(true);
      return;
    }
    try {
      const res = await apiFetch(`/api/backup/reset?groupId=${currentGroupId}`, {
        method: 'POST',
        headers: { 'x-group-id': currentGroupId },
      });
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
  /** A recorded surplus policy makes the members' resolution the authority to pay. */
  const handleRecordSurplusResolution = (resolution: SurplusResolution) => {
    const kept = (vslaState.surplusResolutions || []).filter((r) => r.id !== resolution.id);
    persistState(
      withAudit(
        {
          ...vslaState,
          surplusResolutions: [...kept, resolution],
        },
        currentUser.name,
        `Recorded the cycle ${resolution.cycle} members' resolution`,
        `${resolution.approvers.length} of ${resolution.attendees} present approved; ${resolution.minutesRef || 'no minutes number'}`,
        undefined
      )
    );
  };

  /**
   * A share-out empties the box and the loan fund, so it gets the same two-key
   * ceremony as a loan: the officer holding the phone is identified by their own
   * PIN, key 1 moves no money, and a DIFFERENT officer must turn key 2. Groups
   * with only one officer can still close a cycle, but it is recorded as such.
   */
  const handleExecuteShareOut = (
    result: ShareOutResult,
    key?: { officerId: string; pin: string }
  ): ShareOutKeyResult => {
    if (currentUser.role === 'member') {
      return { error: language === 'LU' ? 'Abakiise tebafuna okugaba emigabo.' : 'Members cannot run a share-out.' };
    }
    if (isDefaultPin(currentUser.pin)) {
      if (key) {
        return { error: language === 'LU' ? 'Kyuusa PIN (1234) esooke — share-out tekola ku PIN 1234.' : 'Change your default PIN 1234 first. Share-out cannot run on a default PIN.' };
      }
      setIsAccountModalOpen(true);
      return { error: language === 'LU' ? 'Kyuusa PIN (1234) esooke — share-out tekola ku PIN 1234.' : 'Change your default PIN 1234 first. Share-out cannot run on a default PIN.' };
    }
    // Same gate as the screen: money never leaves the group on a split the
    // members have not approved.
    const policy = policyFor(vslaState.groupProfile);
    if (policy && !resolutionFor(vslaState.surplusResolutions, vslaState.cycle)) {
      return { error: language === 'LU' ? 'Abakiise tebakkiriza kugaba ssali kino.' : 'The members have not approved this surplus yet. Record their resolution first.' };
    }

    const live = shareOutForCycle(vslaState.shareOutApproval, vslaState.cycle);
    const keysPossible = twoKeyPossible(vslaState.availableAccounts);

    if (!key) {
      if (keysPossible) {
        return { error: language === 'LU' ? 'Abakulu abiri ba kikulu ba funa okuyoola bisumuluzo.' : 'Two different officers must turn the keys for a share-out.' };
      }
      runShareOut(result, { singleOfficer: currentUser.name });
      return { executed: true };
    }

    const check = verifyOfficerKey(vslaState.availableAccounts, key.officerId, key.pin, {
      requireApprover: true,
      language,
    });
    if (!check.ok) return { error: check.error || 'Unknown officer.' };

    const nowIso = new Date().toISOString();
    if (!live) {
      persistState(
        withAudit(
          { ...vslaState, shareOutApproval: firstKeyShareOut(vslaState.cycle, check.name, nowIso) },
          check.name,
          `First key (1/2) for cycle ${vslaState.cycle} share-out`,
          `UGX ${result.totalNetPayout.toLocaleString()} ready to pay ${result.payouts.length} members · needs a DIFFERENT officer for key 2/2 · no money moved`,
          undefined
        )
      );
      return { keyTurned: true };
    }
    if (sameName(live.firstApprovedBy, check.name)) {
      return { error: language === 'LU' ? `${check.name} yafula kisumuluzo 1/2 — omukulu omulala ayoola 2/2.` : `${check.name} already turned key 1/2. A different officer must turn key 2/2.` };
    }
    runShareOut(result, {
      firstBy: live.firstApprovedBy,
      firstAt: live.firstApprovedAt,
      secondBy: check.name,
      secondAt: nowIso,
    });
    return { executed: true };
  };

  const runShareOut = (
    result: ShareOutResult,
    auth: { firstBy?: string; firstAt?: string; secondBy?: string; secondAt?: string; singleOfficer?: string }
  ) => {
    const keys = auth.firstBy && auth.secondBy
      ? secondKeyShareOut(
          firstKeyShareOut(vslaState.cycle, auth.firstBy, auth.firstAt || new Date().toISOString()),
          auth.secondBy,
          auth.secondAt || new Date().toISOString()
        )
      : undefined;
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
          // Money the members did not approve as a dividend is carried forward,
          // never lost in the reset.
          saccoFunds: addSaccoFunds(vslaState.saccoFunds, result.plan),
          // The keys stay on the record: the cycle number is what makes them
          // expire, not the reset.
          shareOutApproval: keys || vslaState.shareOutApproval,
          cycle: vslaState.cycle + 1,
          cycleMonth: 1,
        },
        auth.secondBy || currentUser.name,
        auth.singleOfficer
          ? `Executed Cycle ${vslaState.cycle} share-out (single officer — no second officer available)`
          : `Executed Cycle ${vslaState.cycle} share-out with two keys`,
        `${auth.firstBy && auth.secondBy ? `Keys: ${auth.firstBy} then ${auth.secondBy}. ` : ''}${result.payouts.length} members paid UGX ${result.totalNetPayout.toLocaleString()}; loans recovered UGX ${result.totalDeductedLoans.toLocaleString()}${
          result.withheld > 0
            ? `; UGX ${result.withheld.toLocaleString()} withheld — reserve UGX ${result.plan.reserve.toLocaleString()}, education UGX ${result.plan.education.toLocaleString()}, operations UGX ${result.plan.operations.toLocaleString()}`
            : ''
        }`,
        result.totalNetPayout
      )
    );
  };

  // ---- Meeting wizard bulk commits (single state write each) ----
   const wizardSharePrice = groupSharePrice(vslaState.groupProfile);
   const wizardShareClassId = vslaState.groupProfile?.shareClasses?.find((shareClass) => shareClass.active)?.id || 'default';
   const wizardShareClassName = vslaState.groupProfile?.shareClasses?.find((shareClass) => shareClass.active)?.name || 'Standard share';
   const handleWizardShares = (items: { memberId: string; shares: number }[]) => {
    const maxShares = vslaState.groupProfile?.maxSharesPerMeeting || 5;
    const map = new Map(items.map((i) => [i.memberId, Math.min(maxShares, Math.max(0, i.shares))]));
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
         maxBorrowLimit: (m.sharesTotal + cost) * (vslaState.groupProfile?.borrowMultiplier || 3),
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
              ...sharePurchaseLedgerFields(wizardShareClassId, wizardShareClassName, n, wizardSharePrice),
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
          productSales: [...sales, ...(vslaState.productSales || [])].slice(0, 200),
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
    const member = vslaState.members.find((m) => m.id === memberId);
    if (!member || amount <= 0 || !reason.trim()) return;
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
     const nextState = appendNotifications(
       withAudit(
         { ...vslaState, approvals: [payout, ...vslaState.approvals] },
         currentUser.name,
         `Wizard: welfare payout requested ${payout.reqNumber}`,
         `${member.name} (#${member.no}) — ${reason}`,
         amount
       ),
       [
         {
           audience: 'officer',
           kind: 'welfare',
           approvalId: payout.id,
           title: `Welfare request from ${payout.memberName}`,
           body: `${payout.reqNumber} · UGX ${amount.toLocaleString()} needs approval.`,
           actionScreen: 'approvals',
         },
         {
           audience: 'member',
           memberNo: payout.memberNo,
           kind: 'welfare',
           approvalId: payout.id,
           title: 'Welfare request sent',
           body: `${payout.reqNumber} is waiting for the group’s approval.`,
           actionScreen: 'member_passbook',
         },
       ]
     );
     persistState(nextState);
  };

  const handleCompleteWizardMeeting = (countedCash: number, minutes: string, attendance?: Record<string, string>, discrepancyNote?: string) => {
    const meetingNo = vslaState.recentMeetingsCount + 1;
    const presentCount = Object.values(attendance || {}).filter((status) => status === 'present' || status === 'late').length;
    const totalMeetings = Math.max(1, vslaState.recentMeetingsCount + 1);
    const updatedMembers = attendance
      ? vslaState.members.map((member) => ({
          ...member,
          attendance: `${presentCount}/${totalMeetings} (${attendance[member.id] || 'unrecorded'})`,
        }))
      : vslaState.members;
    const sealed: VSLAState = withAudit(
      { ...vslaState, members: updatedMembers, recentMeetingsCount: meetingNo, boxCashBalance: countedCash },
      currentUser.name,
      `Wizard: sealed Meeting #${meetingNo} at UGX ${countedCash.toLocaleString()}`,
       `${minutes || 'No minutes recorded'}${discrepancyNote ? ` · Variance noted: ${discrepancyNote}` : ''}`,
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
    if (currentUser.role === 'member' && input.sellerType === 'group') return 'Only an officer can buy group stock.';
    if (currentUser.role === 'member' && input.sellerType === 'member' && input.sellerName && input.sellerName !== currentUser.name) return 'You can only list your own business.';
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
      sellerPhone: input.sellerPhone?.trim() || (input.sellerName === currentUser.name ? currentUser.phone : undefined),
      kind: input.sellerType === 'member' ? (input.kind || 'product') : 'product',
      imageUrl: input.imageUrl,
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

  const handleSellProduct = (sale: SaleInput): string | null => {
    if (currentUser.role === 'member') return 'Only an officer can record a sale.';
    const product = (vslaState.products || []).find((p) => p.id === sale.productId);
    if (!product) return 'Product not found.';
    const qty = Math.floor(sale.qty);
    if (qty <= 0) return 'Enter at least one item.';
    if (qty > product.stockQty) return `Only ${product.stockQty} ${product.unit} remain.`;
    const unitPrice = Math.floor(sale.unitPrice);
    if (unitPrice <= 0) return 'Enter a valid selling price.';
    const revenue = qty * unitPrice;
    const profit = (unitPrice - product.costPrice) * qty;
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
      unitPrice,
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
          productSales: [record, ...(vslaState.productSales || [])].slice(0, 200),
           boxCashBalance: isGroup && sale.method === 'cash' ? vslaState.boxCashBalance + revenue : vslaState.boxCashBalance,
           momoBalance: isGroup && sale.method === 'momo' ? (vslaState.momoBalance || 0) + revenue : vslaState.momoBalance,
           loanFundBalance: isGroup ? vslaState.loanFundBalance + profit : vslaState.loanFundBalance,
        },
        currentUser.name,
        `Sold ${qty} × ${product.name} to ${sale.buyer} (${sale.method})`,
        isGroup ? `Revenue UGX ${revenue.toLocaleString()} · profit UGX ${profit.toLocaleString()} to loan fund` : 'Member business sale (no fund movement)',
        revenue
      )
    );
    return null;
  };

  const handleAddExpense = (label: string, amount: number): string | null => {
    if (currentUser.role === 'member') return 'Only an officer can record group expenses.';
    const amt = Math.floor(amount);
    if (amt <= 0) return 'Enter a valid expense amount.';
    if (amt > vslaState.boxCashBalance) return 'The expense is larger than the cash in the box.';
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
    return null;
  };

  // ---- Member registration (MEM numbers, kin, account) ----
  const handleRegisterMember = (input: NewMemberInput): string | null => {
    if (currentUser.role === 'member') return 'Ask an officer to register a new member.';
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
    // Sell-ready: plan member caps (mirrors memberCap server-side).
    const plan = vslaState.groupProfile?.plan || 'free';
    const cap = memberCapForPlan(plan);
    if (vslaState.members.length >= cap) {
      return language === 'LU'
        ? `Plan ya free ekoma ku members ${cap}. Yongera ku Pro — WhatsApp.`
        : `Free plan allows ${cap} members. Upgrade to Pro to add more.`;
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
      // SACCO register: which class they joined, and since when
      shareClassId: shareClassesFor(vslaState.groupProfile)[0]?.id,
      memberSince: new Date().toISOString().slice(0, 10),
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
      pin: input.pin,
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
         `${name} (#${no}) · member PIN handed to the member`,
        undefined
      )
    );
    setSelectedMemberId(memberId);
    return null;
  };

  // ---- Member photo update (retake on passbook) ----
  const handleUpdatePhoto = (memberId: string, photoUrl: string) => {
    const target = vslaState.members.find((m) => m.id === memberId);
    if (!target) return;
    persistState(
      withAudit(
        {
          ...vslaState,
          members: vslaState.members.map((m) =>
            m.id === memberId ? { ...m, photoUrl } : m
          ),
        },
        currentUser.name,
        'Updated member photo',
        `${target.name} (#${target.no})`,
        undefined
      )
    );
  };

  // ---- Group settings (name, box, share price, welfare, cycle) ----
  const handleUpdateGroupSettings = (patch: GroupSettingsPatch) => {
    if (currentUser.role === 'member') return;
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
              cycle: vslaState.cycle,
              cycleMonth: vslaState.cycleMonth,
              totalCycleMonths: patch.totalCycleMonths,
              location: patch.location,
              meetingDay: patch.meetingDay,
               sharePrice: patch.sharePrice,
               shareClasses: patch.shareClasses,
               maxSharesPerMeeting: patch.maxSharesPerMeeting,
               requiredGuarantors: patch.requiredGuarantors,
               borrowMultiplier: patch.borrowMultiplier,
               loanMinimum: patch.loanMinimum,
               loanRates: patch.loanRates,
               welfareCategoryCaps: patch.welfareCategoryCaps,
               welfareMonthly: patch.welfareMonthly,
               // keep any SACCO fields already saved, then apply the patch
               sacco: { ...(vslaState.groupProfile?.sacco || {}), ...(patch.sacco || {}) },
               inviteCode: vslaState.inviteCode || '',
              plan: 'pro' as const,
              createdAt: new Date().toISOString(),
              adminName: currentUser.name,
              adminPhone: currentUser.phone,
            }),
            name: patch.groupName,
             boxIdentifier: patch.boxIdentifier,
             totalCycleMonths: patch.totalCycleMonths,
             location: patch.location,
            meetingDay: patch.meetingDay,
             sharePrice: patch.sharePrice,
             shareClasses: patch.shareClasses,
             maxSharesPerMeeting: patch.maxSharesPerMeeting,
             requiredGuarantors: patch.requiredGuarantors,
             borrowMultiplier: patch.borrowMultiplier,
             loanMinimum: patch.loanMinimum,
             loanRates: patch.loanRates,
             welfareCategoryCaps: patch.welfareCategoryCaps,
             welfareMonthly: patch.welfareMonthly,
             logoUrl: patch.logoUrl || undefined,
          },
        },
        currentUser.name,
        'Updated group settings',
        `${patch.groupName} · ${patch.boxIdentifier} · share UGX ${patch.sharePrice.toLocaleString()}${patch.logoUrl ? ' · new logo' : ''}`,
        undefined
      )
    );
    setSelectedBox(`${patch.groupName} • ${patch.boxIdentifier}`);
  };

  const selectedMember =
    vslaState.members.find((m) => m.id === selectedMemberId) || vslaState.members[0];

  // Member-first resolution: the signed-in account linked to a member record
  // sees their own dashboard, loan form, and requests. Falls back to the
  // secretary's browsed member so officer flows keep working.
  const myMember =
    vslaState.members.find((m) => m.id === currentUser.memberId) ||
    vslaState.members.find((m) => m.no === currentUser.memberNo) ||
    selectedMember;
  const myRequests = myMember
    ? vslaState.approvals.filter((a) => a.memberNo === myMember.no).slice().reverse()
    : [];
  const memberBusinesses = (vslaState.products || []).filter((p) => p.sellerType === 'member');
  const funds = fundBalances(vslaState);
  const fundsTotal = totalFunds(vslaState);
  const isMemberSelfService = currentUser.role === 'member' && !!myMember;
  const visibleNotifications = notificationsFor(vslaState, currentUser, myMember?.no);
  const notificationCount = unreadNotificationCount(vslaState, currentUser, myMember?.no);

  const saveNotificationReadState = (next: VSLAState) => {
    setVslaState(next);
    try {
      localStorage.setItem(isPracticeGroup(currentGroupId) ? 'vsla_practice_state_v1' : 'bakwata_vsla_state', JSON.stringify(next));
    } catch {}
    if (currentUser.role !== 'member') persistState(next);
  };

  const handleMarkNotificationRead = (id: string) => {
    saveNotificationReadState(markNotificationsRead(vslaState, currentUser, myMember?.no, [id]));
  };

  const handleMarkAllNotificationsRead = () => {
    saveNotificationReadState(markNotificationsRead(vslaState, currentUser, myMember?.no));
  };

  const handleOpenNotification = (notification?: AppNotification) => {
    handleNavigateScreen(notification?.actionScreen || (currentUser.role === 'member' ? 'member_home' : 'approvals'));
  };

  // Entry gate: strangers get real paths (join / register / sign in) plus a
  // clearly-labeled demo door. Seed accounts never greet real users.
  if (authEnforced && !sessionToken && !isPractice) {
    return (
      <WelcomeView
        language={language}
        onEnterPractice={handleEnterPractice}
        onLogin={handleLogin}
        availableGroups={visibleGroups}
        currentGroupId={currentGroupId}
        onSelectGroup={handleSelectGroup}
        onCreateGroup={handleCreateGroup}
        onJoinGroup={handleJoinGroup}
        logoUrl={vslaState.groupProfile?.logoUrl}
        localGroup={readLocalGroup()}
        onResumeLocalGroup={handleResumeLocalGroup}
        autoOpenTab={entryIntent === 'register' ? 'register' : undefined}
        autoFocusSignIn={entryIntent === 'login'}
      />
    );
  }

  const showLocalOnlyBanner = storageDriver !== null && storageShared === false;
  const t = getTranslations(language);

  // Sell-ready gate: on production-grade backends no SIGNED-IN default PIN
  // gets in. Sessionless visitors never reach here (welcome gate above).
  const pinGateEnforced = (authEnforced || storageDriver === 'postgres') && !isPractice;
  if (pinGateEnforced && sessionToken && isDefaultPin(currentUser.pin)) {
    return (
      <div className="min-h-screen bg-canvas-bg text-on-surface flex flex-col font-sans">
        <DefaultPinGate
          userName={currentUser.name}
          groupId={currentGroupId}
          accountId={currentUser.id}
          language={language}
          onChanged={(newPin) => applyLocalPin(newPin)}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-canvas-bg text-on-surface flex flex-col font-sans selection:bg-secondary/20 ${elderMode ? 'elder-mode' : ''} ${sunlightMode ? 'sunlight-mode' : ''}`}>
      {isPractice && (
        <div className="bg-[#EAB308] text-[#00261b] text-xs font-bold px-3 py-2 flex items-center justify-between gap-2 no-print sticky top-0 z-50">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">sports_esports</span>
            {language === 'LU' ? 'PRACTICE — Ssente za kuzannya, si za ddala' : 'PRACTICE MODE — play money, nothing real'}
          </span>
          <button
            type="button"
            onClick={handleExitPractice}
            className="px-3 py-1.5 bg-[#00261b] text-white rounded-lg text-xs font-bold active:scale-95"
          >
            {language === 'LU' ? 'Fuluma → ekibiina kyaffe' : 'Exit → my real group'}
          </button>
        </div>
      )}
      {/* No settings strip under the header — display options live in the top-bar menu. */}
      {!isBrowserOnline && (
        <div className="bg-[#FEF3C7] border-b border-[#fde68a] text-[#92400E] text-[11px] font-bold px-4 py-2 text-center flex items-center justify-center gap-2 flex-wrap no-print">
          <span className="material-symbols-outlined text-[16px]">cloud_off</span>
          <span>
            {language === 'LU'
              ? 'Tewali mutimbagano. Ebikuumibwa ku ssimu eno — tekiza n’okulaba bulungi.'
              : 'No signal. Everything you do still saves on this phone and syncs when signal returns.'}
          </span>
        </div>
      )}
      {vslaState.pendingSync && (
        <div className="bg-blue-50 border-b border-blue-200 text-blue-900 text-[11px] font-bold px-4 py-1.5 text-center flex items-center justify-center gap-2 flex-wrap">
          <span>
            {language === 'LU'
              ? 'Ekibiina kino tekiri ku yintaneeti — kikolebwa ku ssimu eno yokka.'
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
        <div className="bg-surface-container border-b border-border-line text-text-muted text-[11px] font-bold px-4 py-1.5 text-center">
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
         notificationCount={notificationCount}
         selectedBox={selectedBox}
        onSelectBox={setSelectedBox}
         onOpenNotifications={() => handleNavigateScreen('notifications')}
        onOpenBackup={() => handleNavigateScreen('backup')}
        currentUser={currentUser}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
        isOnline={isServerConnected}
        availableGroups={visibleGroups}
        currentGroupId={currentGroupId}
        onSelectGroup={handleSelectGroup}
        onOpenGroupModal={(tab) => {
          setGroupModalDefaultTab(tab || 'directory');
          setIsGroupModalOpen(true);
        }}
        onOpenShareInvite={() => setIsShareInviteOpen(true)}
        simpleMode={simpleMode}
        onToggleSimpleMode={toggleSimpleMode}
        elderMode={elderMode}
        onToggleElderMode={toggleElderMode}
        sunlightMode={sunlightMode}
        onToggleSunlightMode={toggleSunlightMode}
        onOpenPublicDisplay={() => setIsPublicDisplayOpen(true)}
        onOpenHelp={() => handleNavigateScreen('help')}
        logoUrl={vslaState.groupProfile?.logoUrl}
      />

      {/* Screen Router — lazy screens show a light loader on slow phones */}
      <div className="flex-1 flex flex-col">
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center space-y-2">
                <span className="material-symbols-outlined text-4xl text-text-muted animate-pulse">hourglass_top</span>
                <p className="text-xs text-text-muted font-bold">{language === 'LU' ? 'Kitegekebwa…' : 'Loading…'}</p>
              </div>
            </div>
          }
        >
        {currentScreen === 'home' && currentUser.role === 'member' && !showGroupHome && myMember && (
          <MemberHomeView
            member={myMember}
            requests={myRequests}
            memberBusinesses={memberBusinesses}
            groupName={vslaState.groupName || vslaState.groupProfile?.name || 'Savings Group'}
            language={language}
            onNavigate={handleNavigateScreen}
            onOpenGroupHome={() => setShowGroupHome(true)}
          />
        )}

        {currentScreen === 'home' && !(currentUser.role === 'member' && !showGroupHome && myMember) && (
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
            groupName={vslaState.groupName || vslaState.groupProfile?.name || 'Savings Group'}
            boxIdentifier={vslaState.boxIdentifier || vslaState.groupProfile?.boxIdentifier || 'BOX'}
            inviteCode={vslaState.inviteCode || vslaState.groupProfile?.inviteCode || ''}
            onOpenGroupModal={(tab) => {
              setGroupModalDefaultTab(tab || 'directory');
              setIsGroupModalOpen(true);
            }}
            onOpenShareInvite={() => setIsShareInviteOpen(true)}
            language={language}
            simpleMode={simpleMode}
            queueTotal={vslaState.approvals
              .filter((a) => a.status === 'pending')
              .reduce((s, a) => s + (a.amount || 0), 0)}
            cycle={vslaState.cycle}
            cycleMonth={vslaState.cycleMonth}
            totalCycleMonths={vslaState.totalCycleMonths}
             sharePrice={groupSharePrice(vslaState.groupProfile)}
            totalShares={vslaState.members.reduce((s, m) => s + (m.sharesCount || 0), 0)}
            myMemberName={myMember?.name}
            mySavings={myMember?.sharesTotal}
            myLoanBalance={myMember?.loanBalance}
            onOpenMyAccount={() => handleNavigateScreen('member_home')}
            marketCount={memberBusinesses.filter((p) => p.stockQty > 0).length}
            onOpenShop={() => handleNavigateScreen('shop')}
            momoBalance={funds.momo}
            bankBalance={funds.bank}
            fundTransfers={vslaState.fundTransfers || []}
            onTransferFunds={handleTransferFunds}
            canMoveFloat={hasPermission(currentUser, 'canLockBox')}
            isOnline={isServerConnected}
            showLocalOnly={showLocalOnlyBanner}
            hasMembers={vslaState.members.length > 1}
            hasMet={vslaState.recentMeetingsCount > 0}
            hasBackup={(vslaState.snapshots || []).length > 0}
          />
        )}

         {currentScreen === 'backup' && currentUser.role !== 'member' && (
          <BackupAuditView
            state={vslaState}
            onNavigate={handleNavigateScreen}
            onRestoreState={handleRestoreState}
            onCreateSnapshot={handleCreateSnapshot}
            onDeleteSnapshot={handleDeleteSnapshot}
             onResetToBaseline={handleResetToBaseline}
             onRefreshFromServer={fetchStateFromServer}
             isOnline={isServerConnected}
             isSyncing={isSyncing}
             storageShared={storageShared}
             isPractice={isPractice}
             language={language}
          />
        )}

        {currentScreen === 'legal' && (
          <LegalView
            onNavigate={handleNavigateScreen}
            language={language}
            groupName={vslaState.groupName || vslaState.groupProfile?.name || 'Savings Group'}
          />
        )}

         {currentScreen === 'reports' && currentUser.role !== 'member' && (
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
            groupName={vslaState.groupName || vslaState.groupProfile?.name || 'Savings Group'}
          />
        )}

        {currentScreen === 'help' && (
          <HelpView
            onNavigate={handleNavigateScreen}
            language={language}
            isPractice={isPractice}
            onEnterPractice={handleEnterPractice}
            onExitPractice={handleExitPractice}
            groupName={vslaState.groupName || vslaState.groupProfile?.name || 'Savings Group'}
            boxIdentifier={vslaState.boxIdentifier || vslaState.groupProfile?.boxIdentifier || ''}
            reporterName={currentUser.name}
          />
        )}

         {currentScreen === 'notifications' && (
          <NotificationsView
            notifications={visibleNotifications}
            currentUser={currentUser}
            language={language}
            onMarkRead={handleMarkNotificationRead}
            onMarkAllRead={handleMarkAllNotificationsRead}
            onOpen={handleOpenNotification}
          />
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
            canManageGroupStock={currentUser.role !== 'member'}
            currentUserName={currentUser.name}
            currentUserPhone={currentUser.phone}
          />
        )}

         {currentScreen === 'users' && currentUser.role !== 'member' && (
          <UsersView
            accounts={vslaState.availableAccounts || []}
            currentUser={currentUser}
            pending={vslaState.pendingOfficerChange}
            changeLog={vslaState.officerChanges || []}
            onOfficerKey={handleOfficerKey}
            onPendingOfficerKey={handlePendingOfficerKey}
            currentUserId={currentUser.id}
            authEnforced={authEnforced}
            onSwitchAccount={handleSwitchAccount}
            onLogout={handleLogout}
            onNavigate={handleNavigateScreen}
             directory={vslaState.members}
             language={language}
           />
        )}

         {currentScreen === 'group_settings' && currentUser.role !== 'member' && (
          <GroupSettingsView
            groupName={vslaState.groupName || vslaState.groupProfile?.name || 'Savings Group'}
            boxIdentifier={vslaState.boxIdentifier || vslaState.groupProfile?.boxIdentifier || 'BOX'}
            location={vslaState.groupProfile?.location || 'Kalerwe Market, Kawempe'}
            meetingDay={vslaState.groupProfile?.meetingDay || 'Every Friday 4:00 PM'}
             sharePrice={groupSharePrice(vslaState.groupProfile)}
             welfareMonthly={vslaState.groupProfile?.welfareMonthly || 5000}
             totalCycleMonths={vslaState.totalCycleMonths || 10}
             maxSharesPerMeeting={vslaState.groupProfile?.maxSharesPerMeeting || 5}
             requiredGuarantors={vslaState.groupProfile?.requiredGuarantors || 0}
             borrowMultiplier={vslaState.groupProfile?.borrowMultiplier || 3}
             loanMinimum={vslaState.groupProfile?.loanMinimum || 100000}
             loanRates={vslaState.groupProfile?.loanRates || { oneMonth: 5, twoMonths: 8, threeMonths: 10 }}
             welfareCategoryCaps={vslaState.groupProfile?.welfareCategoryCaps || { medical: 150000, bereavement: 200000, other: 100000 }}
             shareClasses={vslaState.groupProfile?.shareClasses || [{ id: 'standard', name: 'Standard share', price: vslaState.groupProfile?.sharePrice || 10000, active: true }]}
             sacco={vslaState.groupProfile?.sacco || {}}
             inviteCode={vslaState.inviteCode || vslaState.groupProfile?.inviteCode || ''}
            membersCount={vslaState.members.length}
            logoUrl={vslaState.groupProfile?.logoUrl}
            plan={vslaState.groupProfile?.plan || 'free'}
            language={language}
            onSave={handleUpdateGroupSettings}
            onNavigate={handleNavigateScreen}
          />
        )}

         {currentScreen === 'meeting_wizard' && currentUser.role !== 'member' && (
          <MeetingWizardView
            members={vslaState.members}
            products={vslaState.products || []}
            meetingNo={vslaState.recentMeetingsCount + 1}
             sharePrice={groupSharePrice(vslaState.groupProfile)}
             maxSharesPerMeeting={vslaState.groupProfile?.maxSharesPerMeeting || 5}
             loanRates={vslaState.groupProfile?.loanRates}
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
             currentUserName={currentUser.name}
            momoBalance={funds.momo}
            bankBalance={funds.bank}
            groupId={currentGroupId}
          />
        )}

         {currentScreen === 'meeting_close' && currentUser.role !== 'member' && (
          <MeetingCloseBoxView
             onOpenDiscrepancyModal={(details) => {
               setDiscrepancyDetails(details);
               setIsDiscrepancyModalOpen(true);
             }}
             onNavigate={handleNavigateScreen}
             expectedTotal={vslaState.boxCashBalance}
             meetingNumber={vslaState.recentMeetingsCount}
             language={language}
            onCompleteMeeting={(countedCash) => {
              persistState({
                ...vslaState,
                recentMeetingsCount: vslaState.recentMeetingsCount + 1,
                boxCashBalance: countedCash,
              });
            }}
            members={vslaState.members}
            groupName={vslaState.groupName || vslaState.groupProfile?.name || 'Savings Group'}
            groupId={currentGroupId}
          />
        )}

         {currentScreen === 'approvals' && currentUser.role !== 'member' && (
          <ApprovalsQueueView
             approvals={vslaState.approvals}
             onApprove={handleApproveItem}
             onRequestApprovalCode={handleRequestApprovalCode}
             onApproveWithCode={handleApproveWithCode}
             onConfirmPayout={handleConfirmPayout}
             onReject={handleRejectItem}
            dualAuth={authEnforced}
             currentUserName={currentUser.name}
             members={vslaState.members}
             officers={vslaState.availableAccounts || []}
             loanFundBalance={vslaState.loanFundBalance}
             welfareFundBalance={vslaState.welfareFundBalance}
             boxCashBalance={vslaState.boxCashBalance}
              momoBalance={funds.momo}
              language={language}
           />
        )}

        {currentScreen === 'member_home' && myMember && (
          <MemberHomeView
            member={myMember}
            requests={myRequests}
            memberBusinesses={memberBusinesses}
            groupName={vslaState.groupName || vslaState.groupProfile?.name || 'Savings Group'}
            language={language}
            onNavigate={handleNavigateScreen}
            onOpenGroupHome={currentUser.role === 'member' ? () => { setShowGroupHome(true); handleNavigateScreen('home'); } : undefined}
          />
        )}

         {currentScreen === 'member_passbook' && selectedMember && (
           <MemberPassbookView
            members={vslaState.members}
            selectedMember={selectedMember}
            onSelectMember={setSelectedMemberId}
            onNavigate={handleNavigateScreen}
            onRecordRepayment={handleRecordRepaymentInPassbook}
             onBuyShares={handleBuyShares}
             sharePrice={groupSharePrice(vslaState.groupProfile)}
             shareClasses={vslaState.groupProfile?.shareClasses}
             groupProfile={vslaState.groupProfile}
             cycle={vslaState.cycle}
             cycleMonth={vslaState.cycleMonth}
             totalCycleMonths={vslaState.totalCycleMonths}
             onAddMember={() => setIsAddMemberOpen(true)}
            onUpdatePhoto={handleUpdatePhoto}
            meetingNo={vslaState.recentMeetingsCount}
            language={language}
            groupName={vslaState.groupName || vslaState.groupProfile?.name || 'Savings Group'}
            boxIdentifier={vslaState.boxIdentifier || vslaState.groupProfile?.boxIdentifier || 'BOX'}
            issuerName={currentUser.name}
            viewerMemberId={myMember?.id}
            viewerIsOfficer={currentUser.role !== 'member'}
          />
         )}
         {currentScreen === 'member_passbook' && !selectedMember && (
           <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-12 flex-1 space-y-4">
             <section className="bg-surface-card border border-border-line rounded-xl p-5 text-center space-y-3">
               <span className="material-symbols-outlined text-4xl text-secondary">group_add</span>
               <h1 className="text-headline-md font-bold text-primary">No members yet</h1>
               <p className="text-sm text-text-muted">Add the first real member to open a passbook.</p>
               <button type="button" onClick={() => setIsAddMemberOpen(true)} className="min-h-[48px] px-5 bg-primary text-white rounded-lg font-bold">Add member</button>
             </section>
           </main>
         )}

         {currentScreen === 'momo_push' && (
          <MoMoPushView
            onNavigate={handleNavigateScreen}
            onSuccessTransaction={handleMoMoSuccess}
            language={language}
          />
        )}

        {currentScreen === 'new_loan' && (
          <NewLoanRequestView
             members={vslaState.members}
             onNavigate={handleNavigateScreen}
             requestAsMemberNo={isMemberSelfService ? myMember.no : undefined}
             language={language}
             requiredGuarantors={vslaState.groupProfile?.requiredGuarantors}
             borrowMultiplier={vslaState.groupProfile?.borrowMultiplier}
             loanMinimum={vslaState.groupProfile?.loanMinimum}
             loanRates={vslaState.groupProfile?.loanRates}
             secretaryName={vslaState.groupProfile?.adminName || 'Group secretary'}
             secretaryPhone={vslaState.groupProfile?.adminPhone || vslaState.availableAccounts?.find((account) => account.role === 'secretary')?.phone || ''}
             onSubmitLoan={handleSubmitNewLoan}
          />
        )}

         {currentScreen === 'share_out' && currentUser.role !== 'member' && (
          <CycleShareOutView
            members={vslaState.members}
            loanFundBalance={vslaState.loanFundBalance}
             finesCollected={
               vslaState.fines
                 .filter((f) => f.status === 'collected')
                 .reduce((sum, f) => sum + f.amount, 0)
             }
             sharePrice={groupSharePrice(vslaState.groupProfile)}
              cycle={vslaState.cycle}
              language={language}
             onNavigate={handleNavigateScreen}
            surplusPolicy={policyFor(vslaState.groupProfile)}
            resolution={resolutionFor(vslaState.surplusResolutions, vslaState.cycle)}
            saccoFunds={vslaState.saccoFunds}
            officers={vslaState.availableAccounts || []}
            shareOutApproval={vslaState.shareOutApproval}
            onRecordResolution={handleRecordSurplusResolution}
            onExecuteShareOut={handleExecuteShareOut}
          />
        )}

        {currentScreen === 'welfare_fund' && (
          <WelfareFundView
             welfareBalance={vslaState.welfareFundBalance}
             grants={vslaState.welfareGrants}
             categoryCaps={vslaState.groupProfile?.welfareCategoryCaps}
            members={vslaState.members}
             onDisburseGrant={handleDisburseWelfareGrant}
             canDisburseWelfare={hasPermission(currentUser, 'canDisburseWelfare')}
             onNavigate={handleNavigateScreen}
             language={language}
          />
        )}

        {currentScreen === 'audio_broadcast' && (
          <AudioBroadcastView
            onNavigate={handleNavigateScreen}
            boxCashBalance={vslaState.boxCashBalance}
            meetingNumber={vslaState.recentMeetingsCount}
            membersCount={vslaState.members.length}
            members={vslaState.members}
            groupName={vslaState.groupName || 'Savings Group'}
            inviteCode={vslaState.inviteCode || vslaState.groupProfile?.inviteCode || ''}
            language={language}
            onReminderLogged={(memberId, channel, kind) => {
              const m = vslaState.members.find((x) => x.id === memberId);
              persistState(
                withAudit(
                  vslaState,
                  currentUser.name,
                   `Opened ${kind} reminder via ${channel}`,
                  `${m?.name || memberId} (#${m?.no || '-'}) · ${m?.phone || 'no number'} · balance UGX ${(m?.loanBalance || 0).toLocaleString()}`,
                  m?.loanBalance
                )
              );
            }}
          />
        )}

         {currentScreen === 'constitution_fines' && currentUser.role !== 'member' && (
          <ConstitutionFinesView
            fines={vslaState.fines}
            onCollectFine={handleCollectFine}
            onWaiveFine={handleWaiveFine}
            onLevyFine={handleLevyFine}
             onNavigate={handleNavigateScreen}
             language={language}
             meetingNumber={vslaState.recentMeetingsCount + 1}
             members={vslaState.members}
          />
        )}
        </Suspense>
      </div>

      {/* Cash Discrepancy Modal */}
      <CashDiscrepancyModal
         isOpen={isDiscrepancyModalOpen}
         onClose={() => { setIsDiscrepancyModalOpen(false); setDiscrepancyDetails(null); }}
         onApplyAdjustment={handleDiscrepancyAdjustment}
         expectedTotal={discrepancyDetails?.expectedTotal ?? vslaState.boxCashBalance}
         countedTotal={discrepancyDetails?.countedTotal ?? vslaState.boxCashBalance}
         meetingNumber={discrepancyDetails?.meetingNumber ?? vslaState.recentMeetingsCount}
         difference={discrepancyDetails?.difference ?? 0}
         language={language}
       />

      {/* Actual Account Profile & Switcher Modal */}
      <AccountProfileModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        currentUser={currentUser}
        availableAccounts={vslaState.availableAccounts || []}
        members={vslaState.members}
         groupId={currentGroupId}
         language={language}
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
        availableGroups={visibleGroups}
        currentGroupId={currentGroupId}
        onSelectGroup={handleSelectGroup}
        onCreateGroup={handleCreateGroup}
        onJoinGroup={handleJoinGroup}
         defaultTab={groupModalDefaultTab}
         language={language}
       />

      {/* Member Invite Kit Modal */}
      <ShareInviteModal
        isOpen={isShareInviteOpen}
        onClose={() => setIsShareInviteOpen(false)}
        groupName={vslaState.groupName || vslaState.groupProfile?.name || 'Savings Group'}
        boxIdentifier={vslaState.boxIdentifier || vslaState.groupProfile?.boxIdentifier || 'BOX'}
         inviteCode={vslaState.inviteCode || vslaState.groupProfile?.inviteCode || ''}
         location={vslaState.groupProfile?.location || 'Kalerwe Market, Kawempe'}
         language={language}
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
      {showTour && <OnboardingTour language={language} role={currentUser.role} onDone={dismissTour} />}
      {!showTour && showWhatsNew && <WhatsNewModal onClose={dismissWhatsNew} />}

      <PublicDisplayModal
        isOpen={isPublicDisplayOpen}
        onClose={() => setIsPublicDisplayOpen(false)}
         state={vslaState}
         language={language}
       />

      <BootSplash
        logoUrl={vslaState.groupProfile?.logoUrl}
        groupName={vslaState.groupName || vslaState.groupProfile?.name}
      />

      {!langChosen && <LanguagePicker onPick={handleSelectLanguage} />}

      {/* Universal Sticky Bottom Navigation Bar */}
      <BottomNavBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingApprovalsCount={pendingApprovalsCount}
        onNavigateScreen={handleNavigateScreen}
        language={language}
        simpleMode={simpleMode}
        role={currentUser.role}
        permissions={{
          canLockBox: currentUser.permissions.canLockBox,
          canApproveLoans: currentUser.permissions.canApproveLoans,
          canManageBackups: currentUser.permissions.canManageBackups,
        }}
      />
    </div>
  );
}

export default App;
