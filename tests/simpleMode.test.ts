import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { LANGUAGE_OPTIONS, getTranslations } from '../src/i18n/translations';
import { audit } from '../scripts/audit-luganda';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

describe('village simplicity guards', () => {
  it('offers exactly English + Luganda (no Swahili)', () => {
    const codes = LANGUAGE_OPTIONS.map((o) => o.code).sort();
    expect(codes).toEqual(['EN', 'LU']);
  });

  it('EN + LU both have a11y bar + simple-home strings', () => {
    for (const lang of ['EN', 'LU'] as const) {
      const t = getTranslations(lang);
      expect(t.a11y.bigText).toBeTruthy();
      expect(t.a11y.sunlight).toBeTruthy();
      expect(t.a11y.publicDisplay).toBeTruthy();
      expect(t.a11y.simple).toBeTruthy();
      expect(t.a11y.advanced).toBeTruthy();
      expect(t.home.simpleSteps).toBeTruthy();
      expect(t.home.simpleHelp).toBeTruthy();
      expect(t.home.simpleSaveBackup).toBeTruthy();
    }
  });

  it('Luganda is not English (actually translated)', () => {
    const en = getTranslations('EN');
    const lu = getTranslations('LU');
    expect(lu.nav.home).not.toBe(en.nav.home);
    expect(lu.home.simpleSteps).not.toBe(en.home.simpleSteps);
  });

  it('display settings have plain-word labels in both languages', () => {
    for (const lang of ['EN', 'LU'] as const) {
      const t = getTranslations(lang);
      for (const key of [
        'menu',
        'notifications',
        'display',
        'simpleView',
        'simpleViewHint',
        'bigTextHint',
        'brightScreen',
        'brightScreenHint',
        'showOnScreen',
        'showOnScreenHint',
        'language',
      ] as const) {
        expect(t.a11y[key], `${lang}.a11y.${key}`).toBeTruthy();
      }
    }
  });

  it('app header has no settings strip — toggles live in the menu', () => {
    const app = read('src/App.tsx');
    expect(app).not.toContain('t.a11y.simple}');
    expect(app).not.toContain('t.a11y.bigText}');
    expect(app).not.toContain('t.a11y.sunlight}');
    expect(app).not.toContain('t.a11y.publicDisplay}');
    expect(app).toContain('onToggleSimpleMode={toggleSimpleMode}');
    expect(app).toContain('onToggleElderMode={toggleElderMode}');
    expect(app).toContain('onToggleSunlightMode={toggleSunlightMode}');
    expect(app).toContain('onOpenPublicDisplay={() => setIsPublicDisplayOpen(true)}');
  });

  it('menu renders every display row as a labelled switch', () => {
    const bar = read('src/components/TopAppBar.tsx');
    for (const prop of [
      'simpleMode',
      'elderMode',
      'sunlightMode',
      'onToggleSimpleMode',
      'onToggleElderMode',
      'onToggleSunlightMode',
      'onOpenPublicDisplay',
    ]) {
      expect(bar).toContain(prop);
    }
    expect(bar).toContain("role={row.onOpen ? undefined : 'switch'}");
    expect(bar).toContain('min-h-[56px]');
    expect(bar).toContain('{t.a11y.display}');
  });
});

describe('Luganda audit tooling (hands a native speaker a work list)', () => {
  it('lists untranslated strings with their key or file:line', () => {
    const { gaps, untranslated } = audit();
    expect(untranslated).toBeGreaterThan(10);
    const keys = gaps.map((g) => g.where);
    expect(keys).toContain('common.cancel');
    expect(keys.some((k) => k.includes('CashDiscrepancyModal.tsx:'))).toBe(true);
  });

  it('does not flag words we verified in the corpus', () => {
    const keys = audit().gaps.map((g) => g.where);
    expect(keys).not.toContain('a11y.menu');
    expect(keys).not.toContain('a11y.help');
  });

  it('English never leaks Luganda back into the EN dictionary', () => {
    const en = getTranslations('EN');
    expect(en.a11y.menu).toBe('Menu');
    expect(en.a11y.notifications).toBe('Notifications');
    expect(en.a11y.help).toBe('Help');
    expect(en.a11y.bigText).toBe('Big text');
  });
});
