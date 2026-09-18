import React, { useState } from 'react';

interface DenomCounterProps {
  onTotal: (total: number) => void;
  language?: string;
}

const NOTES = [50000, 20000, 10000, 5000, 2000, 1000];
const COINS = [500, 200, 100, 50];

/**
 * Count physical cash by notes and coins instead of free-typing millions.
 * One row per denomination; the total fills the counted-cash field.
 */
export const DenomCounter: React.FC<DenomCounterProps> = ({ onTotal, language = 'EN' }) => {
  const [counts, setCounts] = useState<Record<number, number>>({});
  const lu = language === 'LU';
  const total = [...NOTES, ...COINS].reduce((s, d) => s + (counts[d] || 0) * d, 0);

  const bump = (denom: number, delta: number) =>
    setCounts((c) => ({ ...c, [denom]: Math.max(0, (c[denom] || 0) + delta) }));

  const row = (denom: number, label: string) => (
    <div key={denom} className="flex items-center justify-between gap-2 py-1">
      <span className="font-mono text-xs font-bold text-[#00261b] w-20">{label}</span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => bump(denom, -1)}
          className="w-9 h-9 rounded-lg bg-[#F6F7F6] border border-[#E5E7EB] font-bold text-[#00261b] active:scale-95"
          aria-label={`fewer ${label}`}
        >
          −
        </button>
        <input
          type="number"
          value={counts[denom] || 0}
          min={0}
          onChange={(e) => setCounts((c) => ({ ...c, [denom]: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))}
          className="w-14 text-center font-mono font-bold text-sm bg-white border border-[#E5E7EB] rounded-lg py-1.5"
          aria-label={`${label} count`}
        />
        <button
          type="button"
          onClick={() => bump(denom, 1)}
          className="w-9 h-9 rounded-lg bg-[#00261b] text-white font-bold active:scale-95"
          aria-label={`more ${label}`}
        >
          +
        </button>
      </div>
      <span className="font-mono text-[11px] text-[#4B5563] w-20 text-right">
        {((counts[denom] || 0) * denom).toLocaleString()}
      </span>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-1">
      <h4 className="text-xs font-bold text-[#00261b] uppercase tracking-wider">
        {lu ? 'Bala empapula n\'ebicence' : 'Count notes & coins'}
      </h4>
      {NOTES.map((d) => row(d, d >= 1000 ? `${d / 1000}k` : `${d}`))}
      <div className="pt-1 mt-1 border-t border-dashed border-[#E5E7EB]">
        <p className="text-[10px] font-bold text-[#4B5563] uppercase py-1">{lu ? 'Ebicence' : 'Coins'}</p>
        {COINS.map((d) => row(d, `${d}`))}
      </div>
      <div className="flex items-center justify-between gap-2 pt-2">
        <span className="font-mono text-lg font-bold text-[#00261b]">
          UGX {total.toLocaleString()}
        </span>
        <button
          type="button"
          onClick={() => onTotal(total)}
          disabled={total <= 0}
          className="px-4 min-h-[44px] rounded-lg bg-[#006d30] text-white text-xs font-bold active:scale-[0.99] disabled:opacity-40"
        >
          {lu ? 'Kozesa omugatte guno' : 'Use this total'}
        </button>
      </div>
    </div>
  );
};
