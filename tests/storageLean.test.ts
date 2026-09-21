import { describe, expect, it } from 'vitest';
import { mergePhotosIntoRestored, stripPhotosForSnapshot } from '../src/utils/photo';
import type { VSLAState } from '../src/types';

const base = {
  boxCashBalance: 100000,
  members: [
    { id: 'm1', no: '01', name: 'Sarah', photoUrl: 'data:face1' },
    { id: 'm2', no: '02', name: 'Joseph' },
  ],
} as unknown as VSLAState;

describe('snapshot photo hygiene', () => {
  it('strips faces from snapshot payloads but keeps books intact', () => {
    const stripped = stripPhotosForSnapshot(base);
    expect(stripped.members[0].photoUrl).toBeUndefined();
    expect(stripped.members[1].name).toBe('Joseph');
    expect(stripped.boxCashBalance).toBe(100000);
    // Live state untouched.
    expect(base.members[0].photoUrl).toBe('data:face1');
  });

  it('merges live faces back on restore by member id', () => {
    const stripped = stripPhotosForSnapshot(base);
    const restored = mergePhotosIntoRestored(stripped, base);
    expect(restored.members[0].photoUrl).toBe('data:face1');
    expect(restored.members[1].photoUrl).toBeUndefined();
  });

  it('keeps restored faces when the snapshot has its own', () => {
    const snap = stripPhotosForSnapshot(base);
    (snap.members[0] as any).photoUrl = 'data:newface';
    expect(mergePhotosIntoRestored(snap, base).members[0].photoUrl).toBe('data:newface');
  });
});
