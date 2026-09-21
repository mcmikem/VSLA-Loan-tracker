import React, { useState } from 'react';
import { FundTransfer, Language } from '../types';
import { FundLocation } from '../utils/fundLocations';

interface FundLocationsCardProps {
  cash: number;
  momo: number;
  bank: number;
  recentTransfers?: FundTransfer[];
  language?: Language;
  onTransfer?: (from: FundLocation, to: FundLocation, amount: number, note: string) => string | null;
}

/**
 * Where the group's money sits: box cash vs MoMo float vs bank.
 * Groups choose — the app only records and reconciles, never moves
 * real money itself. Every move is audited with actor + note.
 */
export const FundLocationsCard: React.FC<FundLocationsCardProps> = ({
  cash,
  momo,
  bank,
  recentTransfers = [],
  language = 'EN',
  onTransfer,
}) => {
  const [from, setFrom] = useState<FundLocation>('cash');
  const [to, setTo] = useState<FundLocation>('momo');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const str = (en: string, lu: string) => (language === 'LU' ? lu : en);
  const total = cash + momo + bank;

  const submit = () => {
    if (!onTransfer) return;
    const err = onTransfer(from, to, Math.floor(Number(amount) || 0), note);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setAmount('');
    setNote('');
    setShowForm(false);
  };

  const loc = (label: string, value: number, active: boolean) => (
    <div className={`rounded-lg p-2.5 border ${active ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10'}`}>
      <span className="text-[11px] text-[#c0c8c3] block">{label}</span>
      <span className="font-mono text-sm font-bold text-white">UGX {value.toLocaleString()}</span>
    </div>
  );

  return (
    <section aria-label="Fund locations" className="bg-primary-container text-white rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-primary-fixed">
          {str('Where money sits', 'Ssente we ziri')} · <span className="font-mono">UGX {total.toLocaleString()}</span>
        </h3>
        {onTransfer && (
          <button
            type="button"
            onClick={() => { setShowForm(!showForm); setError(null); }}
            className="px-2.5 py-1.5 bg-white/15 border border-white/30 rounded-lg text-[11px] font-bold active:scale-95"
          >
            {str('Move →', 'Kyusa →')}
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {loc(str('Cash in box', 'Nkalu'), cash, true)}
        {loc(str('MoMo float', 'MoMo'), momo, momo > 0)}
        {loc(str('Bank', 'Banka'), bank, bank > 0)}
      </div>
      {(momo > 0 || bank > 0) && (
        <p className="text-[11px] text-primary-fixed leading-relaxed">
          {str(
            'Only box cash is counted at meetings. MoMo and bank stay where they are.',
            'Ssente enkalu zokka ezibalibwa mu lukuŋŋaana. MoMo ne banka bisigala we biri.'
          )}
        </p>
      )}
      {showForm && onTransfer && (
        <div className="bg-black/20 rounded-lg p-3 space-y-2 border border-white/10">
          <div className="grid grid-cols-2 gap-2">
            {(['cash', 'momo', 'bank'] as FundLocation[]).map((l) => (
              <div key={l} className="space-y-1">
                <span className="text-[10px] uppercase text-[#c0c8c3] font-bold">{l === 'cash' ? str('From', 'Okuva') : str('To', 'Okudda')}</span>
                <div className="flex gap-1">
                  {(['cash', 'momo', 'bank'] as FundLocation[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => (l === 'cash' ? setFrom(opt) : setTo(opt))}
                      className={`flex-1 py-1.5 rounded text-[10px] font-bold capitalize ${
                        (l === 'cash' ? from : to) === opt ? 'bg-[#EAB308] text-[#00261b]' : 'bg-white/10 text-white/70'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="UGX" className="flex-1 min-h-[44px] rounded-lg px-3 text-sm font-mono text-black" />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={str('Note (e.g. fees trip)', 'Ensonga')} className="flex-[2] min-h-[44px] rounded-lg px-3 text-sm text-black" />
          </div>
          {error && <p className="text-[11px] font-bold text-amber-200">{error}</p>}
          <button type="button" onClick={submit} className="w-full min-h-[44px] bg-[#EAB308] text-[#00261b] rounded-lg font-bold text-xs active:scale-[0.99]">
            {str('Record the move (audited)', 'Wandiika (kikoseddwa)')}
          </button>
        </div>
      )}
      {recentTransfers.length > 0 && (
        <div className="space-y-1">
          {recentTransfers.slice(0, 3).map((t) => (
            <p key={t.id} className="text-[11px] font-mono text-white/75">
              UGX {t.amount.toLocaleString()} {t.from} → {t.to} · {t.actorName} · {t.note}
            </p>
          ))}
        </div>
      )}
    </section>
  );
};
