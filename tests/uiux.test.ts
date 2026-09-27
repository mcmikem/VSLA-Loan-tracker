import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { canSpeak, speak, speakableAmount, stopSpeaking } from '../src/utils/speech';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const stubSpeech = (impl?: Partial<SpeechSynthesis>) => {
  const base: SpeechSynthesis = {
    cancel: vi.fn(),
    speak: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: () => [],
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    onvoiceschanged: null,
    pending: false,
    paused: false,
    speaking: false,
    ...impl,
  } as unknown as SpeechSynthesis;
  vi.stubGlobal('window', { speechSynthesis: base });
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    lang = '';
    rate = 1;
    pitch = 1;
    voice: SpeechSynthesisVoice | null = null;
    constructor(public text: string) {}
  });
  return base;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('read-aloud numbers', () => {
  it('reports no speech support instead of failing', () => {
    vi.stubGlobal('window', undefined);
    expect(canSpeak()).toBe(false);
    expect(speak('Box cash: 1000 shillings.')).toBe(false);
    expect(() => stopSpeaking()).not.toThrow();
  });

  it('speaks once, cancelling whatever was playing, at a slow rate', () => {
    const synth = stubSpeech();
    expect(canSpeak()).toBe(true);
    expect(speak('Box cash: 4 500 000 shillings.')).toBe(true);
    expect(synth.cancel).toHaveBeenCalledTimes(1);
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });

  it('refuses empty text so a button never reads silence', () => {
    const synth = stubSpeech();
    expect(speak('   ')).toBe(false);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('groups digits so a voice reads 4,500,000 naturally', () => {
    expect(speakableAmount(4500000)).toBe('4 500 000');
    expect(speakableAmount(500)).toBe('500');
  });
});

describe('low-literacy UI guards from the research pass', () => {
  it('home and help both offer a read-aloud button', () => {
    expect(read('src/views/HomeView.tsx')).toContain('<SpeakButton');
    expect(read('src/views/HelpView.tsx')).toContain('<SpeakButton');
    expect(read('src/components/SpeakButton.tsx')).toContain('if (!supported) return null;');
  });

  it('a member can hear their own savings and borrowing power', () => {
    const member = read('src/views/MemberHomeView.tsx');
    expect(member).toContain('<SpeakButton');
    expect(member).toContain('speakableAmount(member.sharesTotal)');
  });

  it('losing signal is announced, not silent', () => {
    const app = read('src/App.tsx');
    expect(app).toContain("addEventListener('offline'");
    expect(app).toContain('!isBrowserOnline');
    expect(app).toContain('navigator.storage?.persist?.()');
  });

  it('help is reachable from the header menu, not buried in a tab', () => {
    const bar = read('src/components/TopAppBar.tsx');
    expect(bar).toContain('onOpenHelp');
    expect(bar).toContain('{t.a11y.help}');
    expect(read('src/App.tsx')).toContain("onOpenHelp={() => handleNavigateScreen('help')}");
  });

  it('header icon buttons meet the 48dp Material target', () => {
    const bar = read('src/components/TopAppBar.tsx');
    expect(bar).toContain('min-h-[48px] min-w-[48px]');
    expect(bar).not.toContain('min-h-[44px] min-w-[44px]');
  });

  it('control borders clear the 3:1 non-text contrast minimum', () => {
    const css = read('src/index.css');
    expect(css).toContain('--color-border-strong: #64748B;');
  });
});

describe('money-out safeguards from the research pass', () => {
  it('both money-out steps in the meeting wizard re-check the amount', () => {
    const wiz = read('src/views/MeetingWizardView.tsx');
    expect(wiz).toContain('AmountConfirmDialog');
    // welfare payout request + new loan both route through the double check
    expect(wiz).toContain('const askAmountCheck =');
    expect((wiz.match(/askAmountCheck\(/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(read('src/App.tsx')).not.toContain('AmountConfirmDialog');
  });

  it('welfare cash handover re-checks the amount too', () => {
    const welfare = read('src/views/WelfareFundView.tsx');
    expect(welfare).toContain('AmountConfirmDialog');
    expect(welfare).toContain('setAmountCheck({ amount: num');
    expect(welfare).toContain('commitGrant');
  });

  it('a backup can be handed to WhatsApp, not only downloaded', () => {
    const backup = read('src/views/BackupAuditView.tsx');
    expect(backup).toContain('handleShareBackup');
    expect(backup).toContain('nav.share');
    expect(backup).toContain('canShare');
    // download must still work — share is an addition, not a replacement
    expect(backup).toContain('handleDownloadBackup');
    expect(backup).toContain('AbortError');
  });

  it('the amount check refuses a mismatch and needs a typed match', () => {
    const dlg = read('src/components/AmountConfirmDialog.tsx');
    expect(dlg).toContain('const ok = typed.replace(/[^\\d]/g, \'\') === String(expected);');
    expect(dlg).toContain('do not match');
    expect(dlg).toContain('min-h-[56px]');
  });

  it('every member with a phone can get their own receipt after sealing', () => {
    const close = read('src/views/MeetingCloseBoxView.tsx');
    expect(close).toContain('<MeetingReceiptsCard');
    const card = read('src/components/MeetingReceiptsCard.tsx');
    expect(card).toContain('smsHref(m.phone, body)');
    expect(card).toContain('waHref(m.phone, body)');
    expect(card).toContain('sentCount');
    expect(read('src/App.tsx')).toContain('members={vslaState.members}');
  });
});
