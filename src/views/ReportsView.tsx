import React from 'react';
import { Language, Member, ScreenId, VSLAState } from '../types';

interface ReportsViewProps {
  state: VSLAState;
  onNavigate: (screen: ScreenId) => void;
  onProposeFine: (member: Member) => void;
  language?: Language;
}

const LATE_FINE_AMOUNT = 2000;

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
  const repaymentRate =
    totalSavings + totalLoansOut > 0
      ? Math.round((totalSavings / (totalSavings + totalLoansOut)) * 100)
      : 100;

  const str = (en: string, lu: string, sw: string) =>
    language === 'LU' ? lu : language === 'SW' ? sw : en;

  const exportCsv = () => {
    const rows = [
      ['Group', state.groupName, state.boxIdentifier],
      ['Exported', new Date().toISOString()],
      [],
      ['No', 'Name', 'Phone', 'Shares', 'Savings (UGX)', 'Loan Balance (UGX)', 'Welfare (UGX)', 'Attendance'],
      ...members.map((m) => [
        m.no, m.name, m.phone, String(m.sharesCount),
        String(m.sharesTotal), String(m.loanBalance), String(m.welfareBalance), m.attendance,
      ]),
      [],
      ['Total savings', String(totalSavings)],
      ['Loans outstanding', String(totalLoansOut)],
      ['Welfare held', String(totalWelfare)],
      ['Fines collected', String(finesCollected)],
      ['Fines pending', String(finesPending)],
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `vsla_report_${new Date().toISOString().split('T')[0]}.csv`;
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
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <div>
            <h1 className="font-bold text-primary">
              {str('Financial Reports', 'Lipoota z\'Ensimbi', 'Ripoti za Fedha')}
            </h1>
            <p className="text-xs text-text-muted">{state.groupName}</p>
          </div>
        </div>
        <span className="font-mono text-xs font-bold text-primary bg-surface-container px-2 py-1 rounded">
          {repaymentRate}% {str('healthy', 'bulungi', 'nzuri')}
        </span>
      </div>

      <div className="print-area space-y-4">
        <section className="bg-surface-card rounded-xl border border-border-line p-4 shadow-sm">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
            {str('Fund Performance', 'Embeera y\'Ensimbi', 'Hali ya Fedha')}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {metric(str('Member savings', 'Enterekanya', 'Akiba'), `UGX ${totalSavings.toLocaleString()}`, `${members.length} ${str('members', 'bakiise', 'wanachama')}`)}
            {metric(str('Loans outstanding', 'Amabanja', 'Mikopo nje'), `UGX ${totalLoansOut.toLocaleString()}`, `${debtors.length} ${str('borrowers', 'beewola', 'wakopaji')}`)}
            {metric(str('Welfare held', 'Obuyambi', 'Jamii'), `UGX ${totalWelfare.toLocaleString()}`, str('emergency buffer', 'olwobuzibu', 'dharura'))}
            {metric(str('Fines in/out', 'Engassi', 'Faini'), `UGX ${finesCollected.toLocaleString()}`, `${str('pending', 'ziri mu kkubo', 'zinasubiri')} UGX ${finesPending.toLocaleString()}`)}
          </div>
          {/* Repayment health bar */}
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-text-muted mb-1">
              <span>{str('Portfolio health (savings vs loans out)', 'Obulamu bw\'ensimbi', 'Afya ya mtaji')}</span>
              <span className="font-mono font-bold text-primary">{repaymentRate}%</span>
            </div>
            <div className="w-full bg-border-line rounded-full h-2.5 overflow-hidden">
              <div className="bg-secondary h-2.5 rounded-full" style={{ width: `${repaymentRate}%` }} />
            </div>
          </div>
        </section>

        {/* Arrears watch */}
        <section className="bg-surface-card rounded-xl border border-border-line p-4 shadow-sm space-y-2">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
            {str('Arrears Watch', 'Abeerina Amabanja', 'Wanaodaiwa')} ({debtors.length})
          </h3>
          {debtors.length === 0 ? (
            <p className="text-xs text-status-ok-tx bg-status-ok-bg rounded-lg p-3 font-semibold">
              {str('No outstanding loans. All clean!', 'Tewali bbanja! Byonna birungi!', 'Hakuna deni! Yote safi!')}
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
                      {str('Owes', 'Abbanja', 'Anadaiwa')} UGX {m.loanBalance.toLocaleString()}
                      {risk && (
                        <span className="ml-1.5 px-1.5 py-0.2 rounded bg-status-bad-bg text-status-bad-tx text-[10px] font-bold">
                          {str('HIGH RISK', 'AKABI', 'HATARI')}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onProposeFine(m)}
                    className="no-print shrink-0 px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-[11px] font-bold active:scale-95"
                  >
                    + {str('Fine', 'Engassi', 'Faini')} 2k
                  </button>
                </div>
              );
            })
          )}
        </section>

        {/* Collections table */}
        <section className="bg-surface-card rounded-xl border border-border-line p-4 shadow-sm">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
            {str('Collections by Member', 'Okukunganyiza', 'Makusanyo')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left text-text-muted border-b border-border-line">
                  <th className="py-1.5 pr-2">#</th>
                  <th className="py-1.5 pr-2">{str('Member', 'Omukiise', 'Mwanachama')}</th>
                  <th className="py-1.5 pr-2 text-right">{str('Saved', 'Enterekanya', 'Akiba')}</th>
                  <th className="py-1.5 text-right">{str('Loan', 'Bbanja', 'Deni')}</th>
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

      <div className="flex gap-2 no-print">
        <button
          type="button"
          onClick={exportCsv}
          className="flex-1 min-h-[48px] bg-primary-container text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <span className="material-symbols-outlined text-[18px]">table_view</span>
          {str('Export CSV', 'Fulumya CSV', 'Pakua CSV')}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex-1 min-h-[48px] bg-surface-card border border-border-strong rounded-lg font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <span className="material-symbols-outlined text-[18px]">print</span>
          {str('Print Report', 'Kuba Lipoota', 'Chapisha')}
        </button>
      </div>
    </main>
  );
};

export { LATE_FINE_AMOUNT };
