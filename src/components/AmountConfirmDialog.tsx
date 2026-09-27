import React, { useState } from 'react';
import { Language } from '../types';

interface AmountConfirmDialogProps {
  isOpen: boolean;
  /** The amount that is about to leave the box. */
  amount: number;
  /** Who gets it, e.g. "Sarah needs UGX 50,000 for the hospital." */
  headline: string;
  confirmLabel?: string;
  language?: Language;
  onCancel: () => void;
  onConfirmed: () => void;
}

/**
 * M-Sente style guard on money leaving the group: the officer types the
 * amount a second time before it is committed. Documented Uganda safeguard
 * (M-Sente / AirTel) against "sent it to the wrong number" style mistakes.
 * The amount is shown big, because recognition beats recall.
 */
export const AmountConfirmDialog: React.FC<AmountConfirmDialogProps> = ({
  isOpen,
  amount,
  headline,
  confirmLabel,
  language = 'EN',
  onCancel,
  onConfirmed,
}) => {
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const lu = language === 'LU';

  if (!isOpen) return null;

  const expected = Math.max(0, Math.floor(amount || 0));
  const ok = typed.replace(/[^\d]/g, '') === String(expected);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ok) {
      setError(
        lu
          ? 'Ebaasa tebali kanKatannyama. Zikozese buli.'
          : 'Those numbers do not match. Check both and try again.'
      );
      setTyped('');
      return;
    }
    setTyped('');
    setError(null);
    onConfirmed();
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/70 p-6" onClick={onCancel}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 space-y-3"
      >
        <div className="text-center space-y-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300">
            <span className="material-symbols-outlined text-[16px]">fact_check</span>
            {lu ? 'Kakasa amount' : 'Check the amount'}
          </span>
          <p className="text-sm font-bold text-[#00261b]">{headline}</p>
          <p className="text-[11px] text-[#4B5563]">
            {lu
              ? 'Andiika enda kikono awe, olunaku olwo. Oliiba bw\'alaba n\'alaba.'
              : 'Type the amount again with your own hands, so nobody pays the wrong number.'}
          </p>
        </div>

        <div className="text-center py-2 rounded-xl bg-[#EAF7EE] border border-[#bceed7]">
          <span className="block text-[11px] font-bold text-[#006d30] uppercase">{lu ? 'Amount' : 'Amount'}</span>
          <span className="block font-mono text-3xl font-bold text-[#00261b]">
            <span className="text-base align-top mr-1">UGX</span>
            {expected.toLocaleString('en-US')}
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#00261b] mb-1" htmlFor="amount-recheck">
            {lu ? 'Andiika amount n\'era kikono' : 'Type the amount again'}
          </label>
          <input
            id="amount-recheck"
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value.replace(/[^\d]/g, '').slice(0, 12));
              setError(null);
            }}
            inputMode="numeric"
            autoComplete="off"
            placeholder={String(expected)}
            className={`w-full min-h-[56px] rounded-lg px-3 font-mono text-xl text-center border-2 bg-white ${
              error ? 'border-status-bad-tx' : 'border-[#00261b]'
            }`}
          />
          {error && (
            <p className="mt-1.5 text-xs font-bold text-status-bad-tx flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {error}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <button
            type="submit"
            className="w-full min-h-[56px] rounded-xl bg-[#00261b] text-white font-bold text-sm active:scale-[0.99]"
          >
            {confirmLabel || (lu ? 'Kikasa, siikate' : 'Yes, that is the amount')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full min-h-[48px] rounded-lg bg-surface-container text-primary font-bold text-sm active:scale-[0.99]"
          >
            {lu ? 'Nedda, ddayo' : 'No, go back'}
          </button>
        </div>
      </form>
    </div>
  );
};
