import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearJournal,
  fingerprint,
  journalCommit,
  journalGroups,
  journalHead,
  MAX_ENTRIES,
  readJournal,
  recoverUnfinishedCommit,
} from '../src/utils/journal';

/**
 * A phone that dies between a change and its write used to lose that change
 * with no trace. The journal is written first, so an unfinished commit is
 * detectable and recoverable on the next launch.
 */

type State = { journalSeq?: number; meetings: number; note: string };

const G = 'grp-test-journal';

const mem = new Map<string, string>();
// a deliberately small store, so we can exercise the quota path
let quotaBytes = Infinity;

beforeEach(() => {
  mem.clear();
  quotaBytes = Infinity;
  (globalThis as { localStorage: Storage }).localStorage = {
    get length() {
      return mem.size;
    },
    key: (i: number) => [...mem.keys()][i] ?? null,
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      const size = new TextEncoder().encode(k + v).length;
      let used = 0;
      for (const [key, val] of mem) used += new TextEncoder().encode(key + val).length;
      if (used + size > quotaBytes) throw new Error('QuotaExceededError');
      mem.set(k, v);
    },
    removeItem: (k: string) => void mem.delete(k),
    clear: () => mem.clear(),
  } as unknown as Storage;
});

describe('the journal records a commit before the state is written', () => {
  it('stamps the state with a sequence number', () => {
    const a = journalCommit(G, { meetings: 1, note: 'a' } as State, 'record-shares');
    expect(a.journalSeq).toBe(1);
    const b = journalCommit(G, a, 'close-meeting');
    expect(b.journalSeq).toBe(2);
  });

  it('the head is the newest entry, with the state it committed', () => {
    journalCommit(G, { meetings: 1, note: 'first' } as State, 'record-shares');
    const second = journalCommit(G, { meetings: 2, note: 'second' } as State, 'close-meeting');
    const head = journalHead(G);
    expect(head?.seq).toBe(2);
    expect((head?.state as State).note).toBe('second');
    expect(head?.reason).toBe('close-meeting');
    expect(second.journalSeq).toBe(2);
  });

  it('keeps the log bounded so it cannot eat the storage quota', () => {
    for (let i = 1; i <= MAX_ENTRIES + 8; i++) {
      journalCommit(G, { meetings: i, note: `n${i}` } as State, 'commit');
    }
    const entries = readJournal(G);
    expect(entries.length).toBe(MAX_ENTRIES);
    // and it is the newest that survive, since only those can be unrecovered
    expect(entries[entries.length - 1].seq).toBe(MAX_ENTRIES + 8);
  });

  it('keeps one log per group', () => {
    journalCommit('grp-a', { meetings: 1, note: 'a' } as State, 'x');
    journalCommit('grp-b', { meetings: 1, note: 'b' } as State, 'x');
    expect(journalGroups().sort()).toEqual(['grp-a', 'grp-b']);
  });
});

describe('an unfinished commit is recovered', () => {
  it('adopts the journal state when the journal is ahead', () => {
    // the app journals, then the phone dies before the state key is written
    const committed = journalCommit(G, { meetings: 7, note: 'lost-work' } as State, 'close-meeting');
    // on relaunch the stored state is the older one, with no seq
    const stored = { meetings: 6, note: 'previous' } as State;
    const result = recoverUnfinishedCommit<State>(G, stored);
    expect(result.recovered).toBe(true);
    expect(result.reason).toBe('close-meeting');
    expect(result.state.meetings).toBe(7);
    expect(result.state.note).toBe('lost-work');
    expect(result.state.journalSeq).toBe(committed.journalSeq);
  });

  it('leaves an up-to-date state alone', () => {
    const committed = journalCommit(G, { meetings: 7, note: 'fine' } as State, 'commit');
    const result = recoverUnfinishedCommit<State>(G, { ...committed, meetings: 7, note: 'fine' });
    expect(result.recovered).toBe(false);
    expect(result.reason).toBe('up-to-date');
  });

  it('an already-recovered state is not recovered twice', () => {
    const committed = journalCommit(G, { meetings: 7, note: 'fine' } as State, 'commit');
    const first = recoverUnfinishedCommit<State>(G, { meetings: 6, note: 'old' } as State);
    const second = recoverUnfinishedCommit<State>(G, first.state);
    expect(first.recovered).toBe(true);
    expect(second.recovered).toBe(false);
  });

  it('refuses a damaged entry rather than restoring rubbish', () => {
    journalCommit(G, { meetings: 7, note: 'x' } as State, 'commit');
    // simulate a truncated or edited log
    const raw = JSON.parse(mem.get(`bakwata_journal_v1:${G}`) ?? '[]');
    raw[0].state.meetings = 999;
    mem.set(`bakwata_journal_v1:${G}`, JSON.stringify(raw));
    const result = recoverUnfinishedCommit<State>(G, { meetings: 6, note: 'old' } as State);
    expect(result.recovered).toBe(false);
    expect(result.reason).toBe('damaged-entry');
    expect(result.state.meetings).toBe(6);
  });

  it('a corrupt log is discarded, not thrown at a treasurer mid-meeting', () => {
    mem.set(`bakwata_journal_v1:${G}`, '{not json');
    const result = recoverUnfinishedCommit<State>(G, { meetings: 3, note: 'ok' } as State);
    expect(result.recovered).toBe(false);
    expect(result.state.meetings).toBe(3);
  });

  it('no journal means nothing to recover', () => {
    const result = recoverUnfinishedCommit<State>('grp-never-seen', { meetings: 1, note: 'a' } as State);
    expect(result.recovered).toBe(false);
    expect(result.reason).toBe('no-journal');
  });
});

describe('the ledger still works when the journal cannot', () => {
  it('survives a full storage quota and still returns the state to save', () => {
    quotaBytes = 200; // too small for the log
    const state = journalCommit(G, { meetings: 1, note: 'x' } as State, 'commit');
    // the state to write is still returned, so the main key is unaffected
    expect(state.meetings).toBe(1);
    expect(state.journalSeq).toBeGreaterThan(0);
  });

  it('survives storage being unavailable entirely', () => {
    (globalThis as { localStorage: Storage }).localStorage = {
      get length() { throw new Error('denied'); },
      key: () => null,
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
      removeItem: () => { throw new Error('denied'); },
      clear: () => { throw new Error('denied'); },
    } as unknown as Storage;
    const state = journalCommit(G, { meetings: 1, note: 'x' } as State, 'commit');
    expect(state.meetings).toBe(1);
    expect(recoverUnfinishedCommit<State>(G, state).recovered).toBe(false);
    expect(() => clearJournal(G)).not.toThrow();
  });

  it('clearing a journal is safe when there is nothing to clear', () => {
    expect(() => clearJournal('grp-never-seen')).not.toThrow();
  });
});

describe('fingerprint', () => {
  it('is stable and distinguishes different states', () => {
    expect(fingerprint({ a: 1 })).toBe(fingerprint({ a: 1 }));
    expect(fingerprint({ a: 1 })).not.toBe(fingerprint({ a: 2 }));
    expect(fingerprint(null)).toBe(fingerprint(null));
  });
});
