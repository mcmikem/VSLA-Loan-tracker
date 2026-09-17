import { describe, expect, it } from 'vitest';
import { LANGUAGE_OPTIONS, getTranslations } from '../src/i18n/translations';

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
});
