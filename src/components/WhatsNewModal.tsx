import React from 'react';
import { APP_VERSION, CHANGELOG } from '../data/changelog';

interface WhatsNewModalProps {
  onClose: () => void;
}

/** Upgrade #20 — "What's new" sheet shown once per app version. */
export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ onClose }) => {
  const latest = CHANGELOG[0];
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-[28px]">celebration</span>
          <div>
            <h2 className="font-bold text-primary">What's new in v{APP_VERSION}</h2>
            <p className="text-[11px] text-text-muted">{latest.date} · Ebipya mu app</p>
          </div>
        </div>
        <ul className="space-y-1.5 text-xs text-on-surface">
          {latest.highlights.map((h) => (
            <li key={h} className="flex items-start gap-2">
              <span className="material-symbols-outlined text-secondary text-[16px] mt-0.5">check_circle</span>
              <span>{h}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[48px] bg-[#00261b] text-white rounded-lg font-bold text-sm active:scale-[0.99]"
        >
          Start using
        </button>
      </div>
    </div>
  );
};
