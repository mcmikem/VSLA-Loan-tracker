import React from 'react';
import type { Language } from '../types';
import { LANGUAGE_OPTIONS } from '../i18n/translations';

interface LanguagePickerProps {
  onPick: (lang: Language) => void;
}

/**
 * First-run language choice. Two giant buttons, no reading required
 * beyond the language names themselves. Shows once; choice persists.
 */
export const LanguagePicker: React.FC<LanguagePickerProps> = ({ onPick }) => {
  return (
    <div className="fixed inset-0 z-[80] bg-[#00261b] flex items-center justify-center p-6">
      <div className="w-full max-w-xs text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center mx-auto border border-white/20">
          <span className="material-symbols-outlined text-3xl">translate</span>
        </div>
        <h1 className="text-white font-bold text-xl">Choose language / Londa olulimi</h1>
        <div className="space-y-3">
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              type="button"
              onClick={() => onPick(opt.code)}
              className="w-full min-h-[72px] bg-white text-[#00261b] rounded-2xl font-bold text-xl flex items-center justify-center gap-3 active:scale-[0.98] shadow-lg"
            >
              <span className="text-3xl">{opt.flag}</span>
              <span>{opt.nativeLabel}</span>
            </button>
          ))}
        </div>
        <p className="text-white/60 text-xs">You can change this anytime from the top bar / Osobola okukyusa ekiro kyonna</p>
      </div>
    </div>
  );
};
