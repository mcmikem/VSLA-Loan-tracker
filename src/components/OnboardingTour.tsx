import React, { useState } from 'react';
import { Language } from '../types';

interface OnboardingTourProps {
  language?: Language;
  onDone: () => void;
}

const STEPS = [
  {
    icon: 'account_balance',
    en: 'Your group vault lives here — box cash, loan fund and welfare at a glance.',
    lu: 'Ssente z\'ekibiina zirabikira wano — ssente enkalu, ebyewolo n\'obuyambi.',
  },
  {
    icon: 'play_circle',
    en: 'Start Weekly Meeting opens attendance, cash count and box sealing.',
    lu: 'Tandika Olukuŋŋaana kiggulawo okubala abakiise, ssente n\'okusiba sanduuko.',
  },
  {
    icon: 'menu_book',
    en: 'Member Passbook holds every saver\'s stamps, loans and printable receipts.',
    lu: 'Ppaasibuku erimu sitampu, ebyewolo ne risiti za buli mukiise.',
  },
  {
    icon: 'key',
    en: 'Money moves only when TWO different officers turn their keys — each with their own PIN.',
    lu: 'Ssente zitambula abakulu babiri abenjawulo bwe bakkiriza — buli omu ne PIN ye.',
  },
  {
    icon: 'cloud_sync',
    en: 'Save a backup after every meeting — it is your way back if the phone is lost.',
    lu: 'Tereka backup buli lukuŋŋaana lwe luwedde — yiyo engeri y’okuddamu singa ssimu ebuze.',
  },
];

/**
 * Upgrade #16 — first-run guided tour (3 steps, skippable,
 * remembered per device).
 */
export const OnboardingTour: React.FC<OnboardingTourProps> = ({ language = 'EN', onDone }) => {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const text = language === 'LU' ? s.lu  : s.en;

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-6">
      <div className="w-full max-w-xs bg-white rounded-2xl shadow-2xl p-5 text-center space-y-3">
        <span className="material-symbols-outlined text-[44px] text-secondary">{s.icon}</span>
        <p className="text-sm text-on-surface font-medium leading-relaxed">{text}</p>
        <div className="flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full ${i === step ? 'bg-secondary' : 'bg-border-line'}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDone}
            className="flex-1 min-h-[44px] text-xs font-bold text-text-muted active:scale-95"
          >
            {language === 'LU' ? 'Buuka'  : 'Skip'}
          </button>
          <button
            type="button"
            onClick={() => (step + 1 >= STEPS.length ? onDone() : setStep(step + 1))}
            className="flex-[2] min-h-[44px] bg-[#00261b] text-white rounded-lg font-bold text-sm active:scale-[0.99]"
          >
            {step + 1 >= STEPS.length
              ? language === 'LU' ? 'Tandika!'  : "Let's go"
              : language === 'LU' ? 'Eddaako'  : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ONBOARDING_KEY = 'bakwata_onboarded_v1';
export const SEEN_VERSION_KEY = 'bakwata_seen_version';
