import React, { useEffect, useState } from 'react';
import { canSpeak, speak, stopSpeaking } from '../utils/speech';

interface SpeakButtonProps {
  /** Plain-English sentence with the numbers in it. */
  text: string;
  label?: string;
  /** 'dark' sits on the green balance card. */
  tone?: 'light' | 'dark';
  className?: string;
}

/**
 * Speaker button: one tap reads the numbers on screen out loud. Hidden
 * entirely on devices with no speech engine, so nobody taps a dead button.
 */
export const SpeakButton: React.FC<SpeakButtonProps> = ({
  text,
  label = 'Read aloud',
  tone = 'light',
  className = '',
}) => {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(canSpeak());
  }, []);

  if (!supported) return null;

  const dark = tone === 'dark';
  return (
    <button
      type="button"
      onClick={() => {
        if (speaking) {
          stopSpeaking();
          setSpeaking(false);
          return;
        }
        if (speak(text)) {
          setSpeaking(true);
          window.setTimeout(() => setSpeaking(false), Math.min(15000, 1200 + text.length * 90));
        }
      }}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl font-bold text-xs active:scale-95 ${
        dark
          ? 'bg-white/15 text-white border border-white/25'
          : 'bg-surface-container text-primary border border-border-strong'
      } ${className}`}
    >
      <span
        className="material-symbols-outlined text-[20px]"
        style={{ fontVariationSettings: speaking ? "'FILL' 1" : "'FILL' 0" }}
      >
        {speaking ? 'stop_circle' : 'volume_up'}
      </span>
      {label}
    </button>
  );
};
