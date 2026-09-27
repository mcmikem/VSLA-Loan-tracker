import React, { useState } from 'react';
import { Language } from '../types';

interface OnboardingTourProps {
  language?: Language;
  /** Members see their own money; officers see the group and the two keys. */
  role?: string;
  onDone: () => void;
}

type Step = { icon: string; title: string; line: string };

// Three short steps, one idea each. Short words on purpose: many members
// read little, so the icon + big title carries the meaning.
const OFFICER_STEPS: Step[] = [
  { icon: 'groups', title: 'Your group', line: 'Everyone’s money is here.' },
  { icon: 'event', title: 'Weekly meeting', line: 'Add the money. Then lock the box.' },
  { icon: 'vpn_key', title: 'Two keys', line: 'Money moves only when two officers each turn their own key.' },
];

const MEMBER_STEPS: Step[] = [
  { icon: 'savings', title: 'Your savings', line: 'Everything you have put in the group is here.' },
  { icon: 'menu_book', title: 'Your passbook', line: 'Every share you bought is written down.' },
  { icon: 'help', title: 'Ask any time', line: 'Help is in the menu if you are not sure.' },
];

/**
 * First-run guided tour (3 steps, skippable, remembered per device).
 * Unverified Luganda is left in English rather than invented.
 */
export const OnboardingTour: React.FC<OnboardingTourProps> = ({ language = 'EN', role, onDone }) => {
  const [step, setStep] = useState(0);
  const STEPS = role === 'member' ? MEMBER_STEPS : OFFICER_STEPS;
  const s = STEPS[step];
  const isLast = step + 1 >= STEPS.length;

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-6">
      <div className="w-full max-w-xs bg-white rounded-2xl shadow-2xl p-5 text-center space-y-3">
        <div className="w-20 h-20 mx-auto rounded-full bg-[#EAF7EE] flex items-center justify-center">
          <span className="material-symbols-outlined text-[44px] text-[#006d30]">{s.icon}</span>
        </div>
        <p className="text-lg font-bold text-[#00261b] leading-tight">{s.title}</p>
        <p className="text-sm text-on-surface leading-relaxed">{s.line}</p>
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
            className="flex-1 min-h-[48px] text-sm font-bold text-text-muted active:scale-95"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => (isLast ? onDone() : setStep(step + 1))}
            className="flex-[2] min-h-[48px] bg-[#00261b] text-white rounded-xl font-bold text-base active:scale-[0.99]"
          >
            {isLast ? 'Start' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ONBOARDING_KEY = 'bakwata_onboarded_v1';
export const SEEN_VERSION_KEY = 'bakwata_seen_version';
