import type { VSLAState } from '../types';

/**
 * Shared backup-file download (used by Backup center AND the meeting-seal
 * gate). Must be called from a user tap or browsers may block it.
 */
export function backupFileName(groupId?: string): string {
  const day = new Date().toISOString().split('T')[0];
  return `${groupId || 'vsla'}_backup_${day}.json`;
}

export function buildBackupPayload(state: VSLAState) {
  return {
    schemaVersion: '2.0-VSLA-OFFLINE',
    app: 'Bakwata Village Savings and Loan Association Digital Passbook',
    groupId: state.groupId,
    groupName: state.groupName,
    boxIdentifier: state.boxIdentifier,
    cycle: state.cycle,
    exportedAt: new Date().toISOString(),
    checksum: `VSLA-${Date.now().toString(36).toUpperCase()}`,
    data: state,
  };
}

export function downloadBackupFile(state: VSLAState): void {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(buildBackupPayload(state), null, 2)
  )}`;
  const a = document.createElement('a');
  a.setAttribute('href', jsonString);
  a.setAttribute('download', backupFileName(state.groupId));
  document.body.appendChild(a);
  a.click();
  a.remove();
}
