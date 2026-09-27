import React, { useState } from 'react';
import type { Language } from '../types';

interface InfoTipProps {
  label: string;
  children: React.ReactNode;
  language?: Language;
}

export const InfoTip: React.FC<InfoTipProps> = ({ label, children, language = 'EN' }) => {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="w-6 h-6 rounded-full border border-border-strong text-text-muted bg-white text-xs font-bold flex items-center justify-center"
      >
        i
      </button>
      {open && (
        <span role="dialog" aria-label={label} className="absolute left-1/2 top-8 z-50 w-64 -translate-x-1/2 rounded-xl border border-border-line bg-surface-card p-3 text-xs text-on-surface shadow-xl">
          <span className="block leading-relaxed">{children}</span>
          <button type="button" onClick={() => setOpen(false)} className="mt-2 text-primary font-bold underline">{language === 'LU' ? 'Ggalawo' : 'Close'}</button>
        </span>
      )}
    </span>
  );
};
