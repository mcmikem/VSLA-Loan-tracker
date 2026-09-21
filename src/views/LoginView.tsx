import React, { useState } from 'react';
import { Language, ScreenId, UserAccount } from '../types';
import { setSessionToken } from '../utils/api';
import { GroupLogo } from '../components/GroupLogo';

interface LoginViewProps {
  accounts: UserAccount[];
  groupName: string;
  boxIdentifier: string;
  groupId: string;
  initialAccountId?: string;
  onLogin: (account: UserAccount) => void;
  onNavigate?: (screen: ScreenId) => void;
  logoUrl?: string;
  language?: Language;
}

/** PIN gate shown when the server enforces auth (SESSION_SECRET set). */
export const LoginView: React.FC<LoginViewProps> = ({
  accounts,
  groupName,
  boxIdentifier,
  groupId,
  initialAccountId,
  onLogin,
  logoUrl,
  language = 'EN',
}) => {
  const [selectedId, setSelectedId] = useState(initialAccountId || accounts[0]?.id || '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = accounts.find((a) => a.id === selectedId) || accounts[0];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || busy) return;
    if (!/^\d{4,8}$/.test(pin)) {
      setError('Enter your 4-digit PIN.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selected.id, pin, groupId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Wrong account or PIN.');
        setBusy(false);
        return;
      }
      setSessionToken(data.token);
      onLogin(selected);
    } catch {
      setError('No connection to the server. Check network and retry.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="w-full max-w-sm mx-auto px-4 pt-10 pb-12 flex-1">
      <div className="text-center space-y-1 mb-6">
        <div className="flex justify-center">
          <GroupLogo logoUrl={logoUrl} alt={groupName} className="w-14 h-14 rounded-2xl shadow" />
        </div>
        <h1 className="font-bold text-primary text-lg">{groupName}</h1>
        <p className="text-xs text-text-muted font-mono">{boxIdentifier} · sign in with your PIN</p>
      </div>

      <form onSubmit={submit} className="bg-surface-card border border-border-line rounded-2xl p-4 space-y-3 shadow-sm">
        <div>
          <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">Who is signing in?</label>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {accounts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => { setSelectedId(a.id); setError(null); }}
                className={`w-full text-left p-2.5 rounded-xl border flex items-center gap-2.5 transition ${a.id === selectedId ? 'bg-emerald-50 border-emerald-400' : 'bg-canvas-bg border-border-line'}`}
              >
                <div className={`w-9 h-9 rounded-full ${a.avatarBg || 'bg-emerald-700'} text-white flex items-center justify-center font-bold text-xs shrink-0`}>
                  {a.avatarInitials}
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-primary text-sm block truncate">{a.name}</span>
                  <span className="text-[11px] text-text-muted block truncate">{a.roleTitle}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">
            PIN for {selected?.name || 'account'}
          </label>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
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

        <button
          type="submit"
          disabled={busy || !selected}
          className="w-full min-h-[52px] bg-[#0b3d2e] text-white rounded-xl font-bold text-sm active:scale-[0.99] disabled:opacity-60"
        >
          {busy ? 'Checking PIN…' : 'Sign in'}
        </button>

        <p className="text-[11px] text-text-muted text-center">
          New member? Your secretary registers you — default PIN <span className="font-mono font-bold">1234</span>, change it after first sign-in.
        </p>
        <p className="text-[11px] text-text-muted text-center border-t border-border-line pt-2">
          {language === 'LU'
            ? 'Towa muntu yenna PIN yo. Bika PIN, koodi, ne ebikwata ku members mu bukuumi.'
            : 'Never give anyone your PIN. Keep your PIN, codes and member details safe.'}
        </p>
      </form>
    </main>
  );
};
