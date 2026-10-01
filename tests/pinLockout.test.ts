import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  PIN_FREE_ATTEMPTS,
  PIN_MAX_LOCK_MS,
  clearPinFailures,
  isPinLocked,
  notePinFailure,
  pinLockMs,
  pinLockedFor,
} from '../lib/_auth.js';

/**
 * A 4-digit PIN is 10,000 possibilities. The IP limit alone allows 10 a
 * minute, which exhausts the space in about 17 hours, and it is shared by a
 * whole village behind one carrier NAT. This counts failures per account, on
 * the account, so it survives a redeploy and cannot be dodged by changing IP.
 */
describe('the wrong-PIN delay', () => {
  it('allows a few honest mistakes before it slows anyone down', () => {
    for (let failures = 1; failures <= PIN_FREE_ATTEMPTS; failures++) {
      expect(pinLockMs(failures), `failure ${failures}`).toBe(0);
    }
  });

  it('then doubles every time', () => {
    expect(pinLockMs(PIN_FREE_ATTEMPTS + 1)).toBe(1000);
    expect(pinLockMs(PIN_FREE_ATTEMPTS + 2)).toBe(2000);
    expect(pinLockMs(PIN_FREE_ATTEMPTS + 3)).toBe(4000);
    expect(pinLockMs(PIN_FREE_ATTEMPTS + 4)).toBe(8000);
  });

  it('is capped, so the maths cannot overflow into a silly number', () => {
    expect(pinLockMs(30)).toBe(PIN_MAX_LOCK_MS);
    expect(pinLockMs(1000)).toBe(PIN_MAX_LOCK_MS);
  });

  it('makes exhausting all 10,000 PINs impractical', () => {
    // An attacker who waits out each delay and tries one PIN at a time. Today
    // the IP limit allows 10 a minute, so the whole space goes in 16.7 hours.
    // With the doubling it is about 416 days, some 600x longer.
    let totalWaitMs = 0;
    for (let failure = 1; failure <= 10_000; failure++) totalWaitMs += pinLockMs(failure);
    const hours = totalWaitMs / 3_600_000;
    expect(hours, 'must beat the old 16.7 hours by two orders of magnitude').toBeGreaterThan(24 * 300);
    expect(Math.round(hours / 24), 'a year of guessing, not a hand-wave').toBeGreaterThan(365);
  });
});

describe('account state carries the delay', () => {
  let account: { pinLock?: { failures: number; until: number } };

  beforeEach(() => {
    account = {};
  });

  it('starts unlocked', () => {
    expect(isPinLocked(account)).toBe(false);
    expect(pinLockedFor(account)).toBe(0);
  });

  it('stays unlocked through the free attempts, then locks', () => {
    for (let i = 1; i <= PIN_FREE_ATTEMPTS; i++) {
      notePinFailure(account);
      expect(isPinLocked(account), `after failure ${i}`).toBe(false);
    }
    notePinFailure(account);
    expect(isPinLocked(account)).toBe(true);
  });

  it('expires on its own, so nobody is locked out forever', () => {
    const now = 1_000_000;
    for (let i = 0; i < PIN_FREE_ATTEMPTS + 1; i++) notePinFailure(account, now);
    const remaining = pinLockedFor(account, now);
    expect(remaining).toBeGreaterThan(0);
    // the wait really does run out
    expect(pinLockedFor(account, now + remaining + 1)).toBe(0);
    expect(isPinLocked(account, now + remaining + 1)).toBe(false);
  });

  it('a correct PIN clears the record', () => {
    for (let i = 0; i < PIN_FREE_ATTEMPTS + 3; i++) notePinFailure(account);
    expect(isPinLocked(account)).toBe(true);
    clearPinFailures(account);
    expect(isPinLocked(account)).toBe(false);
    expect(account.pinLock).toBeUndefined();
  });

  it('counts a success-then-failure sequence from zero again', () => {
    for (let i = 0; i < PIN_FREE_ATTEMPTS + 3; i++) notePinFailure(account);
    clearPinFailures(account);
    notePinFailure(account);
    expect(isPinLocked(account)).toBe(false);
  });

  it('tolerates an account that has never been locked', () => {
    expect(() => clearPinFailures({})).not.toThrow();
    expect(pinLockedFor(undefined)).toBe(0);
    expect(isPinLocked(undefined)).toBe(false);
    expect(pinLockMs(0)).toBe(0);
  });
});

describe('it is a delay, not a lock with an admin override', () => {
  it('there is no code path that locks an account out permanently', () => {
    // A permanent lock in a village, with no way for the group to recover,
    // would strand the treasurer out of their own savings. The wait caps at
    // an hour and any correct PIN clears it.
    const account: { pinLock?: { failures: number; until: number } } = {};
    const now = 0;
    for (let i = 0; i < 500; i++) notePinFailure(account, now);
    expect(pinLockedFor(account, now)).toBe(PIN_MAX_LOCK_MS);
    expect(pinLockedFor(account, now + PIN_MAX_LOCK_MS + 1)).toBe(0);
  });
});
