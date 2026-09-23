import React, { useRef, useState } from 'react';
import { Language, Member, ScreenId } from '../types';
import { getTranslations } from '../i18n/translations';
import { ReceiptData, ReceiptModal } from '../components/ReceiptModal';
import { MemberAvatar } from '../components/MemberAvatar';
import { fileToAvatarDataUrl, maskContact } from '../utils/photo';

interface MemberPassbookViewProps {
  members: Member[];
  selectedMember: Member;
  onSelectMember: (memberId: string) => void;
  onNavigate: (screen: ScreenId) => void;
  onRecordRepayment: (amount: number, memberId: string) => void;
  onBuyShares: (sharesCount: number, memberId: string) => void;
  onAddMember?: () => void;
  /** Retake an existing member's face photo (compressed on-device). */
  onUpdatePhoto?: (memberId: string, photoUrl: string) => void;
  /** Current meeting number for receipt references. */
  meetingNo?: number;
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
  meetingNo = 28,
  language = 'EN',
  groupName = 'Bakwata Savings Group',
  boxIdentifier = 'BOX-KLA-042',
  issuerName = 'Group Secretary',
  viewerMemberId,
  viewerIsOfficer = true,
}) => {
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [repaymentAmount, setRepaymentAmount] = useState(40000);
  const [showBuySharesModal, setShowBuySharesModal] = useState(false);
  const [sharesToBuy, setSharesToBuy] = useState(2);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [memberQuery, setMemberQuery] = useState('');
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const t = getTranslations(language);
  const member = selectedMember || members[0];
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
    onRecordRepayment(repaymentAmount, member.id);
    setShowRepaymentModal(false);
    setReceipt({
      kind: 'repayment',
      refNo: `RCPT-${Date.now().toString(36).toUpperCase()}`,
      date: todayStr(),
      memberName: member.name,
      memberNo: member.no,
      amount: repaymentAmount,
      extraLine: `Loan repayment · New balance UGX ${Math.max(0, member.loanBalance - repaymentAmount).toLocaleString()}`,
      issuerName,
      groupName,
      boxIdentifier,
    });
    const msg =
      language === 'LU'
        ? `Okusasula ssente enkalu kwa UGX ${repaymentAmount.toLocaleString()} kuweereddwa ${member.name}!`
         : `Cash repayment of UGX ${repaymentAmount.toLocaleString()} recorded for ${member.name}!`;
    setFeedbackNotice(msg);
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  const handleBuySharesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sharesToBuy <= 0) return;
    onBuyShares(sharesToBuy, member.id);
    setShowBuySharesModal(false);
    setReceipt({
      kind: 'shares',
      refNo: `RCPT-${Date.now().toString(36).toUpperCase()}`,
      date: todayStr(),
      memberName: member.name,
      memberNo: member.no,
      amount: sharesToBuy * 10000,
      extraLine: `${sharesToBuy} share(s) stamped · Total ${member.sharesCount + sharesToBuy} shares`,
      issuerName,
      groupName,
      boxIdentifier,
    });
    const msg =
      language === 'LU'
        ? `Emigabo ${sharesToBuy} mipya (UGX ${(sharesToBuy * 10000).toLocaleString()}) gisimbiddwa kyetemba kya ${member.name}!`
         : `Successfully stamped ${sharesToBuy} new shares (UGX ${(sharesToBuy * 10000).toLocaleString()}) for ${member.name}!`;
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
                ? 'EKIBIINA KIKOLA WABWERU WA YINTANEETI · Eddaami liri mu ssimu'
                 : 'OFFLINE READY · Phone Memory Active'}
            </span>
          </div>
          <span className="text-[11px] opacity-80 font-mono">Sync: Ready</span>
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
              {language === 'LU' ? 'Wandiisa'  : 'Register'}
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
            Cycle 4 · Wk 28
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
            Record (.json)
          </button>
          <button
            type="button"
            onClick={() => handleExportMember('csv')}
            className="flex-1 min-h-[40px] px-3 bg-surface-card border border-border-line rounded-lg text-xs font-bold text-primary flex items-center justify-center gap-1.5 active:scale-[0.99]"
          >
            <span className="material-symbols-outlined text-[16px]">table_view</span>
            Sheet (.csv)
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
                    {member.kinName ? `Kin: ${member.kinName}${member.kinPhone ? ` (${shownPhone(member.kinPhone)})` : ''}` : ''}
                    {member.kinName && member.guarantorName ? ' · ' : ''}
                    {member.guarantorName ? `Guarantor: ${member.guarantorName}${member.guarantorPhone ? ` (${shownPhone(member.guarantorPhone)})` : ''}` : ''}
                  </p>
                )}
              </div>
            </div>

            {member.isKeyholder && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-status-warn-bg text-status-warn-tx text-[11px] font-bold">
                <span className="material-symbols-outlined text-[14px]">key</span>
                {member.keyholderTitle || (language === 'LU' ? "Mukwasi w'Ebisumuluzo" : 'Keyholder')}
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
              <span className="material-symbols-outlined text-secondary-fixed text-[16px]">
                verified
              </span>
            </div>
            <div className="flex items-center gap-1 text-primary-fixed">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>
                {language === 'LU' ? 'Okubeerawo'  : 'Attendance'}: {member.attendance}
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
                {member.sharesCount} {language === 'LU' ? 'migabo @ UGX 10k'  : 'shares @ UGX 10k'}
              </p>
            </div>

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
                {language === 'LU' ? 'Esaana bulungi'  : 'Eligibility: High'}
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
                  ? (language === 'LU' ? 'Alina ebanja erikola'  : 'Active Loan Obligation')
                  : (language === 'LU' ? 'Talina Banja'  : 'No Active Debt')}
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
                {language === 'LU' ? 'Asasudde bulungi'  : 'Fully up to date'}
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
                Cycle 4: Consecutive 10-Meeting Stamp Strip
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
                      WK {st.week}
                    </span>
                    <span className="text-[9px] text-text-muted font-mono">{st.shares} Shs</span>
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
                      WK {st.week}
                    </span>
                    <span className="text-[9px] text-secondary-fixed font-mono">{st.shares} Shs</span>
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
                    {st.status === 'close' ? 'Close' : 'Next'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-2.5 pt-2 border-t border-border-line flex items-center justify-between text-[11px] text-text-muted">
            <span>
              {language === 'LU'
                ? 'Sitampu y\'omuwandiisi ekakasiddwa mu ngeri ya nnamaddala'
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
                {language === 'LU' ? 'Ebanja Eriwo'  : 'Active Loan'}
              </span>
              <h4 className="text-headline-sm font-headline-sm text-primary font-bold">
                {member.loanBalance > 0
                  ? `${language === 'LU' ? 'Ebanja erikyaliwo'  : 'Active Balance'}: UGX ${member.loanBalance.toLocaleString()}`
                  : (language === 'LU' ? 'Talina Banja Liriko'  : 'No Active Loan Debt')}
              </h4>
            </div>
            {member.loanBalance > 0 ? (
              <span className="px-2 py-1 rounded bg-status-ok-bg text-status-ok-tx text-xs font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                {language === 'LU' ? 'Liriko'  : 'Active'}
              </span>
            ) : (
              <span className="px-2 py-1 rounded bg-surface-container text-text-muted text-xs font-semibold">
                {language === 'LU' ? 'Lyaggwako'  : 'Clear'}
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
                  {language === 'LU' ? 'Olukuŋŋaana oluddako'  : 'Next Due Meeting'}
                </span>
                <span className="font-bold text-on-surface">Meeting #29 (Next Wk)</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 gap-2 pt-1">
            {member.loanBalance > 0 ? (
              <button
                onClick={() => setShowRepaymentModal(true)}
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
                {language === 'LU' ? 'Ebiwandiiko ebyakasiddwa mu nkuŋŋaana'  : 'Signed Field Meeting Entries'}
              </p>
            </div>
          </div>

          {member.ledger.length === 0 ? (
            <div className="text-center py-4 text-xs text-text-muted">
              {language === 'LU' ? 'Tewali biwandiiko biweddeko eri mmemba ono.'  : 'No recent ledger entries for this member yet.'}
            </div>
          ) : (
            <div className="space-y-2">
              {member.ledger.map((entry) => (
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
                    <p className="text-[11px] text-text-muted mt-0.5">{entry.subtitle}</p>
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
                ? `Wandiika ssente za cash eziweereddwa ${member.name} ku bbanja lye erya UGX ${member.loanBalance.toLocaleString()}.`
                 : `Record physical cash paid by ${member.name} toward their loan balance of UGX ${member.loanBalance.toLocaleString()}.`}
            </p>

            <form onSubmit={handleCashRepaymentSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">
                  {language === 'LU' ? 'Omuwendo gw\'okusasula (UGX)'  : 'Repayment Amount (UGX)'}
                </label>
                <input
                  type="number"
                  step="5000"
                  value={repaymentAmount}
                  onChange={(e) => setRepaymentAmount(Number(e.target.value))}
                  className="w-full bg-white border border-border-strong rounded-lg p-2 text-sm font-mono font-bold text-primary"
                  max={member.loanBalance}
                  min={5000}
                />
                {repaymentAmount > member.loanBalance && (
                  <p className="text-[11px] font-bold text-status-warn-tx bg-status-warn-bg border border-[#FDE68A] rounded-lg p-2 mt-1.5">
                    {language === 'LU'
                      ? `Okuwandiika okusukka: zzaayo UGX ${(repaymentAmount - member.loanBalance).toLocaleString()} eri ${member.name} ng'enzizo. Ekitabo kijja kuwandiika UGX ${member.loanBalance.toLocaleString()} yokka.`
                      : `Overpayment: hand back UGX ${(repaymentAmount - member.loanBalance).toLocaleString()} change to ${member.name}. Only UGX ${member.loanBalance.toLocaleString()} will be recorded.`}
                  </p>
                )}
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-3 gap-1 text-xs">
                {[20000, 40000, member.loanBalance].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRepaymentAmount(preset)}
                    className="py-1 bg-canvas-bg border rounded text-[11px] font-mono hover:border-primary"
                  >
                    {preset === member.loanBalance
                      ? (language === 'LU' ? 'Lyonna'  : 'Full Balance')
                      : `${preset / 1000}k`}
                  </button>
                ))}
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-secondary hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow transition"
                >
                  {language === 'LU' ? 'Kakasa Ssente Ezisasuddwa'  : 'Confirm Cash Receipt'}
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
                ? 'Buli mugabo gwa UGX 10,000. Wandiika omuwendo gw\'emigabo egiguze olwaleero.'
                 : 'Each share costs UGX 10,000. Enter number of shares purchased in today\'s meeting.'}
            </p>

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
                  UGX {(sharesToBuy * 10000).toLocaleString()}
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

      <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
};
