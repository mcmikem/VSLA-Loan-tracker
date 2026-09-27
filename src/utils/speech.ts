/**
 * Read numbers out loud.
 *
 * Why: research on low-literacy users (Medhi et al., CHI 2009) found spoken
 * output was understood faster and needed less help than text or graphics.
 * Most Android phones in Uganda have no Luganda text-to-speech voice, so the
 * spoken wording is plain English plus the number — that is what people need
 * to hear ("Box cash: 4,500,000 shillings").
 *
 * Everything degrades quietly: no speech engine, no button, no crash.
 */

const synth = (): SpeechSynthesis | null => {
  if (typeof window === 'undefined') return null;
  const s = window.speechSynthesis;
  return s || null;
};

export const canSpeak = (): boolean => synth() !== null;

const pickVoice = (lang: string): SpeechSynthesisVoice | null => {
  const s = synth();
  if (!s) return null;
  const voices = s.getVoices();
  const exact = voices.find((v) => v.lang?.toLowerCase() === lang.toLowerCase());
  if (exact) return exact;
  const prefix = lang.slice(0, 2).toLowerCase();
  return voices.find((v) => v.lang?.toLowerCase().startsWith(prefix)) || null;
};

/** Speaks `text`. Returns false when the device cannot speak, so callers can hide the button. */
export const speak = (text: string): boolean => {
  const s = synth();
  if (!s || !text.trim()) return false;
  try {
    s.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';
    utterance.rate = 0.95;
    const voice = pickVoice('en-GB');
    if (voice) utterance.voice = voice;
    s.speak(utterance);
    return true;
  } catch {
    return false;
  }
};

export const stopSpeaking = (): void => {
  try {
    synth()?.cancel();
  } catch {
    /* ignore */
  }
};

/** "4,500,000" -> "4 500 000" so a voice reads it digit-group by digit-group. */
export const speakableAmount = (amount: number): string =>
  amount.toLocaleString('en-US').replace(/,/g, ' ');
