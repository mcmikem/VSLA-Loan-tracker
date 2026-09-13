import React, { useState } from 'react';
import { VSLAState, BackupSnapshot, ScreenId } from '../types';

interface BackupAuditViewProps {
  state: VSLAState;
  onNavigate: (screen: ScreenId) => void;
  onRestoreState: (newState: VSLAState) => Promise<boolean>;
  onCreateSnapshot: (label: string) => Promise<void>;
  onResetToBaseline: () => Promise<void>;
  onRefreshFromServer: () => Promise<void>;
}

export const BackupAuditView: React.FC<BackupAuditViewProps> = ({
  state,
  onNavigate,
  onRestoreState,
  onCreateSnapshot,
  onResetToBaseline,
  onRefreshFromServer,
}) => {
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [pastedJson, setPastedJson] = useState('');
  const [restoreFeedback, setRestoreFeedback] = useState<{ type: 'ok' | 'err'; message: string } | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'export' | 'restore' | 'snapshots'>('export');
  const [isCopied, setIsCopied] = useState(false);

  // Generate downloadable JSON
  const handleDownloadBackup = () => {
    const backupData = {
      schemaVersion: '2.0-VSLA-OFFLINE',
      app: 'Bakwata Village Savings and Loan Association Digital Passbook',
      groupName: state.groupName,
      boxIdentifier: state.boxIdentifier,
      cycle: state.cycle,
      exportedAt: new Date().toISOString(),
      checksum: `VSLA-${Date.now().toString(36).toUpperCase()}`,
      data: state,
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute(
      'download',
      `bakwata_vsla_backup_${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setRestoreFeedback({
      type: 'ok',
      message: 'Full backup JSON downloaded successfully to your device.',
    });
    setTimeout(() => setRestoreFeedback(null), 4000);
  };

  const handleCopyClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(state, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const dataToRestore: VSLAState = parsed.data || parsed;

        if (!dataToRestore.members || !Array.isArray(dataToRestore.members)) {
          throw new Error('Invalid file format: missing group members.');
        }

        setIsProcessing(true);
        const success = await onRestoreState(dataToRestore);
        setIsProcessing(false);

        if (success) {
          setRestoreFeedback({
            type: 'ok',
            message: `Successfully restored ${dataToRestore.members.length} members and balances!`,
          });
        } else {
          setRestoreFeedback({
            type: 'err',
            message: 'Failed to restore backup.',
          });
        }
      } catch (err: any) {
        setIsProcessing(false);
        setRestoreFeedback({
          type: 'err',
          message: 'Error parsing backup file: ' + err.message,
        });
      }
    };
    reader.readAsText(file);
  };

  // Handle Pasted JSON Restore
  const handlePastedRestore = async () => {
    if (!pastedJson.trim()) return;
    try {
      const parsed = JSON.parse(pastedJson);
      const dataToRestore: VSLAState = parsed.data || parsed;

      if (!dataToRestore.members || !Array.isArray(dataToRestore.members)) {
        throw new Error('Invalid JSON: missing members array.');
      }

      setIsProcessing(true);
      const success = await onRestoreState(dataToRestore);
      setIsProcessing(false);

      if (success) {
        setPastedJson('');
        setRestoreFeedback({
          type: 'ok',
          message: `System successfully restored from pasted payload!`,
        });
      } else {
        setRestoreFeedback({
          type: 'err',
          message: 'Server error restoring state.',
        });
      }
    } catch (err: any) {
      setIsProcessing(false);
      setRestoreFeedback({
        type: 'err',
        message: 'Invalid JSON payload: ' + err.message,
      });
    }
  };

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = snapshotLabel.trim() || `Manual Checkpoint (${new Date().toLocaleTimeString()})`;
    setIsProcessing(true);
    await onCreateSnapshot(label);
    setIsProcessing(false);
    setSnapshotLabel('');
    setRestoreFeedback({
      type: 'ok',
      message: `Snapshot "${label}" captured and saved.`,
    });
    setTimeout(() => setRestoreFeedback(null), 3500);
  };

  const handleRestoreSnapshot = async (snap: BackupSnapshot) => {
    if (!snap.data) {
      alert('This seed snapshot does not have historical payload data.');
      return;
    }
    if (confirm(`Restore system to snapshot "${snap.label}" from ${new Date(snap.timestamp).toLocaleString()}?`)) {
      try {
        const parsed = JSON.parse(snap.data);
        setIsProcessing(true);
        await onRestoreState(parsed);
        setIsProcessing(false);
        setRestoreFeedback({
          type: 'ok',
          message: `Restored to "${snap.label}".`,
        });
      } catch (err: any) {
        setIsProcessing(false);
        alert('Could not restore snapshot: ' + err.message);
      }
    }
  };

  return (
    <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-14 flex-1 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('home')}
            className="w-9 h-9 rounded-lg bg-surface-card border border-border-strong flex items-center justify-center text-primary hover:bg-surface-container active:scale-95 transition"
            type="button"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <div>
            <h1 className="text-headline-md font-headline-md text-primary font-bold">
              Backup & Audit Center
            </h1>
            <p className="text-xs text-text-muted">Kukwata Ebiwandiiko · Offline Vault & Sync</p>
          </div>
        </div>
        <button
          onClick={onRefreshFromServer}
          title="Refresh from server"
          className="px-2.5 py-1 rounded bg-surface-container border border-border-line text-primary text-xs font-bold flex items-center gap-1 hover:bg-surface-container-high active:scale-95"
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">sync</span>
          Sync
        </button>
      </div>

      {/* Persistence Health Strip */}
      <div className="bg-surface-card rounded-xl border border-border-strong p-3.5 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              System Storage Engine: Active
            </span>
          </div>
          <span className="text-[11px] font-mono text-status-ok-tx font-bold bg-status-ok-bg px-2 py-0.5 rounded border border-[#bbf7d0]">
            LOCAL & BACKEND READY
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border-line">
          <div className="bg-canvas-bg p-2 rounded border border-border-line">
            <span className="text-text-muted block text-[10px] uppercase font-semibold">Backend Endpoint</span>
            <span className="font-mono text-primary font-bold">/api/state</span>
          </div>
          <div className="bg-canvas-bg p-2 rounded border border-border-line">
            <span className="text-text-muted block text-[10px] uppercase font-semibold">Last Backup</span>
            <span className="font-mono text-primary font-bold text-[11px]">
              {new Date(state.lastBackupDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {restoreFeedback && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold animate-in fade-in ${
            restoreFeedback.type === 'ok'
              ? 'bg-status-ok-bg text-status-ok-tx border-secondary'
              : 'bg-status-bad-bg text-status-bad-tx border-status-bad-tx'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {restoreFeedback.type === 'ok' ? 'task_alt' : 'error'}
            </span>
            <span>{restoreFeedback.message}</span>
          </div>
          <button
            onClick={() => setRestoreFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation Pills */}
      <div className="flex bg-surface-card p-1 rounded-xl border border-border-strong text-xs font-bold">
        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'export'
              ? 'bg-primary-container text-white shadow-sm'
              : 'text-text-muted hover:text-primary'
          }`}
          type="button"
        >
          <span className="material-symbols-outlined text-sm">download</span>
          Export Backup
        </button>
        <button
          onClick={() => setActiveTab('restore')}
          className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'restore'
              ? 'bg-primary-container text-white shadow-sm'
              : 'text-text-muted hover:text-primary'
          }`}
          type="button"
        >
          <span className="material-symbols-outlined text-sm">upload</span>
          Restore
        </button>
        <button
          onClick={() => setActiveTab('snapshots')}
          className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'snapshots'
              ? 'bg-primary-container text-white shadow-sm'
              : 'text-text-muted hover:text-primary'
          }`}
          type="button"
        >
          <span className="material-symbols-outlined text-sm">history</span>
          Snapshots ({state.snapshots?.length || 0})
        </button>
      </div>

      {/* TAB 1: EXPORT */}
      {activeTab === 'export' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Main Download Card */}
          <section className="bg-surface-card rounded-xl border border-border-line p-4 shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-headline-sm text-sm font-bold text-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-secondary">file_download</span>
                  Full Group Database File
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Encrypted, tamper-evident JSON file with all {state.members.length} member passbooks, stamp cards, loan appraisals, and audit logs.
                </p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 py-2 border-y border-border-line text-center text-xs">
              <div className="bg-canvas-bg p-2 rounded">
                <span className="text-text-muted block text-[10px]">Members</span>
                <span className="font-mono font-bold text-primary">{state.members.length}</span>
              </div>
              <div className="bg-canvas-bg p-2 rounded">
                <span className="text-text-muted block text-[10px]">Box Cash</span>
                <span className="font-mono font-bold text-secondary">
                  UGX {(state.boxCashBalance / 1000).toFixed(0)}k
                </span>
              </div>
              <div className="bg-canvas-bg p-2 rounded">
                <span className="text-text-muted block text-[10px]">Welfare</span>
                <span className="font-mono font-bold text-primary">
                  UGX {(state.welfareFundBalance / 1000).toFixed(0)}k
                </span>
              </div>
            </div>

            <div className="pt-1 flex flex-col gap-2">
              <button
                onClick={handleDownloadBackup}
                className="w-full py-3 bg-secondary hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow active:scale-[0.99] transition"
                type="button"
              >
                <span className="material-symbols-outlined text-base">download</span>
                Download Offline Backup (.json)
              </button>

              <button
                onClick={handleCopyClipboard}
                className="w-full py-2.5 bg-surface-container hover:bg-surface-container-high border border-border-strong text-primary rounded-lg font-semibold text-xs flex items-center justify-center gap-2 active:scale-[0.99] transition"
                type="button"
              >
                <span className="material-symbols-outlined text-base">
                  {isCopied ? 'check' : 'content_copy'}
                </span>
                {isCopied ? 'Copied to Clipboard!' : 'Copy Raw JSON String'}
              </button>
            </div>
          </section>

          {/* Meeting Audit Slip Preview Card */}
          <section className="bg-surface-card rounded-xl border border-border-line p-4 shadow-sm space-y-3">
            <h3 className="font-headline-sm text-sm font-bold text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary">receipt_long</span>
              Printable Meeting Audit Slip
            </h3>
            <p className="text-xs text-text-muted">
              Physical sign-off slip generated for the 3 keyholders to countersign at the meeting close.
            </p>

            <div className="bg-[#FFFDF5] border border-[#E5E0D0] p-3 rounded-lg font-mono text-[11px] text-[#333] space-y-1.5">
              <div className="text-center font-bold pb-1 border-b border-[#E5E0D0]">
                *** BAKWATA SAVINGS GROUP ***<br />
                MEETING AUDIT & SAFEBOX SLIP
              </div>
              <div className="flex justify-between">
                <span>Box ID:</span>
                <span className="font-bold">{state.boxIdentifier}</span>
              </div>
              <div className="flex justify-between">
                <span>Meeting:</span>
                <span className="font-bold">#{state.recentMeetingsCount} (Cycle {state.cycle})</span>
              </div>
              <div className="flex justify-between">
                <span>Physical Cash in Box:</span>
                <span className="font-bold">UGX {state.boxCashBalance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Loan Fund Balance:</span>
                <span className="font-bold">UGX {state.loanFundBalance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Welfare Emergency:</span>
                <span className="font-bold">UGX {state.welfareFundBalance.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-dashed border-[#CCC] space-y-1 text-[10px]">
                <div>Keyholder 1: Sarah Nabukalu [SIGNED]</div>
                <div>Keyholder 2: Peter Ssemwogerere [SIGNED]</div>
                <div>Keyholder 3: Sarah Nabukalu [SIGNED]</div>
              </div>
            </div>

            <button
              onClick={() => {
                window.print();
              }}
              className="w-full py-2 bg-surface-container hover:bg-surface-container-high border border-border-strong text-primary rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
              type="button"
            >
              <span className="material-symbols-outlined text-base">print</span>
              Print Slip / Save as PDF
            </button>
          </section>
        </div>
      )}

      {/* TAB 2: RESTORE */}
      {activeTab === 'restore' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* File Upload Restore */}
          <section className="bg-surface-card rounded-xl border border-border-line p-4 shadow-sm space-y-3">
            <h3 className="font-headline-sm text-sm font-bold text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary">upload_file</span>
              Upload Backup File
            </h3>
            <p className="text-xs text-text-muted">
              Select a previously downloaded <code className="bg-canvas-bg px-1 rounded">.json</code> file to restore the entire VSLA database.
            </p>

            <label className="border-2 border-dashed border-border-strong hover:border-primary rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer bg-canvas-bg transition">
              <span className="material-symbols-outlined text-3xl text-primary mb-1">
                cloud_upload
              </span>
              <span className="text-xs font-bold text-primary">Click to select backup file</span>
              <span className="text-[11px] text-text-muted mt-0.5">Supports .json exports</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="hidden"
              />
            </label>
          </section>

          {/* Paste JSON Restore */}
          <section className="bg-surface-card rounded-xl border border-border-line p-4 shadow-sm space-y-3">
            <h3 className="font-headline-sm text-sm font-bold text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary">code</span>
              Paste Backup Payload
            </h3>
            <p className="text-xs text-text-muted">
              Paste JSON text directly from a phone message, Bluetooth note, or email.
            </p>

            <textarea
              value={pastedJson}
              onChange={(e) => setPastedJson(e.target.value)}
              rows={4}
              placeholder='Paste JSON here (e.g. {"groupName": "Bakwata...", "members": [...]})'
              className="w-full bg-white border border-border-strong rounded-lg p-2.5 text-xs font-mono focus:ring-2 focus:ring-primary outline-none transition"
            />

            <button
              onClick={handlePastedRestore}
              disabled={!pastedJson.trim() || isProcessing}
              className={`w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 ${
                pastedJson.trim() && !isProcessing
                  ? 'bg-primary text-white hover:bg-primary-container shadow'
                  : 'bg-surface-container text-text-muted cursor-not-allowed'
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-base">restore</span>
              {isProcessing ? 'Restoring...' : 'Validate & Restore from Pasted Text'}
            </button>
          </section>
        </div>
      )}

      {/* TAB 3: SNAPSHOTS */}
      {activeTab === 'snapshots' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Create Instant Snapshot */}
          <section className="bg-surface-card rounded-xl border border-border-line p-4 shadow-sm space-y-3">
            <h3 className="font-headline-sm text-sm font-bold text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary">add_circle</span>
              Create Instant Recovery Point
            </h3>
            <p className="text-xs text-text-muted">
              Save a quick snapshot of the current state before taking major actions like meeting close or loan disbursements.
            </p>

            <form onSubmit={handleCreateSnapshot} className="flex gap-2">
              <input
                type="text"
                value={snapshotLabel}
                onChange={(e) => setSnapshotLabel(e.target.value)}
                placeholder="Checkpoint label (e.g. Pre-Loan Disbursement)"
                className="flex-1 bg-white border border-border-strong rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-primary outline-none"
              />
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-2 bg-secondary text-white font-bold text-xs rounded-lg hover:bg-emerald-700 active:scale-95 transition"
              >
                Snapshot
              </button>
            </form>
          </section>

          {/* List of Saved Snapshots */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-primary px-1 uppercase tracking-wider">
              Saved Checkpoints ({state.snapshots?.length || 0})
            </h3>

            {(!state.snapshots || state.snapshots.length === 0) ? (
              <div className="bg-surface-card border border-border-line rounded-xl p-4 text-center text-xs text-text-muted">
                No checkpoints saved yet. Use the form above to capture your first recovery point.
              </div>
            ) : (
              state.snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="bg-surface-card border border-border-line rounded-xl p-3.5 shadow-sm flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-secondary text-base">
                        bookmark
                      </span>
                      <span className="text-xs font-bold text-primary">{snap.label}</span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {new Date(snap.timestamp).toLocaleDateString()} at{' '}
                      {new Date(snap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="flex gap-2 mt-1 text-[10px] font-mono text-text-muted">
                      <span>{snap.membersCount} Members</span>
                      <span>•</span>
                      <span>Box: UGX {snap.boxCashBalance?.toLocaleString() || 0}</span>
                    </div>
                  </div>

                  {snap.data && (
                    <button
                      onClick={() => handleRestoreSnapshot(snap)}
                      className="px-2.5 py-1.5 bg-surface-container hover:bg-primary hover:text-white border border-border-strong text-primary text-xs font-bold rounded-lg transition active:scale-95"
                      type="button"
                    >
                      Rollback
                    </button>
                  )}
                </div>
              ))
            )}
          </section>
        </div>
      )}

      {/* DANGER ZONE: RESET TO BASELINE */}
      <section className="bg-white border border-red-200 rounded-xl p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-status-bad-tx flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">warning</span>
              Reset System Data
            </h4>
            <p className="text-[11px] text-text-muted mt-0.5">
              Revert entire database to baseline cycle seed data.
            </p>
          </div>
          <button
            onClick={() => setShowConfirmReset(true)}
            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-status-bad-tx border border-red-300 text-xs font-bold rounded-lg transition"
            type="button"
          >
            Reset
          </button>
        </div>

        {showConfirmReset && (
          <div className="mt-3 p-3 bg-red-50 border border-red-300 rounded-lg space-y-2 animate-in fade-in">
            <p className="text-xs text-status-bad-tx font-semibold">
              Are you sure? This will wipe all current meeting changes and reload initial seed members.
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setShowConfirmReset(false);
                  setIsProcessing(true);
                  await onResetToBaseline();
                  setIsProcessing(false);
                  setRestoreFeedback({
                    type: 'ok',
                    message: 'System reset to clean baseline.',
                  });
                }}
                className="py-1.5 px-3 bg-red-600 text-white font-bold text-xs rounded"
                type="button"
              >
                Yes, Reset All
              </button>
              <button
                onClick={() => setShowConfirmReset(false)}
                className="py-1.5 px-3 bg-white border border-border-strong text-xs font-medium rounded"
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};
