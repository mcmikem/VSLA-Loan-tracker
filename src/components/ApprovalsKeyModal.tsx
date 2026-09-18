import React, { useState } from 'react';
import { UserAccount } from '../types';

interface ApprovalsKeyModalProps {
  isOpen: boolean;
  /** e.g. 'Key 1/2' or 'Key 2/2 — releases cash' */
  keyLabel: string;
  memberLine: string;
  amountText: string;
  officers: UserAccount[];
  /** Officer who already turned key 1 — cannot turn key 2. */
  excludeName?: string;
  onCancel: () => void;
  /** Returns an error message, or null when the key turned. */
  onConfirm: (officerId: string, pin: string) => string | null;
}

/**
 * Key-turn ceremony: hand the phone to the officer, THEY pick their name
 * and enter THEIR PIN. Replaces silent account-switching so the second
 * human is provably present. PINs are checked against stored account PINs
 * (plaintext in open-dev pilots); hashed secure PINs must use Users → Switch.
 */
export const ApprovalsKeyModal: React.FC<ApprovalsKeyModalProps> = ({
  isOpen,
  keyLabel,
  memberLine,
  amountText,
  officers,
  excludeName,
  onCancel,
  onConfirm,
}) => {
  const eligible = officers.filter((o) => o.permissions?.canApproveLoans);
  const list = eligible.length > 0 ? eligible : officers;
  const [officerId, setOfficerId] = useState(
    () => list.find((o) => o.name !== excludeName && o.pin !== '1234')?.id || list[0]?.id || ''
  );
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerId) {
      setError('Pick the officer holding the phone.');
      return;
    }
    if (!/^\d{4,8}$/.test(pin)) {
      setError('Enter that officer’s 4–8 digit PIN.');
      return;
    }
    const err = onConfirm(officerId, pin);
    if (err) {
      setError(err);
      setPin('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/70 flex items-end sm:items-center justify-center p-4"
      onClick={onCancel}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 space-y-3"
      >
        <div className="text-center">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300">
            <span className="material-symbols-outlined text-[16px]">key</span>
            {keyLabel}
          </span>
          <p className="font-bold text-primary mt-2">{memberLine}</p>
          <p className="font-mono font-bold text-primary">{amountText}</p>
          <p className="text-[11px] text-text-muted mt-1">
            Hand the phone to the officer. They pick their name and enter their own PIN.
          </p>
        </div>

        <div className="space-y-1.5 max-h-44 overflow-y-auto">
          {list.map((o) => {
            const excluded = excludeName && o.name.trim().toLowerCase() === excludeName.trim().toLowerCase();
            const defaultPin = o.pin === '1234';
            const disabled = !!excluded;
            return (
              <button
                key={o.id}
                type="button"
                disabled={disabled}
                onClick={() => { setOfficerId(o.id); setError(null); }}
                className={`w-full text-left p-2.5 rounded-xl border flex items-center gap-2.5 transition ${
                  disabled
                    ? 'bg-canvas-bg border-border-line opacity-50'
                    : o.id === officerId
                    ? 'bg-emerald-50 border-emerald-400'
                    : 'bg-canvas-bg border-border-line'
                }`}
              >
                <div className={`w-9 h-9 rounded-full ${o.avatarBg || 'bg-emerald-700'} text-white flex items-center justify-center font-bold text-xs shrink-0`}>
                  {o.avatarInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-primary text-sm block truncate">{o.name}</span>
                  <span className="text-[11px] text-text-muted block truncate">
                    {excluded
                      ? 'Already turned key 1 — needs someone else'
                      : defaultPin
                      ? `${o.roleTitle} · change PIN 1234 first`
                      : o.roleTitle}
                  </span>
                </div>
                {o.id === officerId && !disabled && (
                  <span className="material-symbols-outlined text-secondary">check_circle</span>
                )}
              </button>
            );
          })}
        </div>

        <div>
          <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">
            Officer PIN
          </label>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            className="w-full min-h-[52px] border-2 border-border-strong rounded-xl px-4 text-center text-2xl font-mono tracking-[0.5em] text-primary"
          />
        </div>

        {error && (
          <p className="text-xs font-bold text-red-800 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 bg-surface-container border border-border-strong text-primary text-sm font-bold rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-[2] py-3 bg-[#15803D] text-white text-sm font-bold rounded-xl shadow"
          >
            Confirm — turn {keyLabel.split('—')[0].trim()}
          </button>
        </div>
      </form>
    </div>
  );
};
