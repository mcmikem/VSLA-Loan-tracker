import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PIN,
  derivePinVerifier,
  isDefaultPin,
  isPinVerifier,
  migratePlaintextPins,
  sha256Hex,
  verifyPinLocally,
} from '../src/utils/pin';
import { buildLocalGroup } from '../src/utils/offlineGroup';
import { verifyOfficerKey } from '../src/utils/dualApproval';

/**
 * The offline group used to keep the officer's PIN in plaintext, in the state
 * that is written to localStorage on every meeting and travels inside every
 * backup file. These tests pin the replacement: a verifier, never the PIN.
 */

describe('the sync SHA-256 the verifier is built on', () => {
  // If this drifts, every stored verifier silently stops verifying, so the
  // known-answer tests are the most important lines in the file.
  it('matches the published NIST vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'
    );
    expect(sha256Hex('The quick brown fox jumps over the lazy dog')).toBe(
      'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592'
    );
    // a multi-block message, where the length padding matters
    expect(sha256Hex('a'.repeat(1000))).toHaveLength(64);
  });

  it('is not so slow that it freezes a cheap phone', () => {
    const started = Date.now();
    derivePinVerifier('4821');
    // generous: the point is that it is not hundreds of milliseconds
    expect(Date.now() - started).toBeLessThan(120);
  });
});

describe('an offline PIN is stored as a verifier, never as itself', () => {
  it('the verifier verifies its own PIN and nothing else', () => {
    const stored = derivePinVerifier('4821');
    expect(isPinVerifier(stored)).toBe(true);
    expect(stored).not.toContain('4821');
    expect(verifyPinLocally('4821', stored)).toBe(true);
    expect(verifyPinLocally('4822', stored)).toBe(false);
    expect(verifyPinLocally('', stored)).toBe(false);
    expect(verifyPinLocally('48210', stored)).toBe(false);
  });

  it('two accounts with the same PIN do not share a stored value', () => {
    // otherwise one leaked verifier would give away the other account
    expect(derivePinVerifier('4821')).not.toBe(derivePinVerifier('4821'));
  });

  it('a new group on a phone stores no plaintext PIN', () => {
    const { state } = buildLocalGroup({
      name: 'Kajjansi Twegatte',
      adminName: 'Test Admin',
      adminPhone: '+256700000001',
      adminPin: '5678',
    } as never);
    const account = state.availableAccounts?.[0];
    const serialised = JSON.stringify(state);
    expect(account?.pin).toBeDefined();
    expect(isPinVerifier(account?.pin)).toBe(true);
    expect(String(account?.pin)).not.toContain('5678');
    // the whole state, which is what gets written to storage, has no PIN in it
    expect(serialised).not.toContain('5678');
    expect(verifyPinLocally('5678', account?.pin)).toBe(true);
  });
});

describe('the default-PIN gate still works without the PIN', () => {
  it('reads the flag out of a verifier', () => {
    expect(isDefaultPin(derivePinVerifier('1234'))).toBe(true);
    expect(isDefaultPin(derivePinVerifier('4821'))).toBe(false);
  });

  it('still reads a legacy plaintext PIN', () => {
    expect(isDefaultPin('1234')).toBe(true);
    expect(isDefaultPin('4821')).toBe(false);
  });

  it('a verifier built from 1234 refuses any other PIN', () => {
    const stored = derivePinVerifier(DEFAULT_PIN);
    expect(verifyPinLocally('1234', stored)).toBe(true);
    expect(verifyPinLocally('1235', stored)).toBe(false);
  });

  it('the officer key check refuses a default PIN, as it always did', () => {
    const accounts = [{ id: 'o1', name: 'Grace', pin: derivePinVerifier('1234') }];
    const result = verifyOfficerKey(accounts as never, 'o1', '1234');
    expect(result.ok).toBe(false);
  });

  it('a non-default PIN still turns the key', () => {
    const accounts = [{ id: 'o1', name: 'Grace', pin: derivePinVerifier('4821') }];
    expect(verifyOfficerKey(accounts as never, 'o1', '4821').ok).toBe(true);
    expect(verifyOfficerKey(accounts as never, 'o1', '9999').ok).toBe(false);
  });
});

describe('groups created before this change', () => {
  it('a legacy plaintext PIN still verifies, so nobody loses access', () => {
    expect(verifyPinLocally('1234', '1234')).toBe(true);
    expect(verifyPinLocally('1235', '1234')).toBe(false);
    expect(verifyOfficerKey([{ id: 'o1', name: 'G', pin: '4821' }] as never, 'o1', '4821').ok).toBe(true);
  });

  it('migrates the plaintext away while it is still in hand', () => {
    const { accounts, migrated } = migratePlaintextPins([
      { id: 'plain', pin: '4821' },
      { id: 'already', pin: derivePinVerifier('9999') },
      { id: 'server', pin: 'hash:salt:scrypt' },
      { id: 'none' },
    ]);
    expect(migrated).toBe(1);
    expect(isPinVerifier(accounts[0].pin)).toBe(true);
    expect(verifyPinLocally('4821', accounts[0].pin)).toBe(true);
    // a server account and an already-migrated one are left alone
    expect(accounts[1].pin).toMatch(/^offline1:/);
    expect(accounts[2].pin).toBe('hash:salt:scrypt');
    expect(JSON.stringify(accounts)).not.toContain('"4821"');
  });

  it('migration is a no-op the second time', () => {
    const first = migratePlaintextPins([{ id: 'a', pin: '4821' }]);
    const second = migratePlaintextPins(first.accounts);
    expect(second.migrated).toBe(0);
    expect(second.accounts[0].pin).toBe(first.accounts[0].pin);
  });
});

describe('the server stays the authority', () => {
  it('refuses to pretend it can check a scrypt hash in the browser', () => {
    // this is the 'secure' path: such an account must be approved from the
    // signed-in session, not from an offline guess
    expect(verifyPinLocally('1234', 'hash:abc:def')).toBe(false);
    const result = verifyOfficerKey([{ id: 'o1', name: 'G', pin: 'hash:abc:def' }] as never, 'o1', '1234');
    expect(result.ok).toBe(false);
  });
});
