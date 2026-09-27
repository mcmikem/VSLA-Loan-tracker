import React, { useRef, useState } from 'react';
import { GroupProfile, Language, Member, ScreenId, ShareClass } from '../types';
import { getTranslations } from '../i18n/translations';
import { ReceiptData, ReceiptModal } from '../components/ReceiptModal';
import { MemberAvatar } from '../components/MemberAvatar';
import { fileToAvatarDataUrl, maskContact } from '../utils/photo';
import { appliedRepayment, changeDue } from '../utils/policy';
import { buildEquityStatement } from '../utils/sacco';

interface MemberPassbookViewProps {
  members: Member[];
  selectedMember: Member;
  onSelectMember: (memberId: string) => void;
  onNavigate: (screen: ScreenId) => void;
  onRecordRepayment: (amount: number, memberId: string) => void;
  onBuyShares: (sharesCount: number, memberId: string, shareClassId?: string) => void;
  onAddMember?: () => void;
  /** Retake an existing member's face photo (compressed on-device). */
  onUpdatePhoto?: (memberId: string, photoUrl: string) => void;
  /** Current meeting number for receipt references. */
  meetingNo?: number;
  sharePrice?: number;
  shareClasses?: ShareClass[];
  /** SACCO settings: needed for the equity statement (interest, class). */
  groupProfile?: GroupProfile;
  cycle?: number;
  cycleMonth?: number;
  totalCycleMonths?: number;
  language?: Language;
  groupName?: string;
  boxIdentifier?: string;
  issuerName?: string;
  /** Signed-in member id — a member viewing their OWN book sees everything. */
  viewerMemberId?: string;
  /** Officers see full contact details; members see only their own. */
  viewerIsOfficer?: boolean;
}

export const MemberPassbookView: React.FC<MemberPassbookViewProps> = ({
  members,
  selectedMember,
  onSelectMember,
  onNavigate,
  onRecordRepayment,
  onBuyShares,
  onAddMember,
  onUpdatePhoto,
  meetingNo = 0,
  sharePrice: configuredSharePrice = 10000,
  shareClasses = [],
  groupProfile,
  cycle = 1,
  cycleMonth = 1,
  totalCycleMonths = 10,
  language = 'EN',
  groupName = 'Bakwata Savings Group',
  boxIdentifier = 'BOX-KLA-042',
  issuerName = 'Group Secretary',
  viewerMemberId,
  viewerIsOfficer = true,
}) => {
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [repaymentAmount, setRepaymentAmount] = useState(0);
  const [showBuySharesModal, setShowBuySharesModal] = useState(false);
  const [sharesToBuy, setSharesToBuy] = useState(2);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [memberQuery, setMemberQuery] = useState('');
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [ledgerExpanded, setLedgerExpanded] = useState(false);
  const [selectedShareClassId, setSelectedShareClassId] = useState('');
  const photoRef = useRef<HTMLInputElement>(null);

  const t = getTranslations(language);
  const str = (en: string, lu: string) => (language === 'LU' ? lu : en);
  const member = selectedMember || members[0];
  const activeShareClasses = shareClasses.filter((shareClass) => shareClass.active);
  const selectedShareClass = activeShareClasses.find((shareClass) => shareClass.id === selectedShareClassId) || activeShareClasses[0];
  // SACCO equity statement: what this member owns, earns and owes.
  const equityStatement = buildEquityStatement(member, groupProfile);
  const currentSharePrice = selectedShareClass?.price ?? configuredSharePrice;
  // Privacy on shared phones: full contacts for officers + own book only.
  const showPrivate = viewerIsOfficer || (viewerMemberId !== undefined && viewerMemberId === member.id);
  const shownPhone = (p?: string) => (showPrivate ? p || '—' : maskContact(p));

  const retakePhoto = async (file: File | undefined) => {
    if (!file || !member || !onUpdatePhoto) return;
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      onUpdatePhoto(member.id, await fileToAvatarDataUrl(file));
    } catch (e: any) {
      setPhotoError(e.message || 'Photo failed.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const todayStr = () =>
    new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const downloadFile = (filename: string, content: string, mime: string) => {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportMember = (format: 'json' | 'csv') => {
    if (!member) return;
    const base = `passbook_${member.no}_${member.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
    if (format === 'json') {
      downloadFile(`${base}.json`, JSON.stringify({ groupName, boxIdentifier, exportedAt: new Date().toISOString(), member }, null, 2), 'application/json');
    } else {
      const rows = [
        ['Member No', 'Name', 'Phone', 'Shares', 'Savings (UGX)', 'Loan Balance (UGX)', 'Welfare (UGX)'],
        [member.no, member.name, member.phone, String(member.sharesCount), String(member.sharesTotal), String(member.loanBalance), String(member.welfareBalance)],
        [],
        ['Date', 'Title', 'Detail', 'Amount'],
        ...member.ledger.map((l) => [l.date, l.title, `${l.subtitle} ${l.extraText || ''}`.trim(), l.amountText]),
      ];
      const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      downloadFile(`${base}.csv`, csv, 'text/csv');
    }
  };

  const visibleMembers = memberQuery.trim()
    ? members.filter((m) => {
        const q = memberQuery.trim().toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.no.includes(q) ||
          (m.phone || '').replace(/[\s-]/g, '').includes(q.replace(/[\s-]/g, ''))
        );
      })
    : members;

  const handleCashRepaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (repaymentAmount <= 0) return;
    const applied = appliedRepayment(repaymentAmount, member.loanBalance);
    const change = changeDue(repaymentAmount, member.loanBalance);
    onRecordRepayment(repaymentAmount, member.id);
    setShowRepaymentModal(false);
    setReceipt({
      kind: 'repayment',
      refNo: `RCPT-${Date.now().toString(36).toUpperCase()}`,
      date: todayStr(),
      memberName: member.name,
      memberNo: member.no,
      amount: applied,
      receivedAmount: repaymentAmount,
      changeAmount: change,
      extraLine: `Loan reduced by UGX ${applied.toLocaleString()} · New balance UGX ${Math.max(0, member.loanBalance - applied).toLocaleString()}`,
      issuerName,
      groupName,
      boxIdentifier,
    });
    const msg =
      language === 'LU'
        ? `Okusasula ssente enkalu kwa UGX ${applied.toLocaleString()} kuweereddwa ${member.name}!`
         : `Cash repayment of UGX ${applied.toLocaleString()} recorded for ${member.name}!`;
    setFeedbackNotice(msg);
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  const handleBuySharesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sharesToBuy <= 0) return;
    const cost = sharesToBuy * currentSharePrice;
    onBuyShares(sharesToBuy, member.id, selectedShareClass?.id);
    setShowBuySharesModal(false);
    setReceipt({
      kind: 'shares',
      refNo: `RCPT-${Date.now().toString(36).toUpperCase()}`,
      date: todayStr(),
      memberName: member.name,
      memberNo: member.no,
       amount: cost,
       shareClassName: selectedShareClass?.name || 'Standard share',
       shareCount: sharesToBuy,
       unitPrice: currentSharePrice,
       extraLine: `${sharesToBuy} ${selectedShareClass?.name || 'share'}(s) · Total ${member.sharesCount + sharesToBuy} shares`,
      issuerName,
      groupName,
      boxIdentifier,
    });
    const msg =
      language === 'LU'
        ? `Emigabo ${sharesToBuy} mipya (UGX ${cost.toLocaleString()}) gisimbiddwa kyetemba kya ${member.name}!`
         : `Successfully stamped ${sharesToBuy} new shares (UGX ${cost.toLocaleString()}) for ${member.name}!`;
    setFeedbackNotice(msg);
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col flex-1 pb-12">
      {/* OFFLINE FIELD READINESS BANNER */}
      <div className="w-full bg-primary text-white text-xs py-1.5 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-secondary-fixed animate-pulse" />
            <span>
              {language === 'LU'
                 ? 'KIKOLA AWATALI YINTANEETI · Ebizibu biri mu ssimu'
                 : 'OFFLINE READY · Phone Memory Active'}
            </span>
          </div>
            <span className="text-[11px] opacity-80 font-mono">{str('Saved on this phone', 'Ebiri ku ssimu eno')}</span>
        </div>
      </div>

      {feedbackNotice && (
        <div className="mx-4 mt-2 bg-status-ok-bg border border-secondary text-status-ok-tx p-3 rounded-lg text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">task_alt</span>
            {feedbackNotice}
          </span>
          <span className="font-mono text-[10px]">REC-PASS-{meetingNo}</span>
        </div>
      )}

      {/* Member Selection Scrollable Strip */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
            {t.passbook.selectMember} ({members.length})
          </label>
          {onAddMember && (
            <button
              type="button"
              onClick={onAddMember}
              className="px-2.5 py-1.5 bg-[#006d30] text-white rounded-lg text-[11px] font-bold flex items-center gap-1 active:scale-95"
            >
              <span className="material-symbols-outlined text-[14px]">person_add</span>
                {str('Register', 'Wandiika')}
            </button>
          )}
        </div>
        <div className="relative mb-2">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-[18px]">
            search
          </span>
          <input
            type="search"
            value={memberQuery}
            onChange={(e) => setMemberQuery(e.target.value)}
            placeholder={t.common.search}
            aria-label={t.passbook.selectMember}
            className="w-full min-h-[42px] pl-9 pr-3 bg-surface-card border border-border-line rounded-lg text-sm text-on-surface placeholder:text-text-muted focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {visibleMembers.map((m) => {
            const isSelected = m.id === member.id;
            return (
              <button
                key={m.id}
                onClick={() => onSelectMember(m.id)}
                className={`pl-1 pr-3 py-1 rounded-full text-xs font-bold shrink-0 flex items-center gap-1.5 transition min-h-[40px] ${
                  isSelected
                    ? 'bg-primary-container text-white shadow'
                    : 'bg-surface-card border border-border-line text-on-surface hover:border-primary'
                }`}
                type="button"
              >
                <MemberAvatar name={m.name} initials={m.initials} photoUrl={m.photoUrl} sizeClass="w-8 h-8 text-[11px]" />
                <span className="font-mono opacity-80">#{m.no}</span>
                <span>{m.name.split(' ')[0]}</span>
              </button>
            );
          })}
          {visibleMembers.length === 0 && (
            <span className="text-xs text-text-muted py-1.5">—</span>
          )}
        </div>
      </div>

      {/* MAIN CANVAS */}
      <main className="px-4 pt-2 space-y-4">
        {/* BILINGUAL TITLE BREADCRUMB */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[18px]">menu_book</span>
            <h2 className="text-headline-md font-headline-md text-primary tracking-tight font-bold">
              {t.passbook.title}
            </h2>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-surface-container-high text-primary">
            {str('Cycle', 'Enziringana')} {cycle} · {str('Week', 'Wiiki')} {meetingNo}
          </span>
        </div>

        {/* Member record export */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleExportMember('json')}
            className="flex-1 min-h-[40px] px-3 bg-surface-card border border-border-line rounded-lg text-xs font-bold text-primary flex items-center justify-center gap-1.5 active:scale-[0.99]"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
             {str('Record (.json)', 'Kikope (.json)')}
          </button>
          <button
            type="button"
            onClick={() => handleExportMember('csv')}
            className="flex-1 min-h-[40px] px-3 bg-surface-card border border-border-line rounded-lg text-xs font-bold text-primary flex items-center justify-center gap-1.5 active:scale-[0.99]"
          >
            <span className="material-symbols-outlined text-[16px]">table_view</span>
             {str('Sheet (.csv)', 'Olupapula (.csv)')}
          </button>
        </div>

        {/* MEMBER IDENTITY HERO CARD */}
        <div className="bg-primary-container text-white rounded-xl p-4 shadow-[0px_4px_12px_rgba(11,61,46,0.16)] border-2 border-primary relative overflow-hidden">
          {/* Top Member Badge Row */}
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3">
              {member.photoUrl ? (
                <img
                  src={member.photoUrl}
                  alt={member.name}
                  className="w-12 h-12 rounded-xl object-cover border-2 border-primary-fixed shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-surface-card text-primary font-bold flex items-center justify-center border-2 border-primary-fixed shadow-sm">
                  <span className="text-headline-md font-headline-md font-bold">
                    {member.initials}
                  </span>
                </div>
              )}
              {onUpdatePhoto && (
                <>
                  <button
                    type="button"
                    onClick={() => photoRef.current?.click()}
                    disabled={photoBusy}
                    title={language === 'LU' ? 'Kubya ekifaananyi' : 'Retake face photo'}
                    className="w-9 h-9 rounded-full bg-white/15 border border-white/40 text-white flex items-center justify-center active:scale-95 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {photoBusy ? 'progress_activity' : 'photo_camera'}
                    </span>
                  </button>
                  <input
                    ref={photoRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={(e) => retakePhoto(e.target.files?.[0])}
                  />
                </>
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-headline-md font-headline-md text-white font-bold leading-none">
                    {member.name}
                  </h3>
                  <span className="bg-secondary text-white text-[11px] font-bold px-1.5 py-0.5 rounded">
                    #{member.no}
                  </span>
                  {member.memNumber && (
                    <span className="bg-white/20 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-white/30">
                      {member.memNumber}
                    </span>
                  )}
                </div>
                <p className="text-xs text-primary-fixed flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                  {member.zone}
                </p>
                {(member.kinName || member.guarantorName) && (
                  <p className="text-[11px] text-white/80 mt-1">
                     {member.kinName ? `${str('Kin', 'Omulanda')}: ${member.kinName}${member.kinPhone ? ` (${shownPhone(member.kinPhone)})` : ''}` : ''}
                    {member.kinName && member.guarantorName ? ' · ' : ''}
                     {member.guarantorName ? `${str('Guarantor', 'Omuyima')}: ${member.guarantorName}${member.guarantorPhone ? ` (${shownPhone(member.guarantorPhone)})` : ''}` : ''}
                  </p>
                )}
              </div>
            </div>

            {member.isKeyholder && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-status-warn-bg text-status-warn-tx text-[11px] font-bold">
                <span className="material-symbols-outlined text-[14px]">key</span>
                 {member.keyholderTitle || str('Keyholder', 'Omukwasi w’ekisumuluzo')}
              </span>
            )}
            {photoError && (
              <p className="text-[11px] font-bold text-amber-200 mt-1">{photoError}</p>
            )}
          </div>

          {/* MoMo & Security Verification Strip */}
          <div className="mt-3.5 pt-3 border-t border-primary/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 bg-black/25 px-2.5 py-1 rounded-lg">
              <span className={`w-2.5 h-2.5 rounded-full ${member.provider === 'MTN' ? 'bg-[#EAB308]' : 'bg-red-500'}`} />
              <span className="font-mono text-white font-semibold">
                {member.provider} {shownPhone(member.phone)}
              </span>
               {member.phone && member.phone !== '—' ? (
                 <span className="material-symbols-outlined text-secondary-fixed text-[16px]">verified</span>
               ) : (
                   <span className="text-[10px] text-white/70">{str('No phone', 'Tewali simu')}</span>
               )}
            </div>
            <div className="flex items-center gap-1 text-primary-fixed">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>
                 {str('Attendance', 'Okubeerawo')}: {member.attendance}
              </span>
            </div>
          </div>

          {/* 2x2 Asymmetric Core Metric BENTO inside Hero Card */}
          <div className="grid grid-cols-2 gap-2.5 mt-3.5">
            {/* Metric 1: Total Savings */}
            <div className="bg-white text-on-surface p-3 rounded-lg border border-border-strong shadow-sm">
              <div className="flex items-center justify-between text-text-muted mb-0.5">
                <span className="text-xs font-semibold">{t.passbook.sharesTotal}</span>
                <span className="material-symbols-outlined text-secondary text-[16px]">savings</span>
              </div>
              <div className="font-mono text-currency-lg text-primary font-bold tracking-tight">
                UGX {member.sharesTotal.toLocaleString('en-US')}
              </div>
              <p className="text-[11px] text-text-muted font-medium mt-0.5">
                  {member.sharesCount} {str('shares', 'emigabo')} @ UGX {currentSharePrice.toLocaleString()}
              </p>
            </div>

            {/* SACCO equity statement — what is owned, earned and owed */}
            {equityStatement.interestRatePct > 0 && (
              <div className="col-span-2 bg-surface-container-low p-3 rounded-lg border border-border-strong space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary uppercase tracking-wide">
                    {str('Equity statement', 'Kiteera kya netto')}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {equityStatement.category}{equityStatement.since ? ` · ${str('member since', 'kirimu okuva ku')} ${equityStatement.since}` : ''}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="block text-text-muted">{str('Shares', 'Emigabo')}</span>
                    <span className="block font-mono font-bold text-primary">{equityStatement.shares} @ UGX {equityStatement.sharePrice.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-text-muted">{str('Interest this cycle', 'Ssali ekizibu kino')}</span>
                    <span className="block font-mono font-bold text-status-ok-tx">
                      {equityStatement.interest > 0 ? `UGX ${equityStatement.interest.toLocaleString()}` : `— (${equityStatement.interestRatePct}%)`}
                    </span>
                  </div>
                  <div>
                    <span className="block text-text-muted">{str('Still owed', 'Obusigala nga')}</span>
                    <span className="block font-mono font-bold text-primary">UGX {equityStatement.loan.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-text-muted">{str('Net equity', 'Netto')}</span>
                    <span className="block font-mono font-bold text-primary">UGX {equityStatement.netEquity.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Metric 2: Borrowing Limit Rule */}
            <div className="bg-white text-on-surface p-3 rounded-lg border border-border-strong shadow-sm">
              <div className="flex items-center justify-between text-text-muted mb-0.5">
                <span className="text-xs font-semibold">{t.passbook.maxBorrow}</span>
                <span className="material-symbols-outlined text-primary text-[16px]">rule</span>
              </div>
              <div className="font-mono text-currency-lg text-primary font-bold tracking-tight">
                UGX {member.maxBorrowLimit.toLocaleString('en-US')}
              </div>
              <p className="text-[11px] text-secondary font-semibold mt-0.5">
                  {member.loanBalance > 0 ? str('Loan active', 'Banja ekikolo') : member.maxBorrowLimit > 0 ? str('Eligible', 'Yanabaleka') : str('No savings yet', 'Tewali nterekanya')}
              </p>
            </div>

            {/* Metric 3: Active Loan Balance */}
            <div className="bg-status-bad-bg/60 text-on-surface p-3 rounded-lg border border-status-bad-tx/30">
              <div className="flex items-center justify-between text-status-bad-tx mb-0.5">
                <span className="text-xs font-semibold">{t.passbook.loanBalance}</span>
                <span className="material-symbols-outlined text-status-bad-tx text-[16px]">
                  pending_actions
                </span>
              </div>
              <div className="font-mono text-currency-lg text-status-bad-tx font-bold tracking-tight">
                UGX {member.loanBalance.toLocaleString('en-US')}
              </div>
              <p className="text-[11px] text-status-bad-tx font-semibold mt-0.5">
                 {member.loanBalance > 0
                   ? str('Active loan obligation', 'Banja ly’ekyewolo erisigadde')
                   : str('No active debt', 'Tewali bbanja erisigadde')}
              </p>
            </div>

            {/* Metric 4: Welfare Fund */}
            <div className="bg-white text-on-surface p-3 rounded-lg border border-border-strong shadow-sm">
              <div className="flex items-center justify-between text-text-muted mb-0.5">
                <span className="text-xs font-semibold">{t.passbook.welfareBalance}</span>
                <span className="material-symbols-outlined text-secondary text-[16px]">
                  diversity_1
                </span>
              </div>
              <div className="font-mono text-currency-lg text-primary font-bold tracking-tight">
                UGX {member.welfareBalance.toLocaleString('en-US')}
              </div>
              <p className="text-[11px] text-status-ok-tx font-semibold mt-0.5">
                 {str('Fully up to date', 'Yasasudde bulungi')}
              </p>
            </div>
          </div>
        </div>

        {/* DIGITAL STAMP CARD (Share Purchase Passbook) */}
        <section className="bg-surface-card rounded-xl p-4 border border-border-line shadow-[0px_1px_3px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-headline-sm font-headline-sm text-primary font-bold">
                {t.passbook.stampCard}
              </h4>
              <p className="text-xs text-text-muted">
                  {str('Cycle', 'Enziringana')} {cycle}: {str('stamp strip', 'kaadi ya sitamu')}
              </p>
            </div>
            <button
              onClick={() => setShowBuySharesModal(true)}
              className="px-2.5 py-1 bg-secondary text-white rounded text-xs font-bold flex items-center gap-1 hover:bg-emerald-700 active:scale-95 transition"
              type="button"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              {t.passbook.buySharesBtn}
            </button>
          </div>

          {/* Stamps Grid */}
          <div className="grid grid-cols-5 gap-2 pt-2">
            {member.stamps.map((st) => {
              if (st.status === 'validated') {
                return (
                  <div
                    key={st.week}
                    className="aspect-square bg-status-ok-bg rounded-lg border-2 border-secondary flex flex-col items-center justify-center p-1"
                  >
                    <span className="material-symbols-outlined text-secondary text-[22px]">
                      verified
                    </span>
                    <span className="font-mono text-[10px] text-status-ok-tx font-bold leading-none mt-1">
                       {str('WK', 'Wiiki')} {st.week}
                    </span>
                     <span className="text-[9px] text-text-muted font-mono">{st.shares} {str('shares', 'emigabo')}</span>
                  </div>
                );
              }

              if (st.status === 'current') {
                return (
                  <div
                    key={st.week}
                    className="aspect-square bg-secondary text-white rounded-lg border-2 border-secondary flex flex-col items-center justify-center p-1 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[22px]">verified</span>
                    <span className="font-mono text-[10px] text-white font-bold leading-none mt-1">
                       {str('WK', 'Wiiki')} {st.week}
                    </span>
                     <span className="text-[9px] text-secondary-fixed font-mono">{st.shares} {str('shares', 'emigabo')}</span>
                  </div>
                );
              }

              return (
                <div
                  key={st.week}
                  className="aspect-square bg-canvas-bg rounded-lg border-2 border-dashed border-border-strong flex flex-col items-center justify-center p-1"
                >
                  <span className="material-symbols-outlined text-text-muted text-[20px]">
                    {st.status === 'close' ? 'lock_clock' : 'hourglass_top'}
                  </span>
                  <span className="font-mono text-[10px] text-text-muted font-medium mt-1">
                    WK {st.week}
                  </span>
                  <span className="text-[9px] text-text-muted font-mono">
                     {st.status === 'close' ? str('Close', 'Ggala') : str('Next', 'Olulaku')}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-2.5 pt-2 border-t border-border-line flex items-center justify-between text-[11px] text-text-muted">
            <span>
              {language === 'LU'
                 ? 'Sitamu y’omuwandiisi ekakasiddwa bulungi'
                 : 'Permanent physical stamp ink verified by Secretary'}
            </span>
            <span className="font-mono font-bold text-primary">#STAMP-SEC-01</span>
          </div>
        </section>

        {/* ACTIVE LOAN & REPAYMENT SECTION */}
        <section className="bg-surface-card rounded-xl p-4 border border-border-line shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-secondary">
                 {str('Active loan', 'Banja erisigadde')}
              </span>
              <h4 className="text-headline-sm font-headline-sm text-primary font-bold">
                {member.loanBalance > 0
                   ? `${str('Active balance', 'Banja erisigadde')}: UGX ${member.loanBalance.toLocaleString()}`
                   : str('No active loan debt', 'Tewali bbanja erisigadde')}
              </h4>
            </div>
            {member.loanBalance > 0 ? (
              <span className="px-2 py-1 rounded bg-status-ok-bg text-status-ok-tx text-xs font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                 {str('Active', 'Eriso') }
              </span>
            ) : (
              <span className="px-2 py-1 rounded bg-surface-container text-text-muted text-xs font-semibold">
                 {str('Clear', 'Tukimuddwa')}
              </span>
            )}
          </div>

          {member.loanBalance > 0 && (
            <div className="p-3 bg-canvas-bg rounded-lg border border-border-line flex justify-between items-center text-xs">
              <div>
                <span className="text-text-muted block text-[11px]">{t.passbook.outstandingLoan}</span>
                <span className="font-mono font-bold text-status-bad-tx text-base">
                  UGX {member.loanBalance.toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-text-muted block text-[11px]">
                   {str('Next due meeting', 'Olukuŋŋaana oluddako')}
                </span>
                   <span className="font-bold text-on-surface">Meeting #{meetingNo + 1} (next meeting)</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 gap-2 pt-1">
            {member.loanBalance > 0 ? (
              <button
                onClick={() => {
                  setRepaymentAmount(Math.min(20000, member.loanBalance));
                  setShowRepaymentModal(true);
                }}
                className="w-full h-12 bg-secondary active:scale-[0.99] text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-sm border border-secondary transition-all text-sm"
                type="button"
              >
                <span className="material-symbols-outlined">payments</span>
                {t.passbook.repayCashBtn}
              </button>
            ) : (
              <button
                onClick={() => onNavigate('new_loan')}
                className="w-full h-12 bg-primary text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-primary-container transition text-sm"
                type="button"
              >
                <span className="material-symbols-outlined">add_card</span>
                {t.passbook.applyLoanBtn}
              </button>
            )}

            <button
              onClick={() => onNavigate('momo_push')}
              className="w-full h-11 bg-surface-card hover:bg-surface-container text-primary border border-border-strong rounded-lg font-semibold flex items-center justify-center gap-2 active:scale-[0.99] transition-all text-sm"
              type="button"
            >
              <span className="material-symbols-outlined text-[#EAB308]">phone_android</span>
              {t.passbook.momoCollectionBtn}
            </button>
          </div>
        </section>

        {/* RECENT PASSBOOK LEDGER TRANSACTIONS */}
        <section className="bg-surface-card rounded-xl p-4 border border-border-line shadow-[0px_1px_3px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-headline-sm font-headline-sm text-primary font-bold">
                {t.passbook.passbookLedger}
              </h4>
              <p className="text-xs text-text-muted">
                 {str('Signed field meeting entries', 'Ebiwandiiko by’olukuŋŋaana ebikakasseetwa')}
              </p>
            </div>
          </div>

          {member.ledger.length === 0 ? (
            <div className="text-center py-4 text-xs text-text-muted">
              {language === 'LU' ? 'Tewali biwandiiko biweddeko eri mmemba ono.'  : 'No recent ledger entries for this member yet.'}
            </div>
          ) : (
            <div className="space-y-2">
              {(ledgerExpanded ? member.ledger : member.ledger.slice(0, 4)).map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 bg-canvas-bg rounded-lg border border-border-line flex items-start justify-between"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-primary">{entry.title}</span>
                      <span className="text-[10px] font-mono bg-white px-1.5 py-0.2 rounded border">
                        {entry.badge}
                      </span>
                    </div>
                     <p className="text-xs text-text-muted mt-0.5">{entry.subtitle}</p>
                     {entry.shareClassName && (
                       <span className="text-[10px] font-mono text-text-muted block mt-0.5">
                         {entry.shareClassName} · {entry.unitPrice ? `${str('each', 'kikomo')} UGX ${entry.unitPrice.toLocaleString()}` : str('Price not recorded', 'Omutengo tewawandiikibwa')}
                         {entry.shareCount ? ` · ${entry.shareCount} ${str('shares', 'emigabo')}` : ''}
                       </span>
                     )}
                     <span className="text-[10px] text-text-muted block mt-0.5">{entry.date}</span>
                  </div>
                  <span
                    className={`font-mono font-bold text-xs ${
                      entry.isPositive ? 'text-status-ok-tx' : 'text-status-bad-tx'
                    }`}
                  >
                    {entry.amountText}
                  </span>
                </div>
              ))}
              {member.ledger.length > 4 && (
                <button
                  type="button"
                  onClick={() => setLedgerExpanded(!ledgerExpanded)}
                  className="w-full py-2.5 bg-canvas-bg border border-border-line rounded-lg text-xs font-bold text-primary active:scale-[0.99]"
                >
                  {ledgerExpanded
                    ? (language === 'LU' ? 'Kweka ebikadde ▲' : 'Hide older ▲')
                    : (language === 'LU'
                        ? `Ebiwandiiko ebikadde (${member.ledger.length - 4}) ▼`
                        : `Earlier entries (${member.ledger.length - 4}) ▼`)}
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      {/* REPAYMENT MODAL */}
      {showRepaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card w-full max-w-sm rounded-xl p-4 border border-border-strong shadow-2xl space-y-3 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-primary text-sm flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary">payments</span>
                {t.passbook.repayCashBtn}
              </h3>
              <button
                onClick={() => setShowRepaymentModal(false)}
                className="text-text-muted hover:text-primary"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-text-muted">
              {language === 'LU'
                 ? `Wandiika ssente eziri ku mubanja eri ${member.name}, UGX ${member.loanBalance.toLocaleString()}.`
                 : `Record physical cash paid by ${member.name} toward their loan balance of UGX ${member.loanBalance.toLocaleString()}.`}
            </p>

            <form onSubmit={handleCashRepaymentSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">
                   {str('Repayment amount (UGX)', 'Omuwendo gw’okusasula (UGX)')}
                </label>
                <input
                  type="number"
                  step="100"
                  value={repaymentAmount}
                  onChange={(e) => setRepaymentAmount(Number(e.target.value))}
                  className="w-full bg-white border border-border-strong rounded-lg p-2 text-sm font-mono font-bold text-primary"
                  max={member.loanBalance}
                   min={0}
                />
                {repaymentAmount > member.loanBalance && (
                  <p className="text-[11px] font-bold text-status-warn-tx bg-status-warn-bg border border-[#FDE68A] rounded-lg p-2 mt-1.5">
                    {language === 'LU'
                       ? `Omuwendo gwakusukka: mpewo UGX ${(repaymentAmount - member.loanBalance).toLocaleString()} eri ${member.name}. Ekitabo kijja kuwandiika UGX ${member.loanBalance.toLocaleString()} yokka.`
                      : `Overpayment: hand back UGX ${(repaymentAmount - member.loanBalance).toLocaleString()} change to ${member.name}. Only UGX ${member.loanBalance.toLocaleString()} will be recorded.`}
                  </p>
                )}
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-3 gap-1 text-xs">
                {[20000, 40000, member.loanBalance].filter((preset, index, presets) => preset > 0 && preset <= member.loanBalance && presets.indexOf(preset) === index).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRepaymentAmount(preset)}
                    className="py-1 bg-canvas-bg border rounded text-[11px] font-mono hover:border-primary"
                  >
                    {preset === member.loanBalance
                       ? str('Full balance', 'Banja lyonna')
                      : `${preset / 1000}k`}
                  </button>
                ))}
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-secondary hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow transition"
                >
                   {str('Confirm cash receipt', "Kakasa risiti y'ensimbi")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRepaymentModal(false)}
                  className="py-2.5 px-3 bg-surface-container border text-text-muted text-xs font-semibold rounded-lg"
                >
                  {t.common.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BUY SHARES MODAL */}
      {showBuySharesModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card w-full max-w-sm rounded-xl p-4 border border-border-strong shadow-2xl space-y-3 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-primary text-sm flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary">savings</span>
                {t.passbook.buySharesTitle} {member.name}
              </h3>
              <button
                onClick={() => setShowBuySharesModal(false)}
                className="text-text-muted hover:text-primary"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-text-muted">
              {language === 'LU'
                 ? `Buli mugabo gwa UGX ${currentSharePrice.toLocaleString()}. Yingiza omuwendo gw'emigabo ogula leero.`
                 : `Each share costs UGX ${currentSharePrice.toLocaleString()}. Enter the number of shares purchased today.`}
            </p>
            {activeShareClasses.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {activeShareClasses.map((shareClass) => (
                  <button
                    key={shareClass.id}
                    type="button"
                    onClick={() => setSelectedShareClassId(shareClass.id)}
                    className={`min-h-[40px] px-2.5 rounded-lg text-xs font-bold border ${selectedShareClass?.id === shareClass.id ? 'bg-primary text-white' : 'bg-white text-primary'}`}
                  >
                    {shareClass.name} · UGX {shareClass.price.toLocaleString()}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleBuySharesSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">
                  {t.passbook.numberOfShares}
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setSharesToBuy(cnt)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold font-mono transition ${
                        sharesToBuy === cnt
                          ? 'bg-secondary text-white shadow'
                          : 'bg-canvas-bg border text-on-surface'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 bg-canvas-bg rounded-lg border text-xs flex justify-between items-center font-mono">
                <span className="text-text-muted">{t.passbook.totalCashCollect}:</span>
                <span className="font-bold text-primary text-sm">
                   UGX {(sharesToBuy * currentSharePrice).toLocaleString()}
                </span>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-secondary hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow transition"
                >
                  {t.passbook.stampAndCollect}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBuySharesModal(false)}
                  className="py-2.5 px-3 bg-surface-container border text-text-muted text-xs font-semibold rounded-lg"
                >
                  {t.common.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

       <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} language={language} />
    </div>
  );
};
