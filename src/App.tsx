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
import { ReportsView, LATE_FINE_AMOUNT } from './views/ReportsView';
import { AboutView } from './views/AboutView';
import { HelpView } from './views/HelpView';
import { OnboardingTour, ONBOARDING_KEY, SEEN_VERSION_KEY } from './components/OnboardingTour';
import { WhatsNewModal } from './components/WhatsNewModal';
import { APP_VERSION } from './data/changelog';
import { withAudit } from './utils/audit';
import { ShareOutResult } from './utils/shareout';

export function App() {
  const [language, setLanguage] = useState<Language>('EN');
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('home');
  const [isDiscrepancyModalOpen, setIsDiscrepancyModalOpen] = useState(false);
  const [selectedBox, setSelectedBox] = useState('Bakwata Box 01 • Weekly Friday Cycle');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('m1');
  const [isServerConnected, setIsServerConnected] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

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
      const res = await fetch('/api/groups');
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
    try {
      setIsSyncing(true);
      const res = await fetch(`/api/state?groupId=${gid}`, {
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
      const res = await fetch(`/api/state?groupId=${currentGroupId}`, {
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
    try {
      const res = await fetch('/api/groups/create', {
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
        return { success: true, group: data.group, inviteCode: data.group?.inviteCode };
      } else {
        return { success: false, error: data.error || 'Failed to create savings group' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const handleJoinGroup = async (payload: JoinGroupPayload) => {
    try {
      const res = await fetch('/api/groups/join', {
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
    const updatedState: VSLAState = {
      ...vslaState,
      currentUser: account,
    };
    if (account.memberId) {
      setSelectedMemberId(account.memberId);
    }
    await persistState(updatedState);
    try {
      await fetch(`/api/accounts/switch?groupId=${currentGroupId}`, {
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

  const handleSelectPreset = async (presetId: string) => {
    try {
      setIsSyncing(true);
      const res = await fetch(`/api/seed/preset?groupId=${currentGroupId}`, {
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
  }, [fetchGroupsList, fetchStateFromServer, currentGroupId]);

  const pendingApprovalsCount = vslaState.approvals.filter((a) => a.status === 'pending').length;

  const handleToggleLanguage = () => {
    setLanguage((prev) => (prev === 'EN' ? 'LU' : 'EN'));
  };

  const handleNavigateScreen = (screen: ScreenId) => {
    setCurrentScreen(screen);
    if (screen === 'home') setActiveTab('home');
    else if (screen === 'meeting_close' || screen === 'audio_broadcast') setActiveTab('meetings');
    else if (screen === 'member_passbook') setActiveTab('members');
    else if (screen === 'new_loan') setActiveTab('loans');
    else if (screen === 'approvals') setActiveTab('approvals');
    else setActiveTab('more');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Approval Handlers
  const handleApproveItem = (id: string) => {
    const targetItem = vslaState.approvals.find((a) => a.id === id);
    if (!targetItem) return;

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
      item.id === id ? { ...item, status: 'approved' as const } : item
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
        `Approved ${targetItem.type.replace(/_/g, ' ')} ${targetItem.reqNumber}`,
        `${targetItem.memberName} (#${targetItem.memberNo})`,
        targetItem.amount
      )
    );
  };

  const handleRejectItem = (id: string) => {
    const targetItem = vslaState.approvals.find((a) => a.id === id);
    const updatedApprovals = vslaState.approvals.map((item) =>
      item.id === id ? { ...item, status: 'rejected' as const } : item
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
    const updatedMembers = vslaState.members.map((m) => {
      if (m.id === memberId) {
        const newLoanBalance = Math.max(0, m.loanBalance - amount);
        const newActiveLoan = m.activeLoan
          ? {
              ...m.activeLoan,
              repaid: m.activeLoan.repaid + amount,
              balance: Math.max(0, m.activeLoan.balance - amount),
            }
          : undefined;

        const newLedgerEntry = {
          id: 'led-' + Date.now(),
          title: 'Meeting #28: Loan Repayment (Cash)',
          badge: 'CASH',
          subtitle: `Physical cash received by box teller. Balance: UGX ${newLoanBalance.toLocaleString()}`,
          amountText: `+UGX ${amount.toLocaleString()}`,
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
          boxCashBalance: vslaState.boxCashBalance + amount,
          loanFundBalance: vslaState.loanFundBalance + amount,
        },
        currentUser.name,
        'Recorded loan repayment',
        `${targetMember?.name || 'Member'} (#${targetMember?.no || '-'})`,
        amount
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

  // Disburse Welfare Grant
  const handleDisburseWelfareGrant = (grant: WelfareGrant) => {
    persistState(
      withAudit(
        {
          ...vslaState,
          welfareFundBalance: Math.max(0, vslaState.welfareFundBalance - grant.amount),
          welfareGrants: [grant, ...vslaState.welfareGrants],
        },
        currentUser.name,
        'Disbursed welfare grant',
        `${grant.memberName} (#${grant.memberNo}) — ${grant.reason}`,
        grant.amount
      )
    );
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
      const res = await fetch('/api/backup/restore', {
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
      const res = await fetch('/api/backup/snapshot', {
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
      const res = await fetch('/api/backup/reset', { method: 'POST' });
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

  // Arrears automation: propose a standard late fine for a debtor
  const handleProposeArrearsFine = (member: Member) => {
    handleLevyFine({
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

  const selectedMember =
    vslaState.members.find((m) => m.id === selectedMemberId) || vslaState.members[0];

  return (
    <div className="min-h-screen bg-canvas-bg text-on-surface flex flex-col font-sans selection:bg-secondary/20">
      {/* Universal Top App Bar */}
      <TopAppBar
        language={language}
        onToggleLanguage={handleToggleLanguage}
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
        onSwitchAccount={handleSwitchAccount}
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

      {/* First-run tour + What's-new sheet */}
      {showTour && <OnboardingTour language={language} onDone={dismissTour} />}
      {!showTour && showWhatsNew && <WhatsNewModal onClose={dismissWhatsNew} />}

      {/* Universal Sticky Bottom Navigation Bar */}
      <BottomNavBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingApprovalsCount={pendingApprovalsCount}
        onNavigateScreen={handleNavigateScreen}
      />
    </div>
  );
}

export default App;
