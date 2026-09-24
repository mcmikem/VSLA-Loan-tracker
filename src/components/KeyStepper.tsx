import React from 'react';
import { Language } from '../types';

interface KeyStepperProps {
  firstBy?: string;
  decided?: boolean;
  language?: Language;
  compact?: boolean;
}

/**
 * The two-key rule, drawn instead of described: two keyholes that fill as
 * distinct officers turn their keys. Numbers and names carry the meaning so
 * low-literacy users get it without reading paragraphs.
 */
export const KeyStepper: React.FC<KeyStepperProps> = ({
  firstBy,
  decided = false,
  language = 'EN',
  compact = false,
}) => {
  const lu = language === 'LU';
  const keyOn = 'bg-[#006d30] border-[#006d30] text-white';
  const keyOff = 'bg-white border-[#CBD5E1] text-[#94A3B8]';
  const size = compact ? 'w-6 h-6' : 'w-10 h-10';
  const icon = compact ? 'text-[14px]' : 'text-[20px]';

  const caption = decided
    ? lu
      ? 'Kifulumidwa — ebisumuluzo 2/2'
      : 'Released — keys 2/2'
    : firstBy
      ? lu
        ? `1/2 — ${firstBy}; linda omukulu omulala`
        : `1/2 — ${firstBy}; waiting for a different officer`
      : lu
        ? 'Tewali kisumuluzo — beetaaga babiri'
        : 'No keys yet — two officers needed';

  return (
    <div className={`flex items-center gap-2 ${compact ? '' : 'bg-canvas-bg border border-border-line rounded-xl p-3'}`}>
      <span className={`${size} rounded-full border-2 flex items-center justify-center shrink-0 ${firstBy || decided ? keyOn : keyOff}`}>
        <span className={`material-symbols-outlined ${icon}`}>key</span>
      </span>
      <span className={`flex-1 h-0.5 rounded ${decided ? 'bg-[#006d30]' : 'bg-[#CBD5E1]'}`} aria-hidden="true" />
      <span className={`${size} rounded-full border-2 flex items-center justify-center shrink-0 ${decided ? keyOn : keyOff}`}>
        <span className={`material-symbols-outlined ${icon}`}>key</span>
      </span>
      <span className={`${compact ? 'text-[11px]' : 'text-xs'} font-bold ${decided ? 'text-[#166534]' : firstBy ? 'text-[#92400E]' : 'text-text-muted'} flex-[2]`}>
        {caption}
      </span>
    </div>
  );
};
