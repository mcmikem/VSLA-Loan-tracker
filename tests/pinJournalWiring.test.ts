import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/**
 * The PIN verifier and the journal are only worth anything if they are on the
 * path the app actually takes. These assert the wiring, so a refactor cannot
 * quietly leave a plaintext PIN or an unjournalled write behind.
 */
describe('the app is wired to never store a PIN or lose a commit', () => {
  it('never writes a PIN literal into an account', () => {
    for (const file of [
      'src/utils/offlineGroup.ts',
      'src/utils/officers.ts',
      'src/utils/practiceGroup.ts',
      'src/data/mockData.ts',
    ]) {
      const src = read(file);
      // every account's pin is a derived verifier
      expect(src, `${file} must not assign a literal PIN`).not.toMatch(/pin:\s*('1234'|draft\.pin|payload\.adminPin|'9182')/);
      expect(src, `${file} must derive a verifier`).toContain('derivePinVerifier');
    }
  });

  it('journals the commit before it writes the state key', () => {
    const persist = app.slice(app.indexOf('const persistState'), app.indexOf('const handleSelectGroup'));
    const journalAt = persist.indexOf('journalCommit(');
    const writeAt = persist.indexOf('localStorage.setItem');
    expect(journalAt, 'persistState must journal').toBeGreaterThan(-1);
    expect(writeAt).toBeGreaterThan(-1);
    // the whole point of a write-ahead journal: the journal comes first
    expect(journalAt).toBeLessThan(writeAt);
  });

  it('completes an unfinished commit when a state is adopted', () => {
    expect(app).toContain('recoverUnfinishedCommit(currentGroupId, incoming)');
    const start = app.indexOf('const adoptState');
    const adopt = app.slice(start, app.indexOf('const persistState', start));
    expect(adopt).toContain('recoverUnfinishedCommit');
    expect(adopt).toContain('migratePlaintextPins');
  });

  it('declares the journal sequence on the state so the two can be compared', () => {
    expect(read('src/types.ts')).toContain('journalSeq?: number');
  });

  it('the officer key check goes through the local verifier, not a string compare', () => {
    const dual = read('src/utils/dualApproval.ts');
    expect(dual).toContain('verifyPinLocally(pin, account.pin)');
    expect(dual).toContain('isDefaultPin(account.pin)');
    // the old plaintext comparison must be gone
    expect(dual).not.toContain("pin !== String(account.pin)");
  });
});
