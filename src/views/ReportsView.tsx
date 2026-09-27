import React from 'react';
import { Language, Member, ScreenId, VSLAState } from '../types';
import { buildCollectionSheet } from '../utils/collectionSheet';
import { LATE_FINE_AMOUNT } from '../utils/policy';
import { buildMemberRegister, memberRegisterCsv, registerSummary } from '../utils/sacco';
import { buildSurplusPlan, policyFor, saccoFundsTotal } from '../utils/surplus';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface ReportsViewProps {
  state: VSLAState;
  onNavigate: (screen: ScreenId) => void;
  onProposeFine: (member: Member) => void;
  language?: Language;
}

/**
 * Upgrades #11 + #13 — financial reports (collections, arrears,
 * fund performance) with CSV/print export and one-tap arrears
 * fine proposals.
 */
export const ReportsView: React.FC<ReportsViewProps> = ({
  state,
  onNavigate,
  onProposeFine,
  language = 'EN',
}) => {
  const members = state.members || [];
  const totalSavings = members.reduce((s, m) => s + (m.sharesTotal || 0), 0);
  const totalLoansOut = members.reduce((s, m) => s + (m.loanBalance || 0), 0);
  const totalWelfare = members.reduce((s, m) => s + (m.welfareBalance || 0), 0);
  const finesCollected = (state.fines || [])
    .filter((f) => f.status === 'collected')
    .reduce((s, f) => s + f.amount, 0);
  const finesPending = (state.fines || [])
    .filter((f) => f.status === 'pending')
    .reduce((s, f) => s + f.amount, 0);

  const debtors = members.filter((m) => (m.loanBalance || 0) > 0);
  const shopProfit = (state.productSales || [])
    .filter((s) => s.sellerType === 'group')
    .reduce((sum, s) => sum + (s.unitPrice - s.costAtSale) * s.qty, 0);
  const coverageRate = totalLoansOut > 0
    ? Math.min(100, Math.round((totalSavings / totalLoansOut) * 100))
    : null;

  const str = (en: string, lu: string) => language === 'LU' ? lu : en;
  const displayGroupName = !state.groupName || state.groupName === 'Savings Group' ? str('Savings Group', 'Ekibiina ky’ensimbi') : state.groupName;
  const displayBoxIdentifier = !state.boxIdentifier || state.boxIdentifier === 'BOX' ? str('BOX', 'SANDUUKO') : state.boxIdentifier;
  const attendanceLabel = (value: string) => language === 'LU'
    ? ({ present: 'aliyo', late: 'akyaludde', absent: 'teyaliyo' } as Record<string, string>)[value.toLowerCase()] || value
    : value;

  const [chartTab, setChartTab] = React.useState<'tables' | 'charts' | 'sheet' | 'registers'>('tables');
  // SACCO member register: one row per member, the artefact a registrar asks
  // for, exported as CSV from the same numbers shown on screen.
  const registerRows = React.useMemo(() => buildMemberRegister(state), [state]);
  const registerTotals = React.useMemo(() => registerSummary(registerRows), [registerRows]);
  const surplusPolicy = policyFor(state.groupProfile);
  const surplusResolutions = state.surplusResolutions || [];
  // Percentages only, so the note is true whatever the cycle earns.
  const surplusPlan = React.useMemo(() => buildSurplusPlan(100000, 0, surplusPolicy), [surplusPolicy]);
  const fundsTotal = saccoFundsTotal(state.saccoFunds);
  const exportRegister = () => {
    const csv = memberRegisterCsv(registerRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `member_register_${(state.groupName || 'group').replace(/[^a-z0-9]+/gi, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const [fineTarget, setFineTarget] = React.useState<Member | null>(null);
  const sheet = React.useMemo(() => buildCollectionSheet(state), [state]);

  const topSavers = [...members].sort((a, b) => (b.sharesTotal || 0) - (a.sharesTotal || 0)).slice(0, 8);
  const maxSaved = Math.max(1, ...topSavers.map((m) => m.sharesTotal || 0));
  const fundTotal = Math.max(1, totalSavings + totalLoansOut + totalWelfare);
  const donutSegs = [
    { label: str('Savings', 'Enterekanya'), value: totalSavings, color: '#006d30' },
    { label: str('Loans out', 'Amabanja'), value: totalLoansOut, color: '#EAB308' },
    { label: str('Welfare', 'Obuyambi'), value: totalWelfare, color: '#0b3d2e' },
  ];
  let donutOffset = 25;

  const exportCsv = () => {
    const rows = [
      [str('Group', 'Ekibiina'), displayGroupName, displayBoxIdentifier],
      [str('Exported', 'Wandikwa'), new Date().toISOString()],
      [],
      [str('No', 'Namba'), str('Name', 'Amatongo'), str('Phone', 'Essimu'), str('Shares', 'Emigabo'), str('Savings (UGX)', 'Enterekanya (UGX)'), str('Loan Balance (UGX)', 'Bbanja ly’ekyewolo (UGX)'), str('Welfare (UGX)', 'Obuyambi (UGX)'), str('Attendance', 'Kizibu')],
      ...members.map((m) => [
        m.no, m.name, m.phone, String(m.sharesCount),
        String(m.sharesTotal), String(m.loanBalance), String(m.welfareBalance), attendanceLabel(m.attendance),
      ]),
      [],
      [str('Total savings', 'Enterekanya zonna'), String(totalSavings)],
      [str('Loans outstanding', 'Amabanja galwadde'), String(totalLoansOut)],
      [str('Welfare held', 'Obuyambi obuli mu kibiina'), String(totalWelfare)],
      [str('Fines collected', 'Engassi ezikunganyiziddwa'), String(finesCollected)],
      [str('Fines pending', 'Engassi ezirindirira'), String(finesPending)],
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = language === 'LU'
      ? `vsla_lipoota_${new Date().toISOString().split('T')[0]}.csv`
      : `vsla_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const metric = (label: string, value: string, sub: string) => (
    <div className="bg-canvas-bg rounded-lg p-2.5 border border-border-line">
      <span className="text-[11px] font-medium text-text-muted block">{label}</span>
      <span className="font-mono text-sm font-bold text-on-surface">{value}</span>
      <span className="text-[10px] text-text-muted block">{sub}</span>
    </div>
  );

  return (
    <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-14 flex-1 space-y-4">
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-2">
           <button
             onClick={() => onNavigate('home')}
             className="w-9 h-9 rounded-lg bg-surface-card border border-border-strong flex items-center justify-center text-primary active:scale-95 transition"
             type="button"
             aria-label={str('Back', 'Ddayo emabega')}
           >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <div>
            <h1 className="font-bold text-primary">
              {str('Financial Reports', 'Lipoota z’essente')}
            </h1>
             <p className="text-xs text-text-muted">{displayGroupName}</p>
          </div>
        </div>
        <span className="font-mono text-xs font-bold text-primary bg-surface-container px-2 py-1 rounded">
             {coverageRate === null ? str('No loans yet', 'Tewali mabanja') : `${coverageRate}% ${str('loan coverage', 'Ssente z’oterekebwa zikwata amabanja')}`}
        </span>
      </div>

      <div className="flex bg-surface-card p-1 rounded-xl border border-border-strong text-xs font-bold no-print">
        <button
          type="button"
          onClick={() => setChartTab('tables')}
          className={`flex-1 py-2 rounded-lg transition ${chartTab === 'tables' ? 'bg-primary-container text-white shadow-sm' : 'text-text-muted hover:text-primary'}`}
        >
          {str('Tables', 'Emiwendo')}
        </button>
        <button
          type="button"
          onClick={() => setChartTab('sheet')}
          className={`flex-1 py-2 rounded-lg transition ${chartTab === 'sheet' ? 'bg-primary-container text-white shadow-sm' : 'text-text-muted hover:text-primary'}`}
        >
          {str('Collection sheet', 'Olupapula')}
        </button>
        <button
          type="button"
          onClick={() => setChartTab('registers')}
          className={`flex-1 py-2 rounded-lg transition ${chartTab === 'registers' ? 'bg-primary-container text-white shadow-sm' : 'text-text-muted hover:text-primary'}`}
        >
          {str('Registers', 'Ebiseera')}
        </button>
        <button
          type="button"
          onClick={() => setChartTab('charts')}
          className={`flex-1 py-2 rounded-lg transition ${chartTab === 'charts' ? 'bg-primary-container text-white shadow-sm' : 'text-text-muted hover:text-primary'}`}
        >
          {str('Charts', 'Ebifaananyi')}
        </button>
      </div>

      {chartTab === 'charts' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <section className="bg-surface-card rounded-xl border border-border-line p-4 shadow-sm">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">
              {str('Where the money sits', 'Ssente we ziri')}
            </h3>
            <div className="flex items-center gap-4">
               <svg viewBox="0 0 42 42" className="w-28 h-28 shrink-0" role="img" aria-label={str('Fund split', 'Ebizimukidde by’essente')}>
                <circle cx="21" cy="21" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="7" />
                {donutSegs.map((s) => {
                  const frac = s.value / fundTotal;
                  const el = (
                    <circle
                      key={s.label}
                      cx="21"
                      cy="21"
                      r="15.9"
                      fill="none"
                      stroke={s.color}
                      strokeWidth="7"
                      strokeDasharray={`${(frac * 100).toFixed(1)} ${(100 - frac * 100).toFixed(1)}`}
                      strokeDashoffset={donutOffset.toFixed(1)}
                      strokeLinecap="butt"
                    />
                  );
                  donutOffset -= frac * 100;
                  return el;
                })}
              </svg>
              <div className="space-y-1.5 text-xs">
                {donutSegs.map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
                    <span className="text-text-muted">{s.label}</span>
                    <span className="font-mono font-bold">{Math.round((s.value / fundTotal) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-surface-card rounded-xl border border-border-line p-4 shadow-sm">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">
              {str('Top savers', 'Abatereka ssente ennyo')}
            </h3>
            <div className="space-y-2">
              {topSavers.map((m) => (
                <div key={m.id}>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="font-semibold truncate">{m.name} <span className="font-mono text-text-muted">#{m.no}</span></span>
                    <span className="font-mono font-bold shrink-0 ml-2">{(m.sharesTotal || 0).toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-border-line rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-secondary h-2 rounded-full"
                      style={{ width: `${Math.max(2, Math.round(((m.sharesTotal || 0) / maxSaved) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
              {topSavers.length === 0 && (
                <p className="text-xs text-text-muted">{str('No savings yet.', 'Tewali ssente eziterekedwa.')}</p>
              )}
            </div>
          </section>
        </div>
      )}

      {chartTab === 'tables' && (
      <div className="print-area space-y-4">
        <section className="bg-surface-card rounded-xl border border-border-line p-4 shadow-sm">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
            {str('Fund Performance', 'Embeera y’essente')}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {metric(str('Member savings', 'Ssente eziterekedwa'), `UGX ${totalSavings.toLocaleString()}`, `${members.length} ${str('members', 'abakiise')}`)}
            {metric(str('Loans outstanding', 'Amabanja galwadde'), `UGX ${totalLoansOut.toLocaleString()}`, `${debtors.length} ${str('borrowers', 'ababeewola')}`)}
            {metric(str('Welfare held', 'Obuyambi obuli mu kibiina'), `UGX ${totalWelfare.toLocaleString()}`, str('emergency buffer', 'Enkoba y’obuzibu'))}
            {metric(str('Shop profit', 'Muwendo owoza'), `UGX ${shopProfit.toLocaleString()}`, str('to loan fund', 'mu byewolo'))}
            {metric(str('Fines in/out', 'Engassi'), `UGX ${finesCollected.toLocaleString()}`, `${str('pending', 'zirindirira')} UGX ${finesPending.toLocaleString()}`)}
          </div>
          {/* Repayment health bar */}
          {coverageRate !== null && (
            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-text-muted mb-1">
                <span>{str('Savings coverage of loans', 'Ssente eziterekedwa zikwata amabanja')}</span>
                <span className="font-mono font-bold text-primary">{coverageRate}%</span>
              </div>
              <div className="w-full bg-border-line rounded-full h-2.5 overflow-hidden">
                <div className="bg-secondary h-2.5 rounded-full" style={{ width: `${coverageRate}%` }} />
              </div>
            </div>
          )}
        </section>

        {/* Arrears watch */}
        <section className="bg-surface-card rounded-xl border border-border-line p-4 shadow-sm space-y-2">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
            {str('Arrears Watch', 'Amabanja ga beerina')} ({debtors.length})
          </h3>
          {debtors.length === 0 ? (
            <p className="text-xs text-status-ok-tx bg-status-ok-bg rounded-lg p-3 font-semibold">
              {str('No outstanding loans. All clean!', 'Tewali mabanja galwadde. Byonna birungi!')}
            </p>
          ) : (
            debtors.map((m) => {
              const risk = m.maxBorrowLimit > 0 && m.loanBalance > m.maxBorrowLimit * 0.5;
              return (
                <div key={m.id} className="p-2.5 bg-canvas-bg rounded-lg border border-border-line flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-primary truncate">
                      {m.name} <span className="font-mono text-text-muted">#{m.no}</span>
                    </p>
                    <p className="text-[11px] font-mono">
                      {str('Owes', 'Abbanja')} UGX {m.loanBalance.toLocaleString()}
                      {risk && (
                        <span className="ml-1.5 px-1.5 py-0.2 rounded bg-status-bad-bg text-status-bad-tx text-[10px] font-bold">
                          {str('HIGH RISK', 'KABI ENNYO')}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                     onClick={() => setFineTarget(m)}
                    className="no-print shrink-0 px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-[11px] font-bold active:scale-95"
                  >
                    + {str('Fine', 'Engassi')} 2k
                  </button>
                </div>
              );
            })
          )}
        </section>

        {/* Collections table */}
        <section className="bg-surface-card rounded-xl border border-border-line p-4 shadow-sm">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
            {str('Collections by Member', 'Okukunganyiza kwa buli mukiise')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left text-text-muted border-b border-border-line">
                  <th className="py-1.5 pr-2">#</th>
                  <th className="py-1.5 pr-2">{str('Member', 'Omukiise')}</th>
                  <th className="py-1.5 pr-2 text-right">{str('Saved', 'Aterekedde')}</th>
                  <th className="py-1.5 text-right">{str('Loan', 'Bbanja')}</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-border-line/60">
                    <td className="py-1.5 pr-2">{m.no}</td>
                    <td className="py-1.5 pr-2 font-sans font-semibold">{m.name}</td>
                    <td className="py-1.5 pr-2 text-right">{m.sharesTotal.toLocaleString()}</td>
                    <td className="py-1.5 text-right">{m.loanBalance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      )}

      {chartTab === 'registers' && (
        <div className="print-area space-y-3">
          <section className="bg-white rounded-xl border border-border-line p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h3 className="font-bold text-primary text-sm">{str('Member register', 'Kiseera ky’abakyala')}</h3>
                <p className="text-[11px] text-text-muted">
                  {registerTotals.members} {str('members', 'abakyala')} · {str('share value', 'ntandikwa')} UGX {registerTotals.shareValue.toLocaleString()} · {str('interest', 'ssali')} UGX {registerTotals.interest.toLocaleString()} · {str('loans out', 'bbanja')} UGX {registerTotals.loan.toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={exportRegister}
                className="min-h-[48px] px-3 rounded-lg bg-surface-container border border-border-strong text-primary font-bold text-xs flex items-center gap-1.5 active:scale-[0.99]"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                {str('Export CSV', 'Cunda CSV')}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left text-text-muted">
                    <th className="py-1.5 pr-2 font-bold uppercase tracking-wide">No.</th>
                    <th className="py-1.5 pr-2 font-bold uppercase tracking-wide">{str('Name', 'Erinnya')}</th>
                    <th className="py-1.5 pr-2 font-bold uppercase tracking-wide">{str('Class', 'Kikolo')}</th>
                    <th className="py-1.5 pr-2 font-bold uppercase tracking-wide text-right">{str('Shares', 'Emigabo')}</th>
                    <th className="py-1.5 pr-2 font-bold uppercase tracking-wide text-right">{str('Value', 'Ntandikwa')}</th>
                    <th className="py-1.5 pr-2 font-bold uppercase tracking-wide text-right">{str('Interest', 'Ssali')}</th>
                    <th className="py-1.5 pr-2 font-bold uppercase tracking-wide text-right">{str('Loan', 'Obanja')}</th>
                    <th className="py-1.5 font-bold uppercase tracking-wide text-right">{str('Equity', 'Netto')}</th>
                  </tr>
                </thead>
                <tbody>
                  {registerRows.map((r) => (
                    <tr key={r.no} className="border-t border-border-line">
                      <td className="py-1.5 pr-2 font-mono">{r.no}</td>
                      <td className="py-1.5 pr-2 font-semibold text-primary">{r.name}</td>
                      <td className="py-1.5 pr-2 text-text-muted">{r.category}</td>
                      <td className="py-1.5 pr-2 text-right font-mono">{r.shares}</td>
                      <td className="py-1.5 pr-2 text-right font-mono">{r.shareValue.toLocaleString()}</td>
                      <td className="py-1.5 pr-2 text-right font-mono">{r.interest > 0 ? r.interest.toLocaleString() : '—'}</td>
                      <td className="py-1.5 pr-2 text-right font-mono">{r.loan > 0 ? r.loan.toLocaleString() : '—'}</td>
                      <td className="py-1.5 text-right font-mono font-bold text-primary">{r.equity.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border-strong font-bold text-primary">
                    <td className="py-2 pr-2" colSpan={4}>{str('Total', 'Zonna')}</td>
                    <td className="py-2 pr-2 text-right font-mono">{registerTotals.shareValue.toLocaleString()}</td>
                    <td className="py-2 pr-2 text-right font-mono">{registerTotals.interest.toLocaleString()}</td>
                    <td className="py-2 pr-2 text-right font-mono">{registerTotals.loan.toLocaleString()}</td>
                    <td className="py-2 text-right font-mono">{registerTotals.equity.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="text-[10px] text-text-muted">
              {str('Equity = share value + savings interest − outstanding loan.', 'Netto = ntandikwa + ssali − bbanja obuliwo.')}
            </p>
          </section>

          {/* Statutory funds + the resolutions that created them */}
          {surplusPolicy && (
            <section className="bg-white rounded-xl border border-border-line p-4 space-y-3">
              <div>
                <h3 className="font-bold text-primary text-sm">{str('Statutory funds', 'Ssali z’omwale')}</h3>
                <p className="text-[11px] text-text-muted">
                  {str('Withheld from share-out and carried forward.', 'Ebikkaliwanga ku ssali, era bikuumuka buli kizibu.')}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {([
                  ['reserve', str('Reserve', 'Ekizimbeero')],
                  ['education', str('Education', 'Kusoma')],
                  ['operations', str('Operations', 'Abalimi')],
                ] as const).map(([key, label]) => (
                  <div key={key} className="rounded-lg border border-border-line p-2">
                    <span className="block text-[10px] font-bold text-text-muted uppercase">{label}</span>
                    <span className="block font-mono text-sm font-bold text-primary">
                      UGX {(state.saccoFunds?.[key] ?? 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] font-mono font-bold text-primary">
                {str('Total held', 'Zonna eziri mu ssali')}: UGX {fundsTotal.toLocaleString()}
              </p>
              <p className="text-[10px] text-text-muted">
                {str(
                  `Members are paid ${surplusPlan.bonusPct}% of the loan interest; ${surplusPolicy.reservePct}% reserve, ${surplusPolicy.educationPct}% education, ${surplusPolicy.operationsPct}% operations.`,
                  `Abakiise bagaba ${surplusPlan.bonusPct}% g’ebiggwelo; ${surplusPolicy.reservePct}% kizimbeero, ${surplusPolicy.educationPct}% kusoma, ${surplusPolicy.operationsPct}% abalimi.`
                )}
              </p>
            </section>
          )}

          {surplusResolutions.length > 0 && (
            <section className="bg-white rounded-xl border border-border-line p-4 space-y-2">
              <h3 className="font-bold text-primary text-sm">{str('Members’ resolutions', 'Ebijja by’abakiise')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-left text-text-muted">
                      <th className="py-1.5 pr-2 font-bold uppercase tracking-wide">{str('Cycle', 'Kizibu')}</th>
                      <th className="py-1.5 pr-2 font-bold uppercase tracking-wide">{str('Date', 'Olunaku')}</th>
                      <th className="py-1.5 pr-2 font-bold uppercase tracking-wide">{str('Minutes', 'Minansi')}</th>
                      <th className="py-1.5 pr-2 font-bold uppercase tracking-wide text-right">{str('Present', 'Babali')}</th>
                      <th className="py-1.5 pr-2 font-bold uppercase tracking-wide text-right">{str('Yes', 'Bayii')}</th>
                      <th className="py-1.5 font-bold uppercase tracking-wide text-right">{str('To members', 'Ku bakuli')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {surplusResolutions.map((r) => (
                      <tr key={r.id} className="border-t border-border-line">
                        <td className="py-1.5 pr-2 font-mono">#{r.cycle}</td>
                        <td className="py-1.5 pr-2 font-mono">{r.date}</td>
                        <td className="py-1.5 pr-2 text-text-muted">{r.minutesRef || '—'}</td>
                        <td className="py-1.5 pr-2 text-right font-mono">{r.attendees}</td>
                        <td className="py-1.5 pr-2 text-right font-mono font-bold text-primary">{r.approvers.length}</td>
                        <td className="py-1.5 text-right font-mono">
                          {100 - (r.policy.reservePct + r.policy.educationPct + r.policy.operationsPct)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-text-muted">
                {str('Each row is one meeting at which the members approved the split.', 'Bulirundi luguusa olukiiko olu{abakiise baakiriza okugawanya.')}
              </p>
            </section>
          )}
        </div>
      )}

      {chartTab === 'sheet' && (
      <div className="print-area space-y-3">
        <section className="bg-white rounded-xl border border-black p-4 text-black">
          <div className="text-center border-b-2 border-black pb-2 mb-2">
            <h3 className="font-bold text-sm">{sheet.groupName === 'Savings Group' ? displayGroupName : sheet.groupName} — {str('Collection Sheet', 'Olupapula lw’okukunganyiza')}</h3>
            <p className="text-[11px] font-mono">
              {str('Meeting', 'Olukuŋŋaana')} #{sheet.meetingNo} · {sheet.date} · {sheet.boxIdentifier === 'BOX' ? displayBoxIdentifier : sheet.boxIdentifier}
            </p>
            <p className="text-[10px]">
              {str('Share', 'Omugabo')} UGX {sheet.sharePrice.toLocaleString()} ({str('max 5', '5 nga ye ekikomo')}) · {str('Welfare', 'Obuyambi')} UGX {sheet.welfareDue.toLocaleString()} · {str('Print before meeting, fill by pen', 'Chapisha ng’olukuŋŋaana tona, oluzza ne kalamu')}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="border-b-2 border-black text-left">
                  <th className="py-1 pr-1">#</th>
                  <th className="py-1 pr-1">{str('Member', 'Omukiise')}</th>
                  <th className="py-1 pr-1 text-right">{str('Loan owed', 'Bbanja erisigadde')}</th>
                  <th className="py-1 pr-1 text-right">{str('Loan paid', 'Asasudde')}</th>
                  <th className="py-1 pr-1 text-center">{str('Shares', 'Emigabo')}</th>
                  <th className="py-1 pr-1 text-right">{str('Welfare', 'Obuyambi')}</th>
                  <th className="py-1 pr-1 text-right">{str('Fine', 'Engassi')}</th>
                  <th className="py-1 text-center">✓</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {sheet.rows.map((r) => (
                  <tr key={r.memberId} className="border-b border-black/30">
                    <td className="py-1.5 pr-1">{r.no}</td>
                    <td className="py-1.5 pr-1 font-sans font-semibold">{r.name}</td>
                    <td className="py-1.5 pr-1 text-right">{r.loanOwed > 0 ? r.loanOwed.toLocaleString() : '—'}</td>
                    <td className="py-1.5 pr-1 text-right text-black/30">______</td>
                    <td className="py-1.5 pr-1 text-center text-black/30">__ / 5</td>
                    <td className="py-1.5 pr-1 text-right">{r.finesPending > 0 ? <span title={str('pending fine', 'engassi erindirira')}>{r.finesPending.toLocaleString()}*</span> : '—'}</td>
                    <td className="py-1.5 pr-1 text-right text-black/30">______</td>
                    <td className="py-1.5 text-center"><span className="inline-block w-3.5 h-3.5 border border-black rounded-sm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] mt-1">* {str('pending fine from the book — confirm before collecting', 'Engassi erindirira mu kitabo — kakasa nga tonnakunganyiza')}</p>
          <div className="grid grid-cols-3 gap-2 mt-2 text-[11px] font-mono font-bold border-t-2 border-black pt-2">
            <span>{str('Loans owed', 'Amabanja agabiddwa')}: {sheet.totalLoansOwed.toLocaleString()}</span>
            <span>{str('Welfare exp.', 'Obuyambi bwalindiridde')}: {sheet.expectedWelfare.toLocaleString()}</span>
            <span>{str('Fines pend.', 'Engassi ezirindirira')}: {sheet.totalFinesPending.toLocaleString()}</span>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 text-[10px]">
            {[str('Secretary', 'Omuwandiisi wa ppaasibuku'), str('Keyholder 1', 'Omukwasi wa kisumuluzo 1'), str('Keyholder 2', 'Omukwasi wa kisumuluzo 2')].map((role) => (
              <div key={role} className="pt-6 border-b border-black text-center">{role} — {str('sign', 'kika omukono')}</div>
            ))}
          </div>
        </section>
      </div>
      )}

       <ConfirmDialog
         isOpen={!!fineTarget}
         title={fineTarget ? str(`Propose a fine for ${fineTarget.name}?`, `Ssa engassi ku ${fineTarget.name}?`) : str('Propose fine', 'Ssa engassi')}
         body={fineTarget ? str(`This creates a pending UGX ${LATE_FINE_AMOUNT.toLocaleString()} proposal. It does not collect money until an officer confirms it.`, `Kikole ekiragiro kya UGX ${LATE_FINE_AMOUNT.toLocaleString()} ekirindirira. Ssente tezigibulwa n’omuwanika nga tennakakasa.`) : ''}
         confirmLabel={str('Create proposal', 'Kolesa ekiragiro')}
         language={language}
         danger
         onConfirm={() => {
           if (fineTarget) onProposeFine(fineTarget);
           setFineTarget(null);
         }}
         onCancel={() => setFineTarget(null)}
       />
       <div className="flex gap-2 no-print">
        <button
          type="button"
          onClick={exportCsv}
          className="flex-1 min-h-[48px] bg-primary-container text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <span className="material-symbols-outlined text-[18px]">table_view</span>
          {str('Export CSV', 'Fulumya CSV')}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex-1 min-h-[48px] bg-surface-card border border-border-strong rounded-lg font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <span className="material-symbols-outlined text-[18px]">print</span>
          {chartTab === 'sheet' ? str('Print collection sheet', 'Chapisha olupapula') : str('Print Report', 'Chapisha lipoota')}
        </button>
      </div>
    </main>
  );
};

export { LATE_FINE_AMOUNT };
