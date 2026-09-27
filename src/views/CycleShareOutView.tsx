import React, { useState } from 'react';
import { Language, Member, SaccoFunds, ScreenId, SurplusPolicy, SurplusResolution, UserAccount } from '../types';
import { MemberPayout, ShareOutResult, computeShareOut } from '../utils/shareout';
import { buildResolution, checkResolution, sameSplit } from '../utils/surplus';
import {
  ShareOutApproval,
  ShareOutKeyResult,
  describeShareOutKeys,
  shareOutForCycle,
  shareOutNeedsSecondKey,
  twoKeyPossible,
} from '../utils/dualApproval';
import { ApprovalsKeyModal } from '../components/ApprovalsKeyModal';
import { KeyStepper } from '../components/KeyStepper';
import { InfoTip } from '../components/InfoTip';

interface CycleShareOutViewProps {
  members?: Member[];
  loanFundBalance?: number;
  finesCollected?: number;
  sharePrice?: number;
  cycle?: number;
  /** Set only when the group has recorded a surplus policy. */
  surplusPolicy?: SurplusPolicy;
  /** The resolution already recorded for this cycle, if any. */
  resolution?: SurplusResolution;
  saccoFunds?: SaccoFunds;
  /** Officers who can turn a key — the share-out uses the two-key ceremony. */
  officers?: UserAccount[];
  /** Keys already turned on this cycle, if any. */
  shareOutApproval?: ShareOutApproval;
  onRecordResolution?: (resolution: SurplusResolution) => void;
  onNavigate: (screen: ScreenId) => void;
  onExecuteShareOut?: (result: ShareOutResult, key?: { officerId: string; pin: string }) => ShareOutKeyResult;
  language?: Language;
}

export const CycleShareOutView: React.FC<CycleShareOutViewProps> = ({
  members = [],
  loanFundBalance = 0,
  finesCollected = 0,
  sharePrice = 10000,
  cycle = 1,
  surplusPolicy,
  resolution,
  saccoFunds,
  officers = [],
  shareOutApproval,
  onRecordResolution,
  onNavigate,
  onExecuteShareOut,
  language = 'EN',
}) => {
  const [disbursalMode, setDisbursalMode] = useState<'cash' | 'momo'>('cash');
  const [isSimulated, setIsSimulated] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'roster'>('overview');
  const [confirmExecute, setConfirmExecute] = useState(false);
  const [executed, setExecuted] = useState(false);
  // The members' resolution: date, minutes reference, who was there, who said yes.
  const [resDate, setResDate] = useState(() => resolution?.date || new Date().toISOString().slice(0, 10));
  const [resMinutes, setResMinutes] = useState(resolution?.minutesRef || '');
  const [resAttendees, setResAttendees] = useState(String(resolution?.attendees ?? members.length));
  const [resAgainst, setResAgainst] = useState(String(resolution?.against ?? 0));
  const [resNote, setResNote] = useState(resolution?.note || '');
  const [resApprovers, setResApprovers] = useState<string[]>(resolution?.approvers || []);
  const [amending, setAmending] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keyMessage, setKeyMessage] = useState<string | null>(null);
  const str = (en: string, lu: string) => (language === 'LU' ? lu : en);

  // Real engine: identical math for preview and execution
  const result = computeShareOut(members, loanFundBalance, finesCollected, sharePrice, surplusPolicy);
  const plan = result.plan;
  const policyActive = Boolean(surplusPolicy);
  const recorded = policyActive ? resolution : undefined;
  const staleApproval = Boolean(recorded && !sameSplit(recorded.policy, surplusPolicy));
  const attendees = Number(resAttendees) || 0;
  const check = checkResolution(
    { attendees, approvers: resApprovers, against: Number(resAgainst) || 0, memberCount: members.length, plan, policy: surplusPolicy },
    members
  );
  // No recorded policy means no gate: a village group pays out as it always has.
  const resolutionOk = !policyActive || (Boolean(recorded) && check.ok && !staleApproval);
  const {
    totalSharesSold,
    totalShareCapital,
    interestEarned,
    totalPool,
    valuePerShare,
    profitPercentage,
  } = result;

  const handleRecordResolution = () => {
    if (!onRecordResolution || !surplusPolicy || !check.ok) return;
    onRecordResolution(
      buildResolution({
        id: resolution?.id || `res-${cycle}-${Date.now().toString(36)}`,
        cycle,
        date: resDate,
        minutesRef: resMinutes,
        attendees,
        approvers: resApprovers,
        against: Number(resAgainst) || 0,
        memberCount: members.length,
        policy: surplusPolicy,
        note: resNote,
        recordedBy: 'Group secretary',
      })
    );
    setAmending(false);
  };

  const handlePrintSlips = () => {
    window.print();
  };

  // The ceremony: key 1 moves no money, key 2 from a DIFFERENT officer pays.
  const liveApproval = shareOutForCycle(shareOutApproval, cycle);
  const waitingSecondKey = shareOutNeedsSecondKey(shareOutApproval, cycle);
  const keysPossible = twoKeyPossible(officers);
  const keyOfficers = officers.filter((o) => o.permissions?.canApproveLoans);

  const handleKeyConfirm = (officerId: string, pin: string): string | null => {
    if (!onExecuteShareOut) return 'This group cannot pay out right now.';
    const outcome = onExecuteShareOut(result, { officerId, pin });
    if (outcome.error) {
      setKeyError(outcome.error);
      return outcome.error;
    }
    setKeyError(null);
    setKeyModalOpen(false);
    if (outcome.keyTurned) {
      setKeyMessage(
        str(
          'Key 1/2 recorded. Hand the phone to a different officer to turn key 2/2.',
          'Kisumuluzo 1/2 kikisegajjiddwa. Muke ssimu eri omukulu omulala n’akayoola kisumuluzo 2/2.'
        )
      );
    }
    if (outcome.executed) {
      setKeyMessage(null);
      setExecuted(true);
      setConfirmExecute(false);
    }
    return null;
  };

  const handleExecute = () => {
    // A lone officer still closes the cycle, but only after saying so twice.
    if (!onExecuteShareOut) return;
    if (keysPossible) {
      setKeyError(null);
      setKeyModalOpen(true);
      return;
    }
    const outcome = onExecuteShareOut(result);
    if (outcome.error) {
      setKeyError(outcome.error);
      return;
    }
    setExecuted(true);
    setConfirmExecute(false);
  };

  return (
    <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-14 flex-1 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('home')}
            className="w-9 h-9 rounded-lg bg-surface-card border border-border-strong flex items-center justify-center text-primary"
            type="button"
            aria-label={str('Back to dashboard', 'Ddayo ku monyeto')}
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <div>
            <h1 className="text-headline-md font-headline-md text-primary font-bold">
              {str(`Cycle ${cycle} Share-Out`, `Okugaba Emigabo ku Nziringana #${cycle}`)}
            </h1>
            <p className="text-xs text-text-muted">{str('Dividends', 'Amagoba')}</p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded bg-status-ok-bg text-status-ok-tx text-xs font-bold font-mono">
          {str('CYCLE MATURITY', 'NZIRINGANA EWA KIGENDANYWA')}
        </span>
      </div>

      {/* Hero Financial Projection */}
      <section className="bg-primary-container text-white rounded-xl p-5 shadow-[0px_4px_12px_rgba(11,61,46,0.18)] space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-primary-fixed">
            {policyActive
              ? str('Paid to members', 'Ssente ezikusabidwa ku bakuli')
              : str('Total Share-Out Pool', 'Omugatte w’okugaba emigabo')}
          </span>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded text-white font-mono">
            {str('Full Cycle Payout', 'Ssente ezikusabidwa ku enziringana yonna')}
          </span>
        </div>

        <div>
          <span className="text-xs text-[#c0c8c3] block mb-1">{str('Total Group Capital to Distribute', 'Omuwendo gw’ekibiina ogujaasanyukirizibwa')}</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-primary-fixed text-lg font-bold font-mono">UGX</span>
            <span className="font-mono text-[28px] font-bold text-white tracking-tight">
              {totalPool.toLocaleString('en-US')}
            </span>
          </div>
        </div>

        {result.withheld > 0 && (
          <p className="text-[11px] text-[#c0c8c3] border-t border-white/20 pt-2">
            {str('Members are paid', 'Abakiise bagaba')}{' '}
            <span className="font-mono font-bold text-white">UGX {totalPool.toLocaleString('en-US')}</span>
            {str('. The group keeps', '. Ekibiina kirabikira')}{' '}
            <span className="font-mono font-bold text-secondary-fixed">UGX {result.withheld.toLocaleString('en-US')}</span>
            {str(' as reserve, education and operations.', 'mu kizimbeero, nkusoma n’abalimi.')}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-white/20">
          <div className="bg-white/10 rounded-lg p-2.5">
            <span className="text-[11px] text-[#c0c8c3] block">{str('Calculated Share Value', 'Omuwendo gw’omugabo olunokusedde')}</span>
            <span className="font-mono text-base font-bold text-white">
              UGX {valuePerShare.toLocaleString('en-US')}
            </span>
            <span className="text-[10px] text-secondary-fixed block mt-0.5 font-bold">
              +{profitPercentage}% {str('Dividend Return', 'Kizibu ku mugabo')}
            </span>
          </div>

          <div className="bg-white/10 rounded-lg p-2.5">
            <span className="text-[11px] text-[#c0c8c3] block">{str('Base Share Price', 'Omuwendo ow’omugabo w’olwali')}</span>
             <span className="font-mono text-base font-bold text-white">UGX {sharePrice.toLocaleString()}</span>
            <span className="text-[10px] text-[#c0c8c3] block mt-0.5">{totalSharesSold} {str('Total Shares', 'Emigabo gyonna')}</span>
          </div>
        </div>
      </section>

      {/* Navigation Pills */}
      <div className="flex bg-surface-card p-1 rounded-xl border border-border-strong text-xs font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 rounded-lg transition ${
            activeTab === 'overview'
              ? 'bg-primary-container text-white shadow-sm'
              : 'text-text-muted hover:text-primary'
          }`}
          type="button"
        >
          {str('Profit Breakdown', 'Ebikozeseza by’amagoba')}
        </button>
        <button
          onClick={() => setActiveTab('roster')}
          className={`flex-1 py-2 rounded-lg transition ${
            activeTab === 'roster'
              ? 'bg-primary-container text-white shadow-sm'
              : 'text-text-muted hover:text-primary'
          }`}
          type="button"
        >
          {str('All Member Payouts', 'Ssente za’abakiise zonna')} ({members.length})
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Profit Breakdown */}
          <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-2.5">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
              {str('Profit Sources Breakdown', 'Ebikozeseza by’amagoba')}
            </h3>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2 bg-canvas-bg rounded-lg border border-border-line">
                <span className="text-on-surface font-sans">{str(`Member Savings Capital (${totalSharesSold} shares):`, `Ssente z’abakiise (${totalSharesSold} emigabo):`)}</span>
                <span className="font-bold text-primary">UGX {totalShareCapital.toLocaleString('en-US')}</span>
              </div>
              <div className="flex justify-between p-2 bg-canvas-bg rounded-lg border border-border-line">
                <span className="text-on-surface font-sans">{str(`Accumulated Loan Interest (${Math.round(result.interestRate * 100)}% share-out factor):`, `Amagoba g’ebyewolo galiwo (ekikolo ekya ${Math.round(result.interestRate * 100)}% ekiggyamu):`)}</span>
                <span className="font-bold text-secondary">+UGX {interestEarned.toLocaleString('en-US')}</span>
              </div>
              <div className="flex justify-between p-2 bg-canvas-bg rounded-lg border border-border-line">
                <span className="text-on-surface font-sans">{str('Constitutional Late Fines Collected:', 'Engassi ez’olukalu zikakasebwa:')}</span>
                <span className="font-bold text-secondary">+UGX {finesCollected.toLocaleString('en-US')}</span>
              </div>
              {policyActive && (
                <div className="flex justify-between p-2 bg-status-warn-bg rounded-lg border border-status-warn-tx/30">
                  <span className="text-on-surface font-sans">{str('Kept for the group (reserve, education, operations):', 'Ebikuumuka ekibiina (kizimbeero, kusoma, abalimi):')}</span>
                  <span className="font-bold text-status-warn-tx">−UGX {result.withheld.toLocaleString('en-US')}</span>
                </div>
              )}
            </div>
          </section>

          {/* Where the surplus goes — a SACCO must appropriate it before paying */}
          {plan.surplus > 0 && (
            <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-2.5">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                {str('Where the surplus goes', 'Genda ssali gyali')}
                <InfoTip label={str('About the surplus split', 'Kikwata okugawanya ssali')}>
                  {str('Loan interest belongs to the group. The reserve, education and operations shares are set aside; members are paid the rest, by the split your group recorded.', 'Ssali g’ebyewolo gye kikwata ekibiina. Ekizimbeero, ebisoma n’abalimi bisenezera ku bwanvu; abakiise bagaba ekisigala, nga kigendererwa ku nkya ekibiina kino.')}
                </InfoTip>
              </h3>
              <div className="space-y-2 text-xs font-mono">
                {policyActive ? (
                  <>
                    <div className="flex justify-between p-2 bg-canvas-bg rounded-lg border border-line border-border-line">
                      <span className="text-on-surface font-sans">{str(`To members (${plan.bonusPct}% dividend)`, `Ku bakuli (${plan.bonusPct}% ssali)`)}</span>
                      <span className="font-bold text-secondary">UGX {plan.bonus.toLocaleString('en-US')}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-canvas-bg rounded-lg border border-border-line">
                      <span className="text-on-surface font-sans">{str('To the statutory reserve', 'Ku kizimbeero')}</span>
                      <span className="font-bold text-primary">UGX {plan.reserve.toLocaleString('en-US')}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-canvas-bg rounded-lg border border-border-line">
                      <span className="text-on-surface font-sans">{str('To the education fund', 'Ku ssali nkusoma')}</span>
                      <span className="font-bold text-primary">UGX {plan.education.toLocaleString('en-US')}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-canvas-bg rounded-lg border border-border-line">
                      <span className="text-on-surface font-sans">{str('To running costs', 'Ku abalimi')}</span>
                      <span className="font-bold text-primary">UGX {plan.operations.toLocaleString('en-US')}</span>
                    </div>
                    <div className="flex justify-between px-2 pt-1 border-t border-border-line font-bold">
                      <span>{str('Surplus this cycle', 'Ssali kizibu kino')}</span>
                      <span className="font-mono">UGX {plan.surplus.toLocaleString('en-US')}</span>
                    </div>
                    {!plan.usable && (
                      <p className="text-[11px] text-status-bad-tx font-sans font-bold">{plan.problems.join(' ')}</p>
                    )}
                    {saccoFunds && (
                      <p className="text-[11px] text-text-muted font-sans">
                        {str('In the funds now:', 'Mu ssali zino:')}{' '}
                        <span className="font-mono">{str('reserve', 'kizimbeero')} UGX {saccoFunds.reserve.toLocaleString('en-US')}</span> ·{' '}
                        <span className="font-mono">{str('education', 'kusoma')} UGX {saccoFunds.education.toLocaleString('en-US')}</span> ·{' '}
                        <span className="font-mono">{str('operations', 'abalimi')} UGX {saccoFunds.operations.toLocaleString('en-US')}</span>
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-[11px] text-text-muted font-sans">
                    {str(
                      `No surplus policy recorded, so all UGX ${plan.surplus.toLocaleString('en-US')} of loan interest and fines is paid to members. Record a split in Settings to build a reserve first.`,
                      `Teri ssali y’okugawanya, nga kino ssali gonna g’ebyewolo n’engassi ziggibwa abakiise. Wawuka ekizimbeero mu nnanga nga okumala.`
                    )}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* The members’ resolution — the payout is locked until it exists */}
          {policyActive && (
            <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
                  {str('Members’ resolution', 'Obujja bwa buli kiseeko')}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${resolutionOk ? 'bg-status-ok-bg text-status-ok-tx' : 'bg-status-warn-bg text-status-warn-tx'}`}>
                  {resolutionOk ? str('APPROVED', 'WAKYUUKIRE') : str('NOT YET', 'TEEYUUKIRE')}
                </span>
              </div>

              {staleApproval && (
                <p className="text-[11px] text-status-bad-tx bg-status-bad-bg rounded-lg p-2 font-bold">
                  {str('The split was changed after the members approved it. Record the resolution again.', 'Okugawanya kakyukizamu buli abakiise bekaakiriza. Yandike obujja muliro.')}
                </p>
              )}

              {recorded && !amending ? (
                <div className="rounded-lg border border-status-ok-tx/30 bg-status-ok-bg p-3 space-y-1 text-[11px]">
                  <p className="font-bold text-status-ok-tx">
                    {str('Approved by the members', 'Bakyuuikirizibwa n’abakiise')}
                  </p>
                  <p className="text-text-muted font-mono">
                    {recorded.date} · {recorded.minutesRef || str('no minutes number', 'nagaba namba ya minansi')}
                  </p>
                  <p className="text-text-muted">
                    {str(`${recorded.approvers.length} said yes`, `${recorded.approvers.length} balamutasanyukirizibwa`)} ·{' '}
                    {str(`${recorded.attendees} present (needed ${recorded.quorumRequired})`, `${recorded.attendees} babali (bekalaba ${recorded.quorumRequired})`)}
                  </p>
                  {recorded.note && <p className="text-text-muted italic">“{recorded.note}”</p>}
                  <button
                    type="button"
                    onClick={() => setAmending(true)}
                    className="min-h-[40px] px-3 rounded-lg bg-surface-container border border-border-line text-primary text-[11px] font-bold"
                  >
                    {str('Change it', 'Gikyendereza')}
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-[11px] text-text-muted">
                    {str('The members met and agreed to this split. Write it in the minutes book before paying.', 'Abakiise baanaku byaba nga bakkiriza. Soma mu kitabo kya minansi nga okusaba ssente.')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">{str('Date of meeting', 'Olunaku lw’ekizibu')}</label>
                      <input type="date" value={resDate} onChange={(e) => setResDate(e.target.value)} className="w-full min-h-[44px] px-2 rounded-lg border border-border-line bg-canvas-bg text-xs font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">{str('Minutes number', 'Namba ya minansi')}</label>
                      <input value={resMinutes} onChange={(e) => setResMinutes(e.target.value)} placeholder={str('e.g. Min 04/2026', 'ekikulu: Min 04/2026')} className="w-full min-h-[44px] px-2 rounded-lg border border-border-line bg-canvas-bg text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">{str('Members present', 'Abakiise abaliwo')}</label>
                      <input type="number" min={0} value={resAttendees} onChange={(e) => setResAttendees(e.target.value)} className="w-full min-h-[44px] px-2 rounded-lg border border-border-line bg-canvas-bg text-xs font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">{str('Said no', 'Bateeyeezza')}</label>
                      <input type="number" min={0} value={resAgainst} onChange={(e) => setResAgainst(e.target.value)} className="w-full min-h-[44px] px-2 rounded-lg border border-border-line bg-canvas-bg text-xs font-mono" />
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-text-muted uppercase">
                    {str('Tap who said yes', 'Londa abali eyatendera')}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 max-h-[180px] overflow-y-auto pr-1">
                    {members.map((m) => {
                      const selected = resApprovers.includes(m.no);
                      return (
                        <button
                          key={m.no}
                          type="button"
                          onClick={() => setResApprovers((cur) => (selected ? cur.filter((no) => no !== m.no) : [...cur, m.no]))}
                          className={`p-2 rounded-lg border text-left ${selected ? 'bg-primary-container text-white border-primary-container' : 'bg-canvas-bg border-border-line'}`}
                        >
                          <span className="font-bold block text-[11px]">#{m.no} {m.name.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">{str('Note (optional)', 'Obunaku (kintu kikene) ')}</label>
                    <input value={resNote} onChange={(e) => setResNote(e.target.value)} className="w-full min-h-[44px] px-2 rounded-lg border border-border-line bg-canvas-bg text-xs" />
                  </div>
                  <div className={`rounded-lg p-2.5 text-[11px] ${check.ok ? 'bg-status-ok-bg text-status-ok-tx' : 'bg-status-warn-bg text-status-warn-tx'}`}>
                    {check.ok ? (
                      <span className="font-bold">
                        {str(`Quorum met: ${check.approved} of ${check.present} present approved.`, `Abali batimera: ${check.approved} ku ${check.present} abali.`)}
                      </span>
                    ) : (
                      <ul className="space-y-0.5 font-sans">
                        {check.problems.map((problem) => (
                          <li key={problem}>· {problem}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!check.ok || !onRecordResolution}
                    onClick={handleRecordResolution}
                    className={`w-full min-h-[48px] rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 ${check.ok && onRecordResolution ? 'bg-primary-container text-white' : 'bg-canvas-bg text-text-muted border border-border-line opacity-70'}`}
                  >
                    <span className="material-symbols-outlined text-base">how_to_vote</span>
                    {recorded ? str('Record the change', 'Yandike ekikyendekezo') : str('Record the resolution', 'Yandike obujja')}
                  </button>
                </>
              )}
            </section>
          )}

          {/* Disbursal Mode & Action */}
          <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-3">
            <h3 className="text-xs font-bold text-primary block uppercase tracking-wider">
              {str('Share-Out Ceremony Protocol', 'Enkanisa y’okugaba emigabo')}
            </h3>
            {keysPossible ? (
              <>
                <KeyStepper firstBy={liveApproval?.firstApprovedBy} decided={Boolean(liveApproval?.secondApprovedBy)} language={language} />
                <p className="text-[11px] text-text-muted">
                  {str(
                    'This empties the box and the loan fund, so 2 different officers turn the keys — each with their own PIN. Hand the phone over.',
                    'Kino kumula ssanduku n’ekizimbeero k’ebyewolo, nga kino abakulu abiri ABAALI BWE BAKUJAANIDDWA bayoola bisumuluzo — buli ng’ebikwate bye. Muke ssimu eri omukulu omulala.'
                  )}
                </p>
              </>
            ) : (
              <p className="text-[11px] text-status-warn-tx bg-status-warn-bg rounded-lg p-2.5 font-bold">
                {str(
                  'Only one officer can approve payments, so the two-key rule cannot run. Anyone with the phone could empty the group — add a second officer in Users.',
                  'Omukulu gumala n’omwe asobola okukkiriza, nga kino tebeka kikwata. Anyone ali n’ekisanyu kimwe asobola okumula ekibiina — yongera omukulu omulala mu Users.'
                )}
              </p>
            )}
            {keyMessage && (
              <p className="text-[11px] text-status-warn-tx bg-status-warn-bg rounded-lg p-2.5 font-bold">
                {keyMessage}
                <span className="block font-mono text-[10px] text-text-muted">{describeShareOutKeys(shareOutApproval, cycle)}</span>
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDisbursalMode('cash')}
                className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  disbursalMode === 'cash'
                    ? 'bg-primary-container text-white border-primary-container'
                    : 'bg-canvas-bg text-on-surface border-border-line'
                }`}
              >
                <span className="material-symbols-outlined text-sm">payments</span>
                <span>{str('Physical Cash Handover', 'Okuyisa ssente nkalu')}</span>
              </button>
              <button
                type="button"
                disabled
                className="p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 bg-canvas-bg text-text-muted border-border-line opacity-60"
              >
                <span className="material-symbols-outlined text-sm">send_to_mobile</span>
                <span>{str('MoMo setup needed', 'MoMo kimuli')}</span>
              </button>
            </div>

            {isSimulated ? (
              <div className="p-3 bg-status-ok-bg border border-secondary rounded-lg text-center space-y-2 animate-in zoom-in-95">
                <span className="text-xs font-bold text-status-ok-tx block">
                  {str('Share-Out Ceremony Prepared Successfully!', 'Enkanisa y’okugaba emigabo erakabiddwa bulungi!')}
                </span>
                <p className="text-[11px] text-emerald-800">
                  {str(
                    `Calculated payouts for all ${members.length} members with official passbook closing sign-offs.`,
                    `Ssente ezikusabidwa za buli mukiise (${members.length}) ziri ku ppaasibuku era zaakafowolesa omukono.`
                  )}
                </p>
                <button
                  onClick={handlePrintSlips}
                  className="w-full py-2 bg-secondary text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1"
                  type="button"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  {str('Print Full Share-Out Audit Roster', 'Printa olutodde lw’okukebera kwonna')}
                </button>
                {onExecuteShareOut && !executed && !confirmExecute && resolutionOk && (
                  <button
                    onClick={() => (keysPossible ? handleExecute() : setConfirmExecute(true))}
                    className="w-full py-2.5 bg-primary-container text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-sm">payments</span>
                    {keysPossible
                      ? waitingSecondKey
                        ? str('Confirm the payout (key 2/2)', 'Kakasa okuyisa (kisumuluzo 2/2)')
                        : str('Execute Share-Out (key 1/2)', 'Kola okugaba emigabo (kisumuluzo 1/2)')
                      : str('Execute Share-Out (post to passbooks)', 'Kola okugaba emigabo (yikize mu bitabo)')}
                  </button>
                )}
                {keyError && !keyModalOpen && (
                  <p className="text-[11px] text-status-bad-tx bg-status-bad-bg rounded-lg p-2.5 font-bold">{keyError}</p>
                )}
                {confirmExecute && !executed && (
                  <div className="p-3 bg-white border-2 border-primary rounded-lg space-y-2">
                    <p className="text-xs font-bold text-primary">
                      {str(
                        `Pay UGX ${result.totalNetPayout.toLocaleString('en-US')} to ${members.length} members? UGX ${result.totalDeductedLoans.toLocaleString('en-US')} in loans will be deducted first. Shares reset for the new cycle. This cannot be undone — take a snapshot first.`,
                        `Oloke UGX ${result.totalNetPayout.toLocaleString('en-US')} mu bakulu ${members.length}? UGX ${result.totalDeductedLoans.toLocaleString('en-US')} mu byewolo biggulwa okuba kk. Emigabo giba ku enziringana empya. Eki tekakwatibwa — tonda endandikwa esooka.`
                      )}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleExecute}
                        className="flex-1 py-2 bg-primary-container text-white font-bold text-xs rounded-lg"
                        type="button"
                      >
                        {str('Confirm Payout', 'Kakasa okuyisa')}
                      </button>
                      <button
                        onClick={() => setConfirmExecute(false)}
                        className="flex-1 py-2 bg-canvas-bg border border-border-line font-bold text-xs rounded-lg"
                        type="button"
                      >
                        {str('Cancel', 'Sazaamu')}
                      </button>
                    </div>
                  </div>
                )}
                {policyActive && !resolutionOk && !executed && (
                  <p className="text-[11px] text-status-warn-tx bg-status-warn-bg rounded-lg p-2.5 font-bold">
                    {staleApproval
                      ? str('Record the resolution again — the split changed after it was approved.', 'Yandike obujja muliro — okugawanya kakyukizamu nga bwaali mumyango.')
                      : str('Paying out is locked until the members approve this split. Record their resolution above first.', 'Okugaba kukakibwa nga abakiise tebakkiriza. Yandike obujja bwabo nga okumala.')}
                  </p>
                )}
                {executed && (
                  <p className="text-xs font-bold text-status-ok-tx">
                    {str('Share-out executed and posted to every passbook. A new cycle has started.', 'Okugaba emigabo kwakokolwa era kwatandikwa mu ppaasibuku buli kiseeko. Enziringana empya etandikiddwa.')}
                  </p>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsSimulated(true)}
                className="w-full min-h-[48px] bg-secondary hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 active:scale-95 transition shadow"
              >
                <span className="material-symbols-outlined text-base">calculate</span>
                <span>{str('Simulate Share-Out Protocol & Generate Slips', 'Ssimula n’okugaba emigabo era funza amazzi g’okuggaba')}</span>
              </button>
            )}
          </section>
        </div>
      )}

      <ApprovalsKeyModal
        isOpen={keyModalOpen}
        language={language}
        keyLabel={
          waitingSecondKey
            ? str('Key 2/2 — release the share-out', 'Kisumuluzo 2/2 — fumba okugaba emigabo')
            : str('Key 1/2', 'Kisumuluzo 1/2')
        }
        memberLine={str(`Cycle ${cycle} share-out · ${members.length} members`, `Okugaba emigabo kizibu #${cycle} · ${members.length} abakiise`)}
        amountText={`UGX ${result.totalNetPayout.toLocaleString('en-US')}`}
        officers={keyOfficers.length > 0 ? keyOfficers : officers}
        excludeName={liveApproval?.firstApprovedBy}
        onCancel={() => setKeyModalOpen(false)}
        onConfirm={handleKeyConfirm}
      />

      {activeTab === 'roster' && (
        <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
                {str('Member Payout Registry', 'Amatendekero g’essente za’abakiise')}
              </h3>
              <p className="text-[11px] text-text-muted">{str('Proportional to shares saved', 'Kigendererwa buli mugabo omuterekeze')}</p>
            </div>
            <button
              onClick={handlePrintSlips}
              className="text-xs font-bold text-secondary flex items-center gap-1 hover:underline"
              type="button"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              {str('Print', 'Printa')}
            </button>
          </div>

          <div className="space-y-2 text-xs max-h-[420px] overflow-y-auto pr-1">
            {result.payouts.map((p: MemberPayout) => {

              return (
                <div
                  key={p.memberId}
                  className="p-2.5 bg-canvas-bg rounded-lg border border-border-line flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-primary">{p.memberName}</span>
                      <span className="text-[10px] font-mono bg-white px-1 py-0.2 rounded border">
                        #{p.memberNo}
                      </span>
                    </div>
                    <span className="text-[11px] text-text-muted">
                      {p.shares} {str('shares', 'emigabo')} · {str('Saved', 'Aterekedde')} UGX {p.saved.toLocaleString('en-US')}
                      {p.deductedLoan > 0 && ` · ${str('Loan deducted', 'Ekyewolo kiggyulwa')} UGX ${p.deductedLoan.toLocaleString('en-US')}`}
                    </span>
                  </div>
                  <div className="text-right font-mono shrink-0">
                    <span className="font-bold text-secondary text-sm block">
                      UGX {p.netPayout.toLocaleString('en-US')}
                    </span>
                    <span className="text-[10px] text-status-ok-tx font-bold font-sans">
                      +UGX {p.profit.toLocaleString('en-US')} {str('profit', 'magoba')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
};
