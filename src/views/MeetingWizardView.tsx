import React, { useEffect, useMemo, useState } from 'react';
import { Language, Member, ScreenId, ShopProduct, VSLAState } from '../types';
import { changeDue, displayFineReason, gapNeedsSecondKey, GAP_TWO_KEY_THRESHOLD, STANDARD_FINE_REASONS } from '../utils/policy';
import { MemberAvatar } from '../components/MemberAvatar';
import { MemberFaceGrid } from '../components/MemberFaceGrid';
import { DenomCounter } from '../components/DenomCounter';

export interface WizardShareItem {
  memberId: string;
  shares: number;
}

export interface WizardRepayItem {
  memberId: string;
  amount: number;
}

export interface WizardFineItem {
  memberNo: string;
  memberName: string;
  reason: string;
  amount: number;
  paid: boolean;
}

export interface WizardLoanForm {
  memberId: string;
  amount: string;
  term: string;
}

interface MeetingWizardViewProps {
  members: Member[];
  products: ShopProduct[];
  meetingNo: number;
  sharePrice: number;
  welfareAmount: number;
  expectedCash: number;
  language?: Language;
  onNavigate: (screen: ScreenId) => void;
  onExit: () => void;
  onRecordSharesBulk: (items: WizardShareItem[]) => void;
  onCollectWelfareBulk: (memberIds: string[], amount: number) => void;
  onRequestWelfarePayout: (memberId: string, amount: number, reason: string) => void;
  onRecordRepaymentsBulk: (items: WizardRepayItem[]) => void;
  onSubmitLoan: (loan: { memberName: string; memberNo: string; amount: number; term: string; serviceFee: number; phone: string; provider: 'MTN' | 'Airtel' }) => void;
  onRecordFinesBulk: (items: WizardFineItem[]) => void;
  onRecordSalesBulk: (items: { productId: string; qty: number; unitPrice: number; buyer: string }[]) => void;
  onCompleteMeeting: (countedCash: number, minutes: string) => VSLAState | void;
  /** Download the sealed-state backup file (backup gate before leaving). */
  onDownloadBackup: (sealed: VSLAState) => void;
  onAdjustDiscrepancy: (amount: number, reason: string, method: string) => void;
  /** Name on the current account — enforces the 2-key gap rule. */
  currentUserName?: string;
  /** Floats excluded from the physical count — shown so nobody recounts them. */
  momoBalance?: number;
  bankBalance?: number;
  /** Owning group — a draft opened for another group is discarded, not merged. */
  groupId?: string;
}

type AttStatus = 'present' | 'late' | 'absent' | 'excused';

interface Draft {
  step: number;
  /** Schema version: v2 merged shares+welfare and fines+sales (was 8 steps). */
  v?: number;
  attendance: Record<string, AttStatus>;
  shares: Record<string, number>;
  welfareDone: string[];
  sharesRecorded: boolean;
  welfareRecorded: boolean;
  repaymentsRecorded: boolean;
  loansRecorded: boolean;
  finesRecorded: boolean;
  salesRecorded: boolean;
  counted: string;
  minutes: string;
  completed: boolean;
  /** First officer to acknowledge a big cash gap (needs a different 2nd). */
  gapFirstBy?: string;
  /** Group this draft belongs to — switching groups with an open draft discards it. */
  groupId?: string;
}

const DRAFT_KEY = 'vsla_meeting_draft_v1';
const MAX_SHARES = 5;

/** v1 (8 steps) → v2 (6 steps): shares+welfare and fines+sales merged. */
export function migrateDraftStep(oldStep: number): number {
  return [0, 1, 1, 2, 3, 4, 4, 5][oldStep] ?? 0;
}

const blankDraft = (): Draft => ({
  step: 0,
  v: 2,
  attendance: {},
  shares: {},
  welfareDone: [],
  sharesRecorded: false,
  welfareRecorded: false,
  repaymentsRecorded: false,
  loansRecorded: false,
  finesRecorded: false,
  salesRecorded: false,
  counted: '',
  minutes: '',
  completed: false,
});

function loadDraft(groupId: string): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = { ...blankDraft(), ...JSON.parse(raw) };
      // v1 → v2 migration: 8 steps became 6 (shares+welfare, fines+sales merged).
      if (parsed.v !== 2 && typeof parsed.step === 'number') {
        parsed.step = migrateDraftStep(parsed.step);
        parsed.v = 2;
      }
      // Draft ownership: a draft opened for another group is discarded, never
      // merged — mixing two groups' cash counts would corrupt both meetings.
      // Legacy drafts without a groupId are adopted into the current group.
      if (!parsed.groupId) {
        parsed.groupId = groupId;
        return parsed;
      }
      if (parsed.groupId === groupId) return parsed;
      localStorage.removeItem(DRAFT_KEY);
    }
  } catch {
    /* fresh */
  }
  return { ...blankDraft(), groupId };
}

/**
 * The core loop: guided weekly meeting — Attendance → Contribute
 * (shares + welfare) → Repayments → Loans → Fines & Sales → Close & Seal.
 * Action steps commit in bulk (one state write each) so figures never clobber.
 */
export const MeetingWizardView: React.FC<MeetingWizardViewProps> = ({
  members,
  products,
  meetingNo,
  sharePrice,
  welfareAmount,
  expectedCash,
  language = 'EN',
  onNavigate,
  onExit,
  onRecordSharesBulk,
  onCollectWelfareBulk,
  onRequestWelfarePayout,
  onRecordRepaymentsBulk,
  onSubmitLoan,
  onRecordFinesBulk,
  onRecordSalesBulk,
  onCompleteMeeting,
  onDownloadBackup,
  onAdjustDiscrepancy,
  currentUserName = 'Officer',
  momoBalance = 0,
  bankBalance = 0,
  groupId = '',
}) => {
  const [draft, setDraft] = useState<Draft>(() => loadDraft(groupId));
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [repayInputs, setRepayInputs] = useState<Record<string, string>>({});
  const [loanForm, setLoanForm] = useState<WizardLoanForm>({ memberId: members[0]?.id || '', amount: '', term: '3 months' });
  const [fineMember, setFineMember] = useState(members[0]?.id || '');
  const [fineReason, setFineReason] = useState('Late arrival');
  const [fineAmount, setFineAmount] = useState('2000');
  const [finePaid, setFinePaid] = useState(true);
  const [stagedFines, setStagedFines] = useState<WizardFineItem[]>([]);
  const [payoutMember, setPayoutMember] = useState(members[0]?.id || '');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutReason, setPayoutReason] = useState('');
  const [discrepancyNote, setDiscrepancyNote] = useState('');
  const [saleQty, setSaleQty] = useState<Record<string, number>>({});
  const [saleBuyer, setSaleBuyer] = useState('');
  // Backup gate: the sealed backup must be downloaded before leaving.
  const [backupDone, setBackupDone] = useState(false);
  const [lastSealed, setLastSealed] = useState<VSLAState | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* offline */
    }
  }, [draft]);

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const str = (en: string, lu: string) =>
    language === 'LU' ? lu  : en;

  const steps = [
    str('Attendance', 'Abakiise'),
    str('Contribute', 'Kunganyiza'),
    str('Repayments', 'Okusasula'),
    str('New Loans', 'Ebyewolo'),
    str('Fines & Sales', 'Engassi'),
    str('Close & Seal', 'Ggala & Siba'),
  ];
  const STEP_COUNT = steps.length;

  const attOf = (id: string): AttStatus => draft.attendance[id] || 'present';
  const presentIds = useMemo(
    () => members.filter((m) => attOf(m.id) === 'present' || attOf(m.id) === 'late').map((m) => m.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members, draft.attendance]
  );
  const attendanceCount = presentIds.length;

  const sharesTotal = Object.values(draft.shares).reduce((s, n) => s + (n || 0), 0);

  const countedNum = Number(draft.counted) || 0;
  const difference = draft.counted === '' ? 0 : countedNum - expectedCash;

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* noop */
    }
  };

  const commitShares = () => {
    const items = Object.entries(draft.shares)
      .filter(([, n]) => (n || 0) > 0)
      .map(([memberId, shares]) => ({ memberId, shares: Math.min(MAX_SHARES, shares || 0) }));
    if (items.length === 0) return;
    onRecordSharesBulk(items);
    patch({ sharesRecorded: true });
  };

  const commitWelfare = () => {
    const ids = presentIds.filter((id) => !draft.welfareDone.includes(id));
    if (ids.length === 0) return;
    onCollectWelfareBulk(ids, welfareAmount);
    patch({ welfareRecorded: true, welfareDone: [...draft.welfareDone, ...ids] });
  };

  const commitRepayments = () => {
    const items = Object.entries(repayInputs)
      .map(([memberId, v]) => ({ memberId, amount: Math.floor(Number(v) || 0) }))
      .filter((x) => x.amount > 0);
    if (items.length === 0) return;
    onRecordRepaymentsBulk(items);
    setRepayInputs({});
    patch({ repaymentsRecorded: true });
  };

  const debtors = members.filter((m) => (m.loanBalance || 0) > 0);
  const loanMember = members.find((m) => m.id === loanForm.memberId) || members[0];
  const loanAmt = Math.floor(Number(loanForm.amount) || 0);
  const loanEligible = loanMember
    ? loanAmt > 0 &&
      loanAmt <= (loanMember.maxBorrowLimit || 0) &&
      (loanMember.loanBalance || 0) === 0
    : false;

  const commitLoan = () => {
    if (!loanMember || !loanEligible) return;
    onSubmitLoan({
      memberName: loanMember.name,
      memberNo: loanMember.no,
      amount: loanAmt,
      term: loanForm.term,
      serviceFee: Math.round(loanAmt * 0.1),
      phone: loanMember.phone,
      provider: loanMember.provider,
    });
    setLoanForm({ memberId: loanMember.id, amount: '', term: '3 months' });
    patch({ loansRecorded: true });
  };

  const stageFine = () => {
    const m = members.find((x) => x.id === fineMember);
    if (!m) return;
    const amt = Math.floor(Number(fineAmount) || 0);
    if (amt <= 0) return;
    setStagedFines((f) => [
      ...f,
      { memberNo: m.no, memberName: m.name, reason: fineReason, amount: amt, paid: finePaid },
    ]);
  };

  const commitFines = () => {
    if (stagedFines.length === 0) return;
    onRecordFinesBulk(stagedFines);
    setStagedFines([]);
    patch({ finesRecorded: true });
  };

  const groupProducts = products.filter((p) => p.sellerType === 'group' && p.stockQty > 0);

  const commitSales = () => {
    const items = Object.entries(saleQty)
      .map(([productId, qty]) => ({ productId, qty: Math.max(0, Math.floor(qty || 0)), unitPrice: products.find((p) => p.id === productId)?.salePrice || 0, buyer: saleBuyer.trim() || 'Meeting sales' }))
      .filter((x) => x.qty > 0 && x.unitPrice > 0);
    if (items.length === 0) return;
    onRecordSalesBulk(items);
    setSaleQty({});
    setSaleBuyer('');
    patch({ salesRecorded: true });
  };

  const commitPayout = () => {
    const amt = Math.floor(Number(payoutAmount) || 0);
    if (!payoutMember || amt <= 0 || !payoutReason.trim()) return;
    onRequestWelfarePayout(payoutMember, amt, payoutReason.trim());
    setPayoutAmount('');
    setPayoutReason('');
  };

  const finishMeeting = () => {
    if (draft.counted === '') return;
    if (difference !== 0 && !discrepancyNote.trim()) return;
    // Gap 3c: big cash gaps need TWO different officers to seal.
    if (draft.counted !== '' && difference !== 0 && gapNeedsSecondKey(Math.abs(difference))) {
      const me = (currentUserName || '').trim() || 'Officer';
      if (!draft.gapFirstBy) {
        patch({ gapFirstBy: me });
        return;
      }
      if (draft.gapFirstBy.trim().toLowerCase() === me.toLowerCase()) {
        alert(
          language === 'LU'
            ? `${me} yakkirizza ng'omukulu asooka. Omukulu omulala eyeetongodde yeetaagisa okuggala. Kyusa akawunti oluvannyuma lw'okukkiriza.`
            : `${me} already acknowledged this gap as first officer. A DIFFERENT officer must seal. Switch account first.`
        );
        return;
      }
    }
    if (difference !== 0) {
      onAdjustDiscrepancy(
        Math.abs(difference),
        `Meeting #${meetingNo} count variance: ${discrepancyNote.trim()}`,
        difference < 0 ? 'welfare' : 'topup'
      );
    }
    const sealed = onCompleteMeeting(countedNum, draft.minutes.trim());
    // Backup gate (gap 5b): the sealed file downloads NOW, in the seal tap.
    if (sealed) {
      try {
        onDownloadBackup(sealed);
        setBackupDone(true);
      } catch {
        /* manual button below */
      }
      setLastSealed(sealed);
    }
    clearDraft();
    setReviewConfirmed(false);
    patch({ completed: true });
  };

  const stepBtn = (label: string, onClick: () => void, primary = true, disabled = false) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full min-h-[48px] rounded-lg font-bold text-sm active:scale-[0.99] transition disabled:opacity-40 ${
        primary ? 'bg-[#006d30] text-white hover:bg-emerald-700' : 'bg-white border border-[#CBD5E1] text-[#00261b]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-14 flex-1 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onExit}
            className="w-9 h-9 rounded-lg bg-white border border-[#CBD5E1] flex items-center justify-center text-[#00261b] active:scale-95"
            type="button"
            aria-label="Exit wizard"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
          <div>
            <h1 className="font-bold text-[#00261b]">
              {str(`Meeting #${meetingNo} Wizard`, `Olukuŋŋaana #${meetingNo}`)}
            </h1>
            <p className="text-xs text-[#4B5563]">{str('Complete in one sitting — draft auto-saves', 'Maliriza omulundi gumu')}</p>
          </div>
        </div>
        <span className="font-mono text-xs font-bold text-[#00261b] bg-white px-2 py-1 rounded border">
          {draft.step + 1}/{STEP_COUNT}
        </span>
      </div>

      {/* Step rail */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-bold text-[#00261b] text-lg leading-tight">{steps[draft.step]}</h2>
          <span className="font-mono text-xs font-bold text-[#4B5563] shrink-0">
            {str('Step', 'Omutendera')} {draft.step + 1}/{STEP_COUNT}
          </span>
        </div>
        <div className="w-full bg-[#E5E7EB] rounded-full h-2 mt-2 overflow-hidden">
          <div className="bg-[#006d30] h-2 rounded-full transition-all" style={{ width: `${((draft.step + 1) / STEP_COUNT) * 100}%` }} />
        </div>
      </div>
      <div className="flex gap-1">
        {steps.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => patch({ step: i })}
            className={`flex-1 rounded-lg py-1.5 text-[11px] font-bold transition truncate px-0.5 ${
              i === draft.step
                ? 'bg-[#00261b] text-white'
                : i < draft.step
                ? 'bg-[#DCFCE7] text-[#166534]'
                : 'bg-white text-[#4B5563] border border-[#E5E7EB]'
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {/* STEP 1: ATTENDANCE */}
      {draft.step === 0 && (
        <section className="space-y-2">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-[#00261b] uppercase tracking-wider">{steps[0]}</h3>
              <p className="text-[11px] text-[#4B5563]">{attendanceCount}/{members.length} {str('present or late', 'beetabye')}</p>
            </div>
            <button
              type="button"
              onClick={() => patch({ attendance: {} })}
              className="text-[11px] font-bold text-[#006d30] underline"
            >
              {str('Mark all present', 'Bonnna beetabye')}
            </button>
          </div>
          {members.map((m) => (
            <div key={m.id} className="bg-white rounded-xl border border-[#E5E7EB] p-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0 flex items-center gap-2">
                <MemberAvatar name={m.name} initials={m.initials} photoUrl={m.photoUrl} sizeClass="w-9 h-9 text-xs" />
                <p className="text-xs font-bold truncate">{m.name} <span className="font-mono text-[#4B5563]">#{m.no}</span></p>
              </div>
              <div className="flex gap-1 shrink-0">
                {(['present', 'late', 'absent', 'excused'] as AttStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => patch({ attendance: { ...draft.attendance, [m.id]: s } })}
                    className={`px-2 py-1.5 rounded-md text-[10px] font-bold capitalize ${
                      attOf(m.id) === s ? 'bg-[#00261b] text-white' : 'bg-[#F6F7F6] text-[#4B5563] border border-[#E5E7EB]'
                    }`}
                  >
                    {s[0].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {stepBtn(str('Continue to Shares →', 'Weeyongereyo →'), () => patch({ step: 1 }))}
        </section>
      )}

      {/* STEP 2: CONTRIBUTE — shares first, welfare right below, one screen */}
      {draft.step === 1 && (
        <section className="space-y-2">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
            <h3 className="text-xs font-bold text-[#00261b] uppercase tracking-wider">{steps[1]} · {str('Shares', 'Emigabo')}</h3>
            <p className="text-[11px] text-[#4B5563] mt-0.5">
              UGX {sharePrice.toLocaleString()} {str('per share · max 5 · total staged:', 'buli mugabo ·')} <strong className="font-mono">{sharesTotal}</strong>
            </p>
          </div>
          {presentIds.map((id) => {
            const m = members.find((x) => x.id === id);
            if (!m) return null;
            const n = draft.shares[id] || 0;
            return (
              <div key={id} className="bg-white rounded-xl border border-[#E5E7EB] p-2.5 flex items-center justify-between gap-2">
                <p className="text-xs font-bold truncate">{m.name} <span className="font-mono text-[#4B5563]">#{m.no}</span></p>
                <div className="flex items-center gap-2 shrink-0">
                  <button type="button" onClick={() => patch({ shares: { ...draft.shares, [id]: Math.max(0, n - 1) } })} className="w-9 h-9 rounded-lg bg-[#F6F7F6] border border-[#E5E7EB] font-bold">−</button>
                  <span className="font-mono font-bold w-5 text-center">{n}</span>
                  <button type="button" onClick={() => patch({ shares: { ...draft.shares, [id]: Math.min(MAX_SHARES, n + 1) } })} className="w-9 h-9 rounded-lg bg-[#00261b] text-white font-bold">+</button>
                </div>
              </div>
            );
          })}
          {draft.sharesRecorded && <p className="text-xs font-bold text-[#166534]">✓ {str('Recorded to passbooks', 'Kikoseddwa')}</p>}
          {stepBtn(
            `${str('Record', 'Kaza')} ${sharesTotal} ${str('shares', 'emigabo')} (UGX ${(sharesTotal * sharePrice).toLocaleString()})`,
            () => {
              if (!draft.sharesRecorded) commitShares();
            },
            true,
            sharesTotal === 0 && !draft.sharesRecorded
          )}
          {/* WELFARE — collected on the same screen, straight below shares */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
            <h3 className="text-xs font-bold text-[#00261b] uppercase tracking-wider">{steps[1]} · {str('Welfare', 'Obuyambi')}</h3>
            <p className="text-[11px] text-[#4B5563] mt-0.5">
              UGX {welfareAmount.toLocaleString()} {str('from each present member', 'buli mukiise')}
            </p>
          </div>
          {stepBtn(
            draft.welfareRecorded
              ? str('Continue to Repayments →', 'Weeyongereyo →')
              : `${str('Collect from', 'Kunganyiza okuva ku')} ${presentIds.filter((id) => !draft.welfareDone.includes(id)).length} ${str('members', 'bakiise')} (UGX ${(presentIds.filter((id) => !draft.welfareDone.includes(id)).length * welfareAmount).toLocaleString()})`,
            () => {
              if (!draft.welfareRecorded) commitWelfare();
              else patch({ step: 2 });
            }
          )}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-2">
            <h4 className="text-xs font-bold text-[#00261b]">{str('Request emergency payout (goes to approvals)', 'Saba obuyambi (kugenda mu approvals)')}</h4>
            <MemberFaceGrid members={members} value={payoutMember} onChange={setPayoutMember} layout="row" />
            <div className="flex gap-2">
              <input value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} inputMode="numeric" placeholder="UGX" className="flex-1 min-h-[44px] border border-[#E5E7EB] rounded-lg px-3 text-sm font-mono" />
              <input value={payoutReason} onChange={(e) => setPayoutReason(e.target.value)} placeholder={str('Reason (e.g. hospital)', 'Ensonga')} className="flex-[2] min-h-[44px] border border-[#E5E7EB] rounded-lg px-3 text-sm" />
            </div>
            {stepBtn(str('Send payout request', 'Weereza okusaba'), commitPayout, false, !(Math.floor(Number(payoutAmount) || 0) > 0 && payoutReason.trim()))}
          </div>
        </section>
      )}

      {/* STEP 3: REPAYMENTS */}
      {draft.step === 2 && (
        <section className="space-y-2">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
            <h3 className="text-xs font-bold text-[#00261b] uppercase tracking-wider">{steps[2]}</h3>
            <p className="text-[11px] text-[#4B5563] mt-0.5">{debtors.length} {str('members owe', 'beebbanja')}</p>
            {(() => {
              const entered = debtors.reduce((s, m) => s + Math.max(0, Math.floor(Number(repayInputs[m.id] || 0))), 0);
              const owed = debtors.reduce((s, m) => s + (m.loanBalance || 0), 0);
              return (
                <div className="mt-2 pt-2 border-t border-[#E5E7EB] flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#00261b]">
                    {str('Entered:', 'Oteekeddemu:')} <span className="font-mono">UGX {entered.toLocaleString()}</span>
                  </span>
                  <span className="text-[11px] text-[#4B5563]">
                    {str('of', 'ku')} <span className="font-mono">UGX {owed.toLocaleString()}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const full: Record<string, string> = {};
                      debtors.forEach((m) => { full[m.id] = String(m.loanBalance || 0); });
                      setRepayInputs(full);
                    }}
                    className="text-[11px] font-bold text-[#006d30] underline shrink-0"
                  >
                    {str('Fill all full', 'Jjuza zonna')}
                  </button>
                </div>
              );
            })()}
          </div>
          {debtors.length === 0 && <p className="text-xs font-bold text-[#166534] bg-[#DCFCE7] rounded-lg p-3">{str('No outstanding loans. All clean!', 'Tewali bbanja!')}</p>}
          {debtors.map((m) => (
            <div key={m.id} className="bg-white rounded-xl border border-[#E5E7EB] p-2.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex items-center gap-2">
                  <MemberAvatar name={m.name} initials={m.initials} photoUrl={m.photoUrl} sizeClass="w-9 h-9 text-xs" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{m.name} <span className="font-mono text-[#4B5563]">#{m.no}</span></p>
                    <p className="text-[11px] font-mono text-[#B91C1C]">{str('Owes', 'Abbanja')} UGX {m.loanBalance.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    value={repayInputs[m.id] || ''}
                    onChange={(e) => setRepayInputs({ ...repayInputs, [m.id]: e.target.value })}
                    inputMode="numeric"
                    placeholder="UGX"
                    className="w-24 min-h-[44px] border border-[#E5E7EB] rounded-lg px-3 text-sm font-mono text-right"
                  />
                  <button
                    type="button"
                    onClick={() => setRepayInputs({ ...repayInputs, [m.id]: String(m.loanBalance || 0) })}
                    className="px-2 min-h-[44px] rounded-lg bg-[#F6F7F6] border border-[#E5E7EB] text-[11px] font-bold text-[#006d30]"
                    title={str('Fill full balance', 'Jjuza zonna')}
                  >
                    {str('Full', 'Zonna')}
                  </button>
                </div>
              </div>
              {changeDue(Number(repayInputs[m.id] || 0), m.loanBalance) > 0 && (
                <p className="text-[11px] font-bold text-[#92400E] bg-[#FEF3C7] rounded-lg p-2">
                  {str('Change due:', 'Zzaayo:')} UGX {changeDue(Number(repayInputs[m.id] || 0), m.loanBalance).toLocaleString()} — {str('hand back cash', 'zzaayo nkalu')}
                </p>
              )}
            </div>
          ))}
          {draft.repaymentsRecorded && <p className="text-xs font-bold text-[#166534]">✓ {str('Recorded', 'Kikoseddwa')}</p>}
          {stepBtn(
            draft.repaymentsRecorded ? str('Continue to New Loans →', 'Weeyongereyo →') : str('Record repayments', 'Kaza okusasula'),
            () => {
              if (!draft.repaymentsRecorded) commitRepayments();
              else patch({ step: 3 });
            }
          )}
          {!draft.repaymentsRecorded && (
            <button type="button" onClick={() => patch({ step: 3 })} className="w-full text-xs font-bold text-[#4B5563] underline">{str('Skip for now', 'Buuka')}</button>
          )}
        </section>
      )}

      {/* STEP 4: NEW LOANS */}
      {draft.step === 3 && (
        <section className="space-y-2">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-2">
            <h3 className="text-xs font-bold text-[#00261b] uppercase tracking-wider">{steps[3]}</h3>
            <MemberFaceGrid members={members} value={loanForm.memberId} onChange={(memberId) => setLoanForm({ ...loanForm, memberId })} layout="row" />
            {loanMember && (
              <p className="text-[11px] text-[#4B5563]">
                {str('Saved', 'Enterekanya')} UGX {loanMember.sharesTotal.toLocaleString()} · {str('Max', 'Ekkomo')} UGX {(loanMember.maxBorrowLimit || 0).toLocaleString()}
                {(loanMember.loanBalance || 0) > 0 && <span className="text-[#B91C1C] font-bold"> · {str('has active loan — must clear first', 'alina bbanja')}</span>}
              </p>
            )}
            <div className="flex gap-2">
              <input value={loanForm.amount} onChange={(e) => setLoanForm({ ...loanForm, amount: e.target.value })} inputMode="numeric" placeholder="UGX" className="flex-1 min-h-[44px] border border-[#E5E7EB] rounded-lg px-3 text-sm font-mono" />
              <select value={loanForm.term} onChange={(e) => setLoanForm({ ...loanForm, term: e.target.value })} className="flex-1 min-h-[44px] border border-[#E5E7EB] rounded-lg px-3 text-sm bg-white">
                {['1 month', '2 months', '3 months'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {loanAmt > 0 && !loanEligible && (
              <p className="text-[11px] font-bold text-[#B91C1C]">{str('Blocked: exceeds limit or member has an active loan.', 'Kigaaniddwa: esukka ekkomo oba alina bbanja.')}</p>
            )}
            {stepBtn(str('Submit for approval', 'Weereza'), commitLoan, true, !loanEligible)}
            {draft.loansRecorded && <p className="text-xs font-bold text-[#166534]">✓ {str('Request queued for executives', 'Kisindikiddwa')}</p>}
          </div>
          {stepBtn(str('Continue to Fines →', 'Weeyongereyo →'), () => patch({ step: 4 }), false)}
        </section>
      )}

      {/* STEP 5: FINES & SALES — levies first, shop right below, one screen */}
      {draft.step === 4 && (
        <section className="space-y-2">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-2">
            <h3 className="text-xs font-bold text-[#00261b] uppercase tracking-wider">{steps[4]} · {str('Fines', 'Engassi')}</h3>
            <MemberFaceGrid members={members} value={fineMember} onChange={setFineMember} layout="row" />
            <div className="flex flex-wrap gap-1.5">
              {STANDARD_FINE_REASONS.slice(0, 4).map((r) => (
                <button key={r.en} type="button" onClick={() => setFineReason(r.en)} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${fineReason === r.en ? 'bg-[#00261b] text-white' : 'bg-[#F6F7F6] border border-[#E5E7EB]'}`}>
                  {language === 'LU' ? r.lu : r.en}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={fineAmount} onChange={(e) => setFineAmount(e.target.value)} inputMode="numeric" placeholder="UGX" className="flex-1 min-h-[44px] border border-[#E5E7EB] rounded-lg px-3 text-sm font-mono" />
              <button type="button" onClick={() => setFinePaid(!finePaid)} className={`flex-1 min-h-[44px] rounded-lg text-xs font-bold border ${finePaid ? 'bg-[#DCFCE7] border-[#006d30] text-[#166534]' : 'bg-white border-[#E5E7EB] text-[#4B5563]'}`}>
                {finePaid ? str('Paid now → welfare', 'Asasudde → obuyambi') : str('Pending', 'Kyakulinda')}
              </button>
            </div>
            {stepBtn(str('Add fine to list', 'Teekamu engassi'), stageFine, false)}
          </div>
          {stagedFines.map((f, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] p-2.5 flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold">{f.memberName} · {displayFineReason(f.reason, language)} · <span className="font-mono">UGX {f.amount.toLocaleString()}</span> · {f.paid ? str('paid', 'asasudde') : str('pending', 'ekyakulinda')}</span>
              <button type="button" onClick={() => setStagedFines(stagedFines.filter((_, j) => j !== i))} className="text-[#B91C1C] font-bold px-2">✕</button>
            </div>
          ))}
          {draft.finesRecorded && <p className="text-xs font-bold text-[#166534]">✓ {str('Recorded', 'Kikoseddwa')}</p>}
          {stepBtn(
            `${str('Record', 'Kaza')} ${stagedFines.length} ${str('fine(s)', 'engassi')}`,
            () => {
              if (!draft.finesRecorded) commitFines();
            },
            true,
            stagedFines.length === 0 && !draft.finesRecorded
          )}
          {/* SALES — same screen, straight below fines */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
            <h3 className="text-xs font-bold text-[#00261b] uppercase tracking-wider">{steps[4]} · {str('Sales', 'Okutunda')}</h3>
            <p className="text-[11px] text-[#4B5563] mt-0.5">{str('Group stock only · profit returns to the loan fund', 'Ebyamaguzi byekibiina byokka')}</p>
          </div>
          {groupProducts.length === 0 && (
            <p className="text-xs text-[#4B5563] bg-white border border-[#E5E7EB] rounded-xl p-4 text-center">
              {str('No group stock. Add products in Shop first.', 'Tewali bintu. Yongera mu Shop.')}
            </p>
          )}
          {groupProducts.map((p) => {
            const q = saleQty[p.id] || 0;
            return (
              <div key={p.id} className="bg-white rounded-xl border border-[#E5E7EB] p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{p.name}</p>
                  <p className="text-[11px] font-mono text-[#4B5563]">{str('Stock:', 'Zisigadde:')} {p.stockQty} · UGX {p.salePrice.toLocaleString()}/{p.unit}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button type="button" onClick={() => setSaleQty({ ...saleQty, [p.id]: Math.max(0, q - 1) })} className="w-9 h-9 rounded-lg bg-[#F6F7F6] border border-[#E5E7EB] font-bold">−</button>
                  <span className="font-mono font-bold w-5 text-center">{q}</span>
                  <button type="button" onClick={() => setSaleQty({ ...saleQty, [p.id]: Math.min(p.stockQty, q + 1) })} className="w-9 h-9 rounded-lg bg-[#00261b] text-white font-bold">+</button>
                </div>
              </div>
            );
          })}
          {groupProducts.length > 0 && (
            <input value={saleBuyer} onChange={(e) => setSaleBuyer(e.target.value)} placeholder={str('Buyer / note (optional)', 'Aguzze')} className="w-full min-h-[44px] border border-[#E5E7EB] rounded-lg px-3 text-sm bg-white" />
          )}
          {draft.salesRecorded && <p className="text-xs font-bold text-[#166534]">✓ {str('Recorded', 'Kikoseddwa')}</p>}
          {stepBtn(
            draft.salesRecorded ? str('Continue to Close →', 'Weeyongereyo →') : str('Record sales', 'Kaza okutunda'),
            () => {
              if (!draft.salesRecorded) commitSales();
              else patch({ step: 5 });
            },
            true,
            Object.values(saleQty).every((q) => !(q > 0)) && !draft.salesRecorded
          )}
          {!draft.salesRecorded && (
            <button type="button" onClick={() => patch({ step: 5 })} className="w-full text-xs font-bold text-[#4B5563] underline">{str('No sales — go to Close', 'Tewali kutunda')}</button>
          )}
        </section>
      )}

      {/* STEP 6: CLOSE & SEAL */}
      {draft.step === 5 && (
        <section className="space-y-2">
          <div className="bg-[#0b3d2e] text-white rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#bcedd7]">{steps[5]}</h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xs text-white/70">{str('Expected in box:', 'Ezisuubirwa:')}</span>
              <span className="font-mono text-xl font-bold">UGX {expectedCash.toLocaleString()}</span>
            </div>
            {(momoBalance > 0 || bankBalance > 0) && (
              <p className="text-[11px] text-[#bcedd7] mt-1">
                {str(
                  `Count cash only — MoMo UGX ${momoBalance.toLocaleString()} + bank UGX ${bankBalance.toLocaleString()} stay where they are.`,
                  `Bala nkalu zokka — MoMo UGX ${momoBalance.toLocaleString()} ne banka UGX ${bankBalance.toLocaleString()} bisigala we biri.`
                )}
              </p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-2">
            <label className="text-xs font-bold text-[#00261b] block">{str('Physical cash counted', 'Ssente ezibaliddwa')} (UGX)</label>
            <input value={draft.counted} onChange={(e) => patch({ counted: e.target.value, gapFirstBy: undefined })} inputMode="numeric" placeholder="e.g. 1450000" className="w-full min-h-[52px] border-2 border-[#00261b] rounded-lg px-3 font-mono text-lg" />
            <DenomCounter
              language={language}
              onTotal={(t) => patch({ counted: String(t), gapFirstBy: undefined })}
            />
            {draft.counted !== '' && (
              <div className={`p-3 rounded-lg text-xs font-bold ${difference === 0 ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF3C7] text-[#92400E]'}`}>
                {difference === 0
                  ? str('✓ Perfectly balanced. Ready to seal.', '✓ Birina bulungi.')
                  : `${difference > 0 ? str('Surplus', 'Zisukkiridde') : str('Shortage', 'Zibula')}: UGX ${Math.abs(difference).toLocaleString()}`}
              </div>
            )}
            {draft.counted !== '' && difference !== 0 && (
              <input value={discrepancyNote} onChange={(e) => setDiscrepancyNote(e.target.value)} placeholder={str('Explain the gap (required)', 'Nyonyola enjawulo')} className="w-full min-h-[44px] border border-[#E5E7EB] rounded-lg px-3 text-sm" />
            )}
            {draft.counted !== '' && difference !== 0 && gapNeedsSecondKey(Math.abs(difference)) && (
              <div className="p-3 rounded-lg text-xs font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                {draft.gapFirstBy
                  ? str(`Key 1/2 by ${draft.gapFirstBy} — a DIFFERENT officer must seal (gap ≥ UGX ${GAP_TWO_KEY_THRESHOLD.toLocaleString()}).`, `Ekisumuluzo 1/2 kya ${draft.gapFirstBy} — omukulu omulala eyeetongodde asibe.`)
                  : str(`Big gap (≥ UGX ${GAP_TWO_KEY_THRESHOLD.toLocaleString()}): sealing needs 2 different officers. Your tap counts as key 1/2.`, `Enjawulo ennene: okusiba kwetaaga abakulu babiri. Okunyiga kwo kye kisumuluzo 1/2.`)}
              </div>
            )}
            <textarea value={draft.minutes} onChange={(e) => patch({ minutes: e.target.value })} placeholder={str('Meeting minutes / resolutions (optional)', 'Ebiwandiiko by\'olukuŋŋaana')} rows={2} className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm" />
          </div>
          {/* Review before seal: every section is Done, Zero, or Needs attention.
              The seal stays locked until the secretary ticks the confirm box. */}
          {(() => {
            type S = 'done' | 'zero' | 'attention';
            const rows: { label: string; status: S; detail: string; step: number }[] = [
              {
                label: steps[0], status: 'done',
                detail: `${attendanceCount}/${members.length} ${str('marked', 'bateekeddwako')}`,
                step: 0,
              },
              {
                label: steps[1],
                status: draft.sharesRecorded ? 'done' : sharesTotal > 0 ? 'attention' : 'zero',
                detail: draft.sharesRecorded
                  ? str('Recorded to passbooks', 'Kikoseddwa')
                  : sharesTotal > 0
                    ? `${sharesTotal} ${str('staged but not recorded', 'biteekeddwateka naye tebinnakwatibwa')}`
                    : str('No shares today', 'Tewali migabo leero'),
                step: 1,
              },
              {
                label: str('Welfare', 'Obuyambi'),
                status: draft.welfareRecorded ? 'done' : presentIds.length > 0 ? 'attention' : 'zero',
                detail: draft.welfareRecorded
                  ? str('Collected', 'Zikunganyiziddwa')
                  : str('Not collected yet', 'Tezinnakunganyizibwa'),
                step: 1,
              },
              {
                label: steps[2],
                status: draft.repaymentsRecorded ? 'done' : debtors.length > 0 ? 'attention' : 'zero',
                detail: draft.repaymentsRecorded
                  ? str('Recorded', 'Kikoseddwa')
                  : debtors.length > 0
                    ? `${debtors.length} ${str('debtors owe — enter or confirm zero', 'beebbanja — yingiza oba kakasa zeru')}`
                    : str('No loans out', 'Tewali bbanja'),
                step: 2,
              },
              {
                label: steps[3],
                status: draft.loansRecorded ? 'done' : 'zero',
                detail: draft.loansRecorded
                  ? str('Request queued', 'Kisindikiddwa')
                  : str('No new requests', 'Tewali kusaba kupya'),
                step: 3,
              },
              {
                label: steps[4],
                status: draft.finesRecorded ? 'done' : stagedFines.length > 0 ? 'attention' : 'zero',
                detail: draft.finesRecorded
                  ? str('Recorded', 'Kikoseddwa')
                  : stagedFines.length > 0
                    ? `${stagedFines.length} ${str('staged but not recorded', 'biteekeddwateka naye tebinnakwatibwa')}`
                    : str('No fines', 'Tewali ngassi'),
                step: 4,
              },
              {
                label: str('Sales', 'Okutunda'),
                status: draft.salesRecorded ? 'done' : 'zero',
                detail: draft.salesRecorded
                  ? str('Recorded', 'Kikoseddwa')
                  : str('No sales', 'Tewali kutunda'),
                step: 4,
              },
            ];
            const attention = rows.filter((r) => r.status === 'attention');
            const chip = (s: S) =>
              s === 'done'
                ? 'bg-[#DCFCE7] text-[#166534]'
                : s === 'zero'
                  ? 'bg-[#F6F7F6] text-[#4B5563] border border-[#E5E7EB]'
                  : 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]';
            const chipText = (s: S) =>
              s === 'done' ? '✓' : s === 'zero' ? '0' : '!';
            return (
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-2">
                <h4 className="text-xs font-bold text-[#00261b] uppercase tracking-wider">
                  {str('Review before seal', 'Kebera nga tonnasiba')}
                </h4>
                {rows.map((r) => (
                  <button
                    key={r.label}
                    type="button"
                    onClick={() => patch({ step: r.step })}
                    className="w-full flex items-center gap-2.5 text-left active:scale-[0.99]"
                  >
                    <span className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${chip(r.status)}`}>
                      {chipText(r.status)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-[#00261b]">{r.label}</span>
                      <span className="block text-[11px] text-[#4B5563] truncate">{r.detail}</span>
                    </span>
                    {r.status === 'attention' && (
                      <span className="material-symbols-outlined text-[#92400E] text-[18px] shrink-0">arrow_forward</span>
                    )}
                  </button>
                ))}
                {attention.length > 0 && (
                  <p className="text-[11px] font-bold text-[#92400E] bg-[#FEF3C7] rounded-lg p-2">
                    {str(
                      `${attention.length} section(s) staged but not recorded — tap to finish, or confirm below that nothing was collected.`,
                      `Emitendera ${attention.length} giteekeddwateka naye teginnakwatibwa — nyiga ogimalirize, oba kakasa wansi nti tewali kikunganyiziddwa.`
                    )}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setReviewConfirmed(!reviewConfirmed)}
                  className={`w-full min-h-[48px] rounded-lg text-xs font-bold border-2 flex items-center justify-center gap-2 active:scale-[0.99] ${
                    reviewConfirmed ? 'bg-[#DCFCE7] border-[#006d30] text-[#166534]' : 'bg-white border-[#CBD5E1] text-[#4B5563]'
                  }`}
                >
                  <span className={`w-5 h-5 rounded border-2 flex items-center justify-center ${reviewConfirmed ? 'bg-[#006d30] border-[#006d30] text-white' : 'border-[#CBD5E1] text-transparent'}`}>
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </span>
                  {str('I reviewed every section above', 'Nkeberedde emitendera gyonna waggulu')}
                </button>
              </div>
            );
          })()}
          {draft.completed
            ? (
              <div className="bg-[#DCFCE7] border border-[#006d30] rounded-xl p-4 text-center space-y-2">
                <p className="font-bold text-[#166534] text-sm">{str(`Meeting #${meetingNo} sealed!`, 'Olukuŋŋaana luggaddwa!')}</p>
                <p className="text-[11px] text-[#166534] leading-relaxed">
                  {str(
                    'Paper still counts: stamp the paper passbooks, then keep the downloaded backup + recovery sheet INSIDE the metal box.',
                    'Ekitabo ky’empapula kikyalina amakulu: temamu sitampu, oteeke fayiro ekoppebwa mu sanduuko ey’ekyuma.'
                  )}
                </p>
                {!backupDone && (
                  <>
                    <p className="text-[11px] font-bold text-[#92400E]">
                      {str('The backup file did not download. The books live on this phone only until you save a copy.', 'Fayiro tekoppebwa. Kozesa wansi.')}
                    </p>
                    {stepBtn(str('Download backup file (required)', 'Koppa fayiro (kyetaagisa)'), () => {
                      if (lastSealed) {
                        try {
                          onDownloadBackup(lastSealed);
                          setBackupDone(true);
                        } catch {
                          /* retry */
                        }
                      }
                    })}
                  </>
                )}
                {stepBtn(
                  backupDone ? str('Back to Home', 'Ddayo awaka') : str('Back to Home (download backup first)', 'Ddayo awaka (sooka okoppe)'),
                  () => { if (backupDone) onNavigate('home'); },
                  true,
                  !backupDone
                )}
                {backupDone && (
                  <button
                    type="button"
                    onClick={() => onNavigate('audio_broadcast')}
                    className="w-full min-h-[48px] rounded-lg font-bold text-sm bg-white border border-[#006d30] text-[#006d30] active:scale-[0.99]"
                  >
                    {str('Send SMS reminders to debtors →', 'Weereza SMS eri abeebbanja →')}
                  </button>
                )}
              </div>
            )
            : stepBtn(
              draft.gapFirstBy && difference !== 0 && gapNeedsSecondKey(Math.abs(difference))
                ? str(`Seal with 2nd officer key`, `Siba n'ekisumuluzo eky'okubiri`)
                : str(`Seal Meeting #${meetingNo}`, `Siba Olukuŋŋaana #${meetingNo}`),
              finishMeeting,
              true,
              draft.counted === '' || (difference !== 0 && !discrepancyNote.trim()) || !reviewConfirmed
            )}
        </section>
      )}

      {/* Footer nav */}
      {draft.step > 0 && !draft.completed && (
        <button type="button" onClick={() => patch({ step: draft.step - 1 })} className="w-full text-xs font-bold text-[#4B5563] underline">
          ← {str('Back', 'Ddayo')}
        </button>
      )}
      <button type="button" onClick={() => onNavigate('member_passbook')} className="w-full text-xs font-bold text-[#4B5563] underline">
        {str('View passbooks', 'Laba ppaasibuku')}
      </button>
    </main>
  );
};
