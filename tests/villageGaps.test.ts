import { describe, expect, it } from 'vitest';
import {
  GAP_TWO_KEY_THRESHOLD,
  WELFARE_FAST_TRACK_CAP,
  appliedRepayment,
  changeDue,
  displayFineReason,
  gapNeedsSecondKey,
  welfareNeedsQueue,
} from '../src/utils/policy';
import { buildLocalGroup } from '../src/utils/offlineGroup';
import { backupFileName, buildBackupPayload } from '../src/utils/backupFile';
import { estimateDataUrlBytes } from '../src/utils/photo';

describe('village money policy', () => {
  it('changeDue hands back overpayments, never negative', () => {
    expect(changeDue(100000, 60000)).toBe(40000); // Mukasa scenario
    expect(changeDue(60000, 60000)).toBe(0);
    expect(changeDue(30000, 60000)).toBe(0);
    expect(changeDue(0, 60000)).toBe(0);
  });

  it('appliedRepayment caps at the balance', () => {
    expect(appliedRepayment(100000, 60000)).toBe(60000);
    expect(appliedRepayment(30000, 60000)).toBe(30000);
  });

  it('big cash gaps need a second key at exactly the threshold', () => {
    expect(gapNeedsSecondKey(GAP_TWO_KEY_THRESHOLD)).toBe(true);
    expect(gapNeedsSecondKey(GAP_TWO_KEY_THRESHOLD - 1)).toBe(false);
    expect(gapNeedsSecondKey(-100000)).toBe(true);
  });

  it('welfare fast-track capped, above goes to queue', () => {
    expect(welfareNeedsQueue(WELFARE_FAST_TRACK_CAP)).toBe(false);
    expect(welfareNeedsQueue(WELFARE_FAST_TRACK_CAP + 1)).toBe(true);
  });

  it('fine reasons stay canonical EN, display LU', () => {
    expect(displayFineReason('Late arrival', 'LU')).toBe('Okukerewa');
    expect(displayFineReason('Late arrival', 'EN')).toBe('Late arrival');
    expect(displayFineReason('Late Arrival (>10:15 AM) · Arrived after prayer', 'LU')).toBe(
      'Okukerewa (>10:15) · Arrived after prayer'
    );
    expect(displayFineReason('Custom reason', 'LU')).toBe('Custom reason');
  });
});

describe('offline group builder', () => {
  const payload = {
    name: 'Kajjansi Twegatte',
    boxIdentifier: '',
    location: 'Kajjansi',
    meetingDay: 'Every Friday 4:00 PM',
    sharePrice: 5000,
    welfareMonthly: 2000,
    cycleDurationMonths: 10,
    adminName: 'Nakato Jane',
    adminPhone: '+256772111222',
    adminProvider: 'MTN' as const,
    adminPin: '5678',
    plan: 'free' as const,
  };

  it('builds a usable local group flagged pendingSync', () => {
    const { state, group, inviteCode } = buildLocalGroup(payload);
    expect(state.pendingSync).toBe(true);
    expect(state.groupName).toBe('Kajjansi Twegatte');
    expect(inviteCode).toMatch(/^[A-Z]{3}-\d{4}$/);
    expect(state.members).toHaveLength(1);
    expect(state.members[0].maxBorrowLimit).toBe(15000);
    expect(state.availableAccounts?.[0].pin).toBe('5678');
    expect(group.id).toBe(state.groupId);
  });

  it('backup payload carries the full state', () => {
    const { state } = buildLocalGroup(payload);
    const p = buildBackupPayload(state);
    expect(p.schemaVersion).toBe('2.0-VSLA-OFFLINE');
    expect(p.data.members).toHaveLength(1);
    expect(backupFileName(state.groupId)).toContain(state.groupId!);
  });

  it('estimates avatar data URL bytes without decoding', () => {
    // 4 base64 chars ≈ 3 bytes
    expect(estimateDataUrlBytes('data:image/jpeg;base64,QUJD')).toBe(3);
    expect(estimateDataUrlBytes('data:image/jpeg;base64,' + 'QUJD'.repeat(10000))).toBe(30000);
  });
});
