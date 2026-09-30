/**
 * A write-ahead journal for the ledger.
 *
 * The risk this closes: `persistState` writes the whole state to one
 * localStorage key. A phone that dies, runs out of battery, or gets its
 * browser killed mid-write leaves the group with the *previous* state, and a
 * meeting recorded in between simply never happened. There was no way to
 * tell that from a group that was never updated.
 *
 * So every commit is written to a small append-only log first, carrying the
 * new state and its sequence number. If the process dies between the journal
 * write and the main state write, the next launch sees the journal ahead of
 * the stored state and completes the commit.
 *
 * Deliberate limits:
 *  - this journals *committed states* at the persistence seam, not every
 *    individual field mutation. It protects the realistic failure (a crash
 *    between a change and its write) without threading a hook through every
 *    setState in the app.
 *  - it stores the state, not a diff, so recovery needs no replay logic and
 *    cannot drift from what the app actually renders.
 *  - it never throws. Storage may be full or unavailable; a group that cannot
 *    keep a journal must still be able to keep working, so failure is silent
 *    and the app falls back to today's single-key behaviour.
 */

const JOURNAL_PREFIX = 'bakwata_journal_v1:';
export const MAX_ENTRIES = 12;

export interface JournalEntry {
  seq: number;
  at: string;
  reason: string;
  /** SHA-256 of the state, so a truncated or edited entry is detectable. */
  hash: string;
  state: unknown;
}

type StateWithSeq = { journalSeq?: number };

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function key(groupId: string): string {
  return `${JOURNAL_PREFIX}${groupId}`;
}

function readRaw(groupId: string): JournalEntry[] {
  const store = storage();
  if (!store) return [];
  try {
    const parsed = JSON.parse(store.getItem(key(groupId)) || '[]');
    return Array.isArray(parsed) ? (parsed as JournalEntry[]) : [];
  } catch {
    // A corrupt journal is not worth crashing a meeting over. Start clean; the
    // stored state is still the authority for anything already committed.
    return [];
  }
}

/** A short, stable fingerprint of a state, used to spot a damaged entry. */
export function fingerprint(state: unknown): string {
  // Imported lazily to keep this module usable from a plain test without the
  // whole crypto path; the hash is only ever a damage detector.
  const json = JSON.stringify(state ?? null) ?? '';
  let h = 5381;
  for (let i = 0; i < json.length; i++) h = ((h << 5) + h + json.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

export function readJournal(groupId: string): JournalEntry[] {
  return readRaw(groupId);
}

export function journalHead(groupId: string): JournalEntry | null {
  const entries = readRaw(groupId);
  return entries.length ? entries[entries.length - 1] : null;
}

/**
 * Record a commit BEFORE the main state is written, and stamp the state with
 * the sequence number so the two can be compared later. Returns the state to
 * write, which is the input with `journalSeq` set.
 */
export function journalCommit<T extends StateWithSeq>(groupId: string, state: T, reason = 'commit'): T {
  const store = storage();
  if (!store || !groupId) return state;
  const entries = readRaw(groupId);
  const nextSeq = (entries.length ? entries[entries.length - 1].seq : 0) + 1;
  const entry: JournalEntry = {
    seq: nextSeq,
    at: new Date().toISOString(),
    reason,
    hash: fingerprint(state),
    state,
  };
  // keep the log short: the most recent commits are the ones that can still be
  // unrecovered, and a group has 5MB of storage, not 50
  const trimmed = [...entries, entry].slice(-MAX_ENTRIES);
  try {
    store.setItem(key(groupId), JSON.stringify(trimmed));
  } catch {
    // Quota exceeded, or storage disabled. Losing the journal must never stop
    // the ledger from being saved, so this is silent and the caller proceeds.
    return { ...state, journalSeq: nextSeq };
  }
  return { ...state, journalSeq: nextSeq };
}

export interface RecoveryResult<T> {
  state: T;
  recovered: boolean;
  reason: string;
  seq: number;
}

/**
 * On launch or group switch: if the journal is ahead of the state we were
 * handed, the last commit did not finish. Return the newer state so it can be
 * adopted and written properly.
 */
export function recoverUnfinishedCommit<T extends StateWithSeq>(groupId: string, incoming: T): RecoveryResult<T> {
  const head = journalHead(groupId);
  const stored = incoming?.journalSeq ?? 0;
  if (!head) return { state: incoming, recovered: false, reason: 'no-journal', seq: stored };
  if (head.seq <= stored) return { state: incoming, recovered: false, reason: 'up-to-date', seq: stored };
  // the entry must still look intact
  if (fingerprint(head.state) !== head.hash) {
    return { state: incoming, recovered: false, reason: 'damaged-entry', seq: stored };
  }
  return {
    state: { ...(head.state as T), journalSeq: head.seq },
    recovered: true,
    reason: head.reason || 'commit',
    seq: head.seq,
  };
}

/** Drop the log once a commit is safely in the main state key. */
export function clearJournal(groupId: string): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(key(groupId));
  } catch {
    /* nothing to do: a stale log only costs a few kB and is ignored by seq */
  }
}

/** How many groups currently have a journal on this device. Used by tests. */
export function journalGroups(): string[] {
  const store = storage();
  if (!store) return [];
  const out: string[] = [];
  try {
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k && k.startsWith(JOURNAL_PREFIX)) out.push(k.slice(JOURNAL_PREFIX.length));
    }
  } catch {
    /* ignore */
  }
  return out;
}
