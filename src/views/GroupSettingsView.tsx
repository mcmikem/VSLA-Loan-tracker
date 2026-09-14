import React, { useState } from 'react';
import { ScreenId } from '../types';

export interface GroupSettingsPatch {
  groupName: string;
  boxIdentifier: string;
  location: string;
  meetingDay: string;
  sharePrice: number;
  welfareMonthly: number;
  totalCycleMonths: number;
}

interface GroupSettingsViewProps {
  groupName: string;
  boxIdentifier: string;
  location: string;
  meetingDay: string;
  sharePrice: number;
  welfareMonthly: number;
  totalCycleMonths: number;
  inviteCode: string;
  membersCount: number;
  onSave: (patch: GroupSettingsPatch) => void;
  onNavigate: (screen: ScreenId) => void;
}

/** Group settings screen: editable constitution-adjacent constants + share/welfare amounts. */
export const GroupSettingsView: React.FC<GroupSettingsViewProps> = ({
  groupName,
  boxIdentifier,
  location,
  meetingDay,
  sharePrice,
  welfareMonthly,
  totalCycleMonths,
  inviteCode,
  membersCount,
  onSave,
  onNavigate,
}) => {
  const [form, setForm] = useState<GroupSettingsPatch>({
    groupName,
    boxIdentifier,
    location,
    meetingDay,
    sharePrice,
    welfareMonthly,
    totalCycleMonths,
  });
  const [saved, setSaved] = useState(false);
  const set = (k: keyof GroupSettingsPatch, v: string | number) => {
    setForm({ ...form, [k]: v });
    setSaved(false);
  };
  const inputCls = 'w-full min-h-[44px] border border-border-strong rounded-lg px-3 text-sm bg-white text-primary';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.groupName.trim()) return;
    onSave({
      ...form,
      groupName: form.groupName.trim(),
      boxIdentifier: form.boxIdentifier.trim() || boxIdentifier,
      location: form.location.trim(),
      meetingDay: form.meetingDay.trim(),
      sharePrice: Math.max(1000, Math.floor(Number(form.sharePrice) || 0)),
      welfareMonthly: Math.max(0, Math.floor(Number(form.welfareMonthly) || 0)),
      totalCycleMonths: Math.min(24, Math.max(1, Math.floor(Number(form.totalCycleMonths) || 10))),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-12 flex-1 space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate('home')}
          className="w-9 h-9 rounded-lg bg-surface-card border border-border-strong flex items-center justify-center text-primary"
          type="button"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
        </button>
        <div>
          <h1 className="font-bold text-primary">Group Settings</h1>
          <p className="text-xs text-text-muted">
            {membersCount} members · Invite <span className="font-mono font-bold text-secondary">{inviteCode}</span>
          </p>
        </div>
      </div>

      {saved && (
        <p className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
          Settings saved to this group’s ledger.
        </p>
      )}

      <form onSubmit={submit} className="bg-surface-card border border-border-line rounded-xl p-4 space-y-3">
        <div>
          <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">Group name</label>
          <input value={form.groupName} onChange={(e) => set('groupName', e.target.value)} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">Box ID</label>
            <input value={form.boxIdentifier} onChange={(e) => set('boxIdentifier', e.target.value)} className={`${inputCls} font-mono`} />
          </div>
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">Cycle (months)</label>
            <input type="number" min={1} max={24} value={form.totalCycleMonths} onChange={(e) => set('totalCycleMonths', Number(e.target.value))} className={`${inputCls} font-mono`} />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">Location</label>
          <input value={form.location} onChange={(e) => set('location', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">Meeting day</label>
          <input value={form.meetingDay} onChange={(e) => set('meetingDay', e.target.value)} placeholder="Every Friday 4:00 PM" className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">Share price (UGX)</label>
            <input type="number" min={1000} step={500} value={form.sharePrice} onChange={(e) => set('sharePrice', Number(e.target.value))} className={`${inputCls} font-mono`} />
          </div>
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">Welfare / month (UGX)</label>
            <input type="number" min={0} step={500} value={form.welfareMonthly} onChange={(e) => set('welfareMonthly', Number(e.target.value))} className={`${inputCls} font-mono`} />
          </div>
        </div>
        <button type="submit" className="w-full min-h-[48px] bg-primary text-white rounded-lg font-bold text-sm active:scale-[0.99]">
          Save settings
        </button>
      </form>

      <p className="text-[11px] text-text-muted">
        Share price applies to new share purchases and the wizard. Existing member savings are not recalculated.
      </p>
    </main>
  );
};
