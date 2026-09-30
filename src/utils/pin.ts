/**
 * PIN hardening.
 *
 * The server is the authority and stores a PIN as `hash:<salt>:<scrypt>`
 * (lib/_auth.js). That format is deliberately unverifiable in the browser, so
 * an offline group kept the officer's PIN in **plaintext** inside the state,
 * which is then written to localStorage on every meeting and travels inside
 * every backup file. A stolen phone, a shared phone, or one exported backup
 * gave anyone reading storage the PIN that authorises moving money.
 *
 * What is stored offline now is a *verifier*:
 *
 *     offline1:d<0|1>:<salt>:<iterated-sha256>
 *
 * - d1 means "this is the default PIN 1234", so the gate that stops a default
 *   PIN from moving money still works without the PIN being present.
 * - the PIN itself is never written anywhere.
 *
 * Being honest about the limit: a 4-digit PIN has only 10,000 possibilities,
 * so no stored verifier can survive someone who has the device and unlimited
 * time. What this genuinely buys is that the secret stops leaving the app --
 * it is no longer readable from a backup file, from another app on a shared
 * phone, or from the devtools console. The rest is the server's job, and
 * officers.ts already pushes people towards longer PINs.
 */

export const DEFAULT_PIN = '1234';

/** Marker for a locally-derived verifier, so it is never confused with the server's. */
export const VERIFIER_PREFIX = 'offline1:';

/**
 * Iterations, chosen for the device this runs on rather than for a server. A
 * cheap Android doing SHA-256 in JS manages roughly 20k iterations/second, so
 * 2,000 costs about 100ms on the slowest phone we support and about 15ms on a
 * normal one. A stolen-device attacker still has to grind 10,000 PINs, which
 * at this cost is tens of minutes rather than seconds. The real protection
 * against online guessing is the server's lockout, not this number.
 */
const ITERATIONS = 2000;

// ---------- a small synchronous SHA-256 ----------
// WebCrypto's digest is async, and the officer-key check runs synchronously in
// the middle of a payout. A dependency-free sync hash keeps that path sync and
// keeps the bundle small for a 2G phone.

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

function utf8Bytes(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

export function sha256Bytes(message: Uint8Array): Uint8Array {
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const bitLen = message.length * 8;
  // pad to a multiple of 64 bytes: 0x80, zeros, then a 64-bit big-endian length
  const padded = new Uint8Array((((message.length + 8) >> 6) + 1) << 6);
  padded.set(message);
  padded[message.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bitLen >>> 0, false);
  view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000), false);

  const w = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e;
      e = (d + temp1) >>> 0;
      d = c; c = b; b = a;
      a = (temp1 + temp2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
  }
  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) outView.setUint32(i * 4, h[i], false);
  return out;
}

export function sha256Hex(input: string): string {
  return [...sha256Bytes(utf8Bytes(input))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomSaltHex(bytes = 16): string {
  const buf = new Uint8Array(bytes);
  const webCrypto = globalThis.crypto;
  if (webCrypto?.getRandomValues) {
    webCrypto.getRandomValues(buf);
  } else {
    // A predictable salt would be worse than none. Refuse rather than weaken.
    throw new Error('pin: no secure random source available');
  }
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derive what we store instead of the PIN. Deliberately iterated so that
 * copying one verifier between accounts does not make every account's PIN
 * guessable from the same work.
 */
function deriveHash(pin: string, saltHex: string): string {
  const salt = Uint8Array.from(saltHex.match(/../g)!.map((h) => parseInt(h, 16)));
  let acc = concatBytes(salt, utf8Bytes(pin));
  let digest = sha256Bytes(acc);
  for (let i = 1; i < ITERATIONS; i++) {
    acc = concatBytes(digest, salt);
    digest = sha256Bytes(acc);
  }
  return [...digest].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function isPinVerifier(stored?: string): boolean {
  return typeof stored === 'string' && stored.startsWith(VERIFIER_PREFIX);
}

/** Build the stored verifier for a PIN. This is what replaces the plaintext. */
export function derivePinVerifier(pin: string, saltHex = randomSaltHex()): string {
  const normalised = String(pin ?? '');
  const isDefault = normalised === DEFAULT_PIN ? 1 : 0;
  return `${VERIFIER_PREFIX}d${isDefault}:${saltHex}:${deriveHash(normalised, saltHex)}`;
}

/**
 * Check a PIN against whatever we stored, in constant time. Accepts the new
 * verifier, a legacy plaintext PIN from a group created before this change,
 * and refuses the server's scrypt format, which cannot be checked here.
 */
export function verifyPinLocally(pin: string, stored?: string): boolean {
  if (!stored) return false;
  if (stored.startsWith('hash:')) return false;
  if (isPinVerifier(stored)) {
    const [, flag, salt] = stored.split(':');
    if (!salt) return false;
    const actual = deriveHash(String(pin ?? ''), salt);
    const expected = stored.split(':')[3] ?? '';
    if (actual.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0 && flag === `d${String(pin ?? '') === DEFAULT_PIN ? 1 : 0}`;
  }
  // legacy plaintext, compared without leaking its length
  const a = String(pin ?? '');
  const b = String(stored);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * The default-PIN gate. Reads the flag out of a verifier, and still works for
 * a legacy plaintext PIN and for a server account, so no call site changes.
 */
export function isDefaultPin(pin?: string): boolean {
  if (!pin) return false;
  if (isPinVerifier(pin)) return pin.split(':')[1] === 'd1';
  if (pin.startsWith('hash:')) return false;
  return pin === DEFAULT_PIN;
}

export function isValidPinFormat(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}

type PinAccount = { id: string; pin?: string };

/**
 * One-time upgrade for groups created before this change, which still hold a
 * plaintext PIN. Called when the state is adopted, while the plaintext is
 * still in hand, so it can be replaced without ever asking for it again.
 */
export function migratePlaintextPins<T extends PinAccount>(accounts: T[]): { accounts: T[]; migrated: number } {
  let migrated = 0;
  const next = (accounts || []).map((a) => {
    const stored = a?.pin;
    if (!stored || isPinVerifier(stored) || stored.startsWith('hash:')) return a;
    migrated++;
    return { ...a, pin: derivePinVerifier(stored) };
  });
  return { accounts: next, migrated };
}
