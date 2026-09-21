import React, { useState } from 'react';
import { Language } from '../types';
import { changePinRequest } from '../utils/api';

interface DefaultPinGateProps {
  userName: string;
  groupId: string;
  accountId: string;
  language?: Language;
  /** Apply the new PIN locally after the server confirms (or offline fallback). */
  onChanged: (newPin: string) => void;
}

/**
 * Sell-ready gate: default PIN 1234 may never enter a production group.
 * Shown only when auth/storage is production-grade (see App pinGateEnforced).
 * Server refuses 1234, so the account ends up with a real scrypt-hashed PIN.
 */
export const DefaultPinGate: React.FC<DefaultPinGateProps> = ({
  userName,
  groupId,
  accountId,
  language = 'EN',
  onChanged,
}) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lu = language === 'LU';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!/^\d{4}$/.test(next)) {
      setError(lu ? 'PIN empya: namba 4.' : 'New PIN must be exactly 4 digits.');
      return;
    }
    if (next !== confirm) {
      setError(lu ? 'PIN ezikwatagana nedda.' : 'New PIN and confirmation do not match.');
      return;
    }
    if (next === '1234' || next === current) {
      setError(lu ? 'Londa PIN endala — si 1234.' : 'Pick a different PIN — not 1234.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await changePinRequest({ groupId, accountId, oldPin: current, newPin: next });
    setBusy(false);
    if (!res.ok) {
      setError(res.error || (lu ? 'Waliwo ekikyamu. Gezaako nate.' : 'Something went wrong. Try again.'));
      return;
    }
    onChanged(next);
  };

  const inputCls =
    'w-full min-h-[52px] border-2 border-border-strong rounded-xl px-4 text-center text-2xl font-mono tracking-[0.5em] text-primary bg-white';

  return (
    <div className="min-h-screen bg-canvas-bg flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-surface-card border-2 border-[#EAB308] rounded-2xl p-5 space-y-3 shadow-xl">
        <div className="text-center">
          <span className="material-symbols-outlined text-[40px] text-[#854D0E]">lock_reset</span>
          <h1 className="font-bold text-primary text-lg mt-1">
            {lu ? 'Kyuusa PIN esooke' : 'Change your PIN to continue'}
          </h1>
          <p className="text-xs text-text-muted mt-1">
            {lu
              ? `${userName} — PIN 1234 tekikkirizibwa. Londa PIN yo ekyama (namba 4).`
              : `${userName} — default PIN 1234 is not allowed here. Pick a private 4-digit PIN.`}
          </p>
        </div>
        <div>
          <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">
            {lu ? 'PIN yo kati' : 'Current PIN'}
          </label>
          <input type="password" inputMode="numeric" maxLength={8} value={current} onChange={(e) => setCurrent(e.target.value.replace(/\D/g, ''))} placeholder="••••" className={inputCls} />
        </div>
        <div>
          <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">
            {lu ? 'PIN empya' : 'New PIN'}
          </label>
          <input type="password" inputMode="numeric" maxLength={4} value={next} onChange={(e) => setNext(e.target.value.replace(/\D/g, ''))} placeholder="••••" className={inputCls} />
        </div>
        <div>
          <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">
            {lu ? 'Kakasa PIN empya' : 'Confirm new PIN'}
          </label>
          <input type="password" inputMode="numeric" maxLength={4} value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ''))} placeholder="••••" className={inputCls} />
        </div>
        {error && <p className="text-xs font-bold text-red-800 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</p>}
        <button type="submit" disabled={busy} className="w-full min-h-[52px] bg-[#0b3d2e] text-white rounded-xl font-bold text-sm active:scale-[0.99] disabled:opacity-60">
          {busy ? '…' : lu ? 'Kyuusa PIN' : 'Change PIN'}
        </button>
      </form>
    </div>
  );
};
