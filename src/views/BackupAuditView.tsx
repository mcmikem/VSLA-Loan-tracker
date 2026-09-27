import React, { useState } from 'react';
import { VSLAState, BackupSnapshot, Language, ScreenId } from '../types';
import { formatAuditTime } from '../utils/audit';
import { RecoverySheetModal } from '../components/RecoverySheetModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { redactBackupState } from '../utils/backupFile';

interface BackupAuditViewProps {
  state: VSLAState;
  onNavigate: (screen: ScreenId) => void;
  onRestoreState: (newState: VSLAState) => Promise<boolean>;
  onCreateSnapshot: (label: string) => Promise<void>;
  onDeleteSnapshot?: (id: string) => void;
  onResetToBaseline: () => Promise<void>;
  onRefreshFromServer: () => Promise<void>;
  isOnline?: boolean;
  isSyncing?: boolean;
  storageShared?: boolean | null;
  isPractice?: boolean;
  language?: Language;
}

/** Bytes this app holds on the phone. Cheap phones die near ~5MB. */
export function phoneStorageBytes(): { used: number; keys: number } {
  let used = 0;
  let keys = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || '';
      if (!/^(bakwata|vsla)_/.test(k)) continue;
      keys++;
      used += (localStorage.getItem(k) || '').length * 2;
    }
  } catch {
    /* storage unavailable */
  }
  return { used, keys };
}

function validateRestorePayload(data: VSLAState, current: VSLAState, language: Language): void {
  if (!data || !Array.isArray(data.members) || !Array.isArray(data.approvals)) {
    throw new Error(
      language === 'LU'
        ? 'Ebitabo bya backup tebigirimu bakiise oba ebyaliwo by’okukkiriza.'
        : 'Backup is missing members or approvals.'
    );
  }
  if (data.groupId && current.groupId && data.groupId !== current.groupId) {
    throw new Error(
      language === 'LU'
        ? 'Ebitabo bya backup biyu ekibiina ekirala.'
        : 'This backup belongs to a different group.'
    );
  }
  for (const key of ['boxCashBalance', 'loanFundBalance', 'welfareFundBalance'] as const) {
    if (data[key] !== undefined && (typeof data[key] !== 'number' || !Number.isFinite(data[key]) || data[key] < 0)) {
      throw new Error(
        language === 'LU'
          ? `Backup erina ${key} eyali onzokera.`
          : `Backup has an invalid ${key}.`
      );
    }
  }
}

export const BackupAuditView: React.FC<BackupAuditViewProps> = ({
  state,
  onNavigate,
  onRestoreState,
  onCreateSnapshot,
  onDeleteSnapshot,
  onResetToBaseline,
  onRefreshFromServer,
  isOnline = true,
  isSyncing = false,
  storageShared = null,
  isPractice = false,
  language = 'EN',
}) => {
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [pastedJson, setPastedJson] = useState('');
  const [restoreFeedback, setRestoreFeedback] = useState<{ type: 'ok' | 'err'; message: string } | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'export' | 'restore' | 'snapshots' | 'audit'>('export');
  const [isCopied, setIsCopied] = useState(false);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BackupSnapshot | null>(null);
  const str = (en: string, lu: string) => (language === 'LU' ? lu : en);
  const displayTime = (value: Date | string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    if (language === 'LU') {
      return `${date.toLocaleDateString('en-GB')}, ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  const displayDateTime = (value: Date | string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return language === 'LU'
      ? `${date.toLocaleDateString('en-GB')}, ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}`
      : date.toLocaleString();
  };
  const displayAuditTime = (value: string) => {
    if (language === 'EN') return formatAuditTime(value);
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return `${date.toLocaleDateString('en-GB')} ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  };

  // Generate downloadable JSON
  const buildBackupJson = () => {
    const backupData = {
      schemaVersion: '2.0-VSLA-OFFLINE',
      app: 'Bakwata Village Savings and Loan Association Digital Passbook',
      groupName: state.groupName,
      boxIdentifier: state.boxIdentifier,
      cycle: state.cycle,
      exportedAt: new Date().toISOString(),
      checksum: `VSLA-${Date.now().toString(36).toUpperCase()}`,
       data: redactBackupState(state),
    };
    return JSON.stringify(backupData, null, 2);
  };

  /**
   * A file in Downloads is a file nobody finds again when the phone is lost.
   * Android's share sheet can hand the actual backup file to WhatsApp, which is
   * how a secretary keeps a copy they can actually restore from.
   */
  const handleShareBackup = async () => {
    const json = buildBackupJson();
    const filename = `bakwata_vsla_backup_${new Date().toISOString().split('T')[0]}.json`;
    const payload = {
      title: str('VSLA backup', 'Kkopi y’ebitabo'),
      text: `${state.groupName || 'VSLA'} — backup ${new Date().toLocaleDateString('en-GB')}`,
    };
    try {
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean; share?: (data: ShareData) => Promise<void> };
      const file = new File([json], filename, { type: 'application/json' });
      if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
        await nav.share({ ...payload, files: [file] });
        setRestoreFeedback({
          type: 'ok',
          message: str('Backup handed to your phone to share.', 'Kkopi y’ebitabo yohereezeddwa ku ssimu yo okugaba.'),
        });
      } else {
        await navigator.clipboard?.writeText(json);
        setRestoreFeedback({
          type: 'ok',
          message: str(
            'Sharing files is not available here, so the backup was copied. Paste it into WhatsApp.',
            'Okugaba fayilo tekakiriza, nga bwe kkopi y’ebitabo. Yikate mu WhatsApp.'
          ),
        });
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return; // user closed the sheet
      setRestoreFeedback({
        type: 'err',
        message: str('Could not share. Use Download instead.', 'Tewali kikakasa ku kugaba. Kkandika ko.'),
      });
    }
    setTimeout(() => setRestoreFeedback(null), 4000);
  };

  const handleDownloadBackup = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(buildBackupJson())}`;
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
      message: str(
        'Full backup JSON downloaded successfully to your device.',
        'Backup yonna ya JSON yookedwa bulungi mu kizibu kyo.'
      ),
    });
    setTimeout(() => setRestoreFeedback(null), 4000);
  };

  const handleCopyClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(redactBackupState(state), null, 2));
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

         validateRestorePayload(dataToRestore, state, language);

        setIsProcessing(true);
        const success = await onRestoreState(dataToRestore);
        setIsProcessing(false);

        if (success) {
          setRestoreFeedback({
            type: 'ok',
            message: str(
              `Successfully restored ${dataToRestore.members.length} members and balances!`,
              `Bakiise ${dataToRestore.members.length} n’ebikomo byabwe zaaliwookelwa bulungi!`
            ),
          });
        } else {
          setRestoreFeedback({
            type: 'err',
            message: str('Failed to restore backup.', 'Zinzaawo za backup ziikwatawo kizibu.'),
          });
        }
      } catch (err: any) {
        setIsProcessing(false);
        setRestoreFeedback({
          type: 'err',
          message:
            str('Error parsing backup file: ', 'Kaliwo mu kutoolodora file ya backup: ') + (err?.message || ''),
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

       validateRestorePayload(dataToRestore, state, language);

      setIsProcessing(true);
      const success = await onRestoreState(dataToRestore);
      setIsProcessing(false);

      if (success) {
        setPastedJson('');
        setRestoreFeedback({
          type: 'ok',
          message: str(
            'System successfully restored from pasted payload!',
            'System zaaliwookelwa bulungi okuva mu payload ebaliiseddwa!'
          ),
        });
      } else {
        setRestoreFeedback({
          type: 'err',
          message: str('Server error restoring state.', 'Server yaakuwata nga tulinao zikiddwa ekitabo.'),
        });
      }
    } catch (err: any) {
      setIsProcessing(false);
      setRestoreFeedback({
        type: 'err',
        message: str('Invalid JSON payload: ', 'Payload ya JSON terungi: ') + (err?.message || ''),
      });
    }
  };

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    const label =
      snapshotLabel.trim() ||
      str(
        `Manual Checkpoint (${new Date().toLocaleTimeString()})`,
        `Kikomerwo kya munaasiki (${displayTime(new Date())})`
      );
    setIsProcessing(true);
    await onCreateSnapshot(label);
    setIsProcessing(false);
    setSnapshotLabel('');
    setRestoreFeedback({
      type: 'ok',
      message: str(`Snapshot "${label}" captured and saved.`, `Snapshot "${label}" ekakiddwa n’ekisigidwa.`),
    });
    setTimeout(() => setRestoreFeedback(null), 3500);
  };

  const handleRestoreSnapshot = async (snap: BackupSnapshot) => {
    if (!snap.data) {
      alert(
        str(
          'This seed snapshot does not have historical payload data.',
          'Snapshot eno teza nfuna payload y’edaba.'
        )
      );
      return;
    }
    if (
      confirm(
        str(
          `Restore system to snapshot "${snap.label}" from ${new Date(snap.timestamp).toLocaleString()}?`,
          `Sikika system ku snapshot "${snap.label}" okuva ku ${displayDateTime(snap.timestamp)}?`
        )
      )
    ) {
      try {
         const parsed = JSON.parse(snap.data) as VSLAState;
         validateRestorePayload(parsed, state, language);
         setIsProcessing(true);
         const success = await onRestoreState(parsed);
         setIsProcessing(false);
          setRestoreFeedback(success ? {
            type: 'ok',
            message: str(`Restored to "${snap.label}".`, `Sikiddwa ku snapshot "${snap.label}".`),
          } : {
            type: 'err',
            message: str(`Could not restore "${snap.label}".`, `Tensitwala okusikika ku snapshot "${snap.label}".`),
          });
       } catch (err: any) {
        setIsProcessing(false);
        alert(str('Could not restore snapshot: ', 'Tensitwala okusikika ku snapshot: ') + (err?.message || ''));
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
            aria-label={str('Go back', 'Ddayo')}
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_back</span>
          </button>
          <div>
            <h1 className="text-headline-md font-headline-md text-primary font-bold">
              {str('Backup & Audit Center', 'Ensukusa y’ebitabo n’okukebera')}
            </h1>
            <p className="text-xs text-text-muted">
              {str('Kukwata Ebiwandiiko · Offline Vault & Sync', 'Kulinda ebitabo · Ekisandiruzo n’okwikuza')}
            </p>
        </div>
        <button
          onClick={onRefreshFromServer}
          title={str('Refresh from server', 'Funa busula okuva ku server')}
          className="px-2.5 py-1 rounded bg-surface-container border border-border-line text-primary text-xs font-bold flex items-center gap-1 hover:bg-surface-container-high active:scale-95"
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">sync</span>
          {str('Sync', 'Wikuza')}
        </button>
      </div>
      </div>

      {/* Persistence Health Strip */}
      <div className="bg-surface-card rounded-xl border border-border-strong p-3.5 shadow-sm space-y-2.5">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
             <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-secondary' : 'bg-status-warn-tx'}`} />
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                {isSyncing
                  ? str('Syncing ledger…', 'Ekitabo kiragenda ku server…')
                  : isOnline
                    ? str('Connected', 'Wagongotanyuka')
                    : str('Offline', 'Tewali mutimbagano')}
              </span>
           </div>
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${storageShared === true ? 'text-status-ok-tx bg-status-ok-bg border-[#bbf7d0]' : 'text-status-warn-tx bg-status-warn-bg border-amber-300'}`}>
              {storageShared === true
                ? str('SHARED WITH GROUP', 'EKISANGANYIZO N’EKIBIINA')
                : str('SAVED ON THIS PHONE', 'EKIRIIRIZWA KU SSIMU ENO')}
            </span>
         </div>

         {(!isOnline || storageShared !== true) && (
            <p className="text-[11px] font-bold text-status-warn-tx bg-status-warn-bg border border-amber-200 rounded-lg p-2">
              {!isOnline
                ? str(
                    'No connection. Changes are saved on this phone until sync succeeds.',
                    'Tewali mutimbagano. Empaakanyo zino zigirizwa ku ssimu eno nga tubanga okwikuza.'
                  )
                : str(
                    'This group is not using a shared database. Other officers may not see these changes yet.',
                    'Ekibiina kino takikozesa database esanganyizwa. Abakozesa abaandi baye batakulaba yetempola.'
                  )}
            </p>
         )}
         <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border-line">
          <div className="bg-canvas-bg p-2 rounded border border-border-line">
             <span className="text-text-muted block text-[10px] uppercase font-semibold">{str('Backend Endpoint', 'Endda ya Backend')}</span>
            <span className="font-mono text-primary font-bold">/api/state</span>
          </div>
          <div className="bg-canvas-bg p-2 rounded border border-border-line">
             <span className="text-text-muted block text-[10px] uppercase font-semibold">{str('Last Backup', 'Backup y’okutoolodora')}</span>
             <span className="font-mono text-primary font-bold text-[11px]">
               {state.lastBackupDate ? displayTime(state.lastBackupDate) : str('Never', 'Tewali')}
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
             aria-label={str('Dismiss message', 'Ggya ekizibu')}
             type="button"
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
          <span className="material-symbols-outlined text-sm" aria-hidden="true">download</span>
          {str('Export Backup', 'Cunda Backup')}
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
          <span className="material-symbols-outlined text-sm" aria-hidden="true">upload</span>
          {str('Restore', 'Zikiza ebitabo')}
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
          <span className="material-symbols-outlined text-sm" aria-hidden="true">history</span>
          {str('Snapshots', 'Ebizibu zo kuzzaawo')} ({state.snapshots?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'audit'
              ? 'bg-primary-container text-white shadow-sm'
              : 'text-text-muted hover:text-primary'
          }`}
          type="button"
        >
          <span className="material-symbols-outlined text-sm" aria-hidden="true">receipt_long</span>
          {str('Audit', 'Okukebera')} ({state.auditLog?.length || 0})
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
                  <span className="material-symbols-outlined text-secondary" aria-hidden="true">file_download</span>
                  {str('Full Group Database File', 'File yonna ya database y’ekibiina')}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {str(
                    `Readable JSON copy of all ${state.members.length} member passbooks, stamp cards, loan appraisals, and audit logs. Keep it secret — anyone with this file can read the books. Not encrypted.`,
                    `Koppa ya JSON esobola okutoolooda ebitabo by'abakiise ${state.members.length}, ikadi za situma, ebizibuza by'ebbanja n'ebikiro by'okukebera. Yikize n'obuzibuza — buli amanyi a file eno asobola okusoma ebitabo. Tegafumba encrypt.`
                  )}
                </p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 py-2 border-y border-border-line text-center text-xs">
              <div className="bg-canvas-bg p-2 rounded">
                <span className="text-text-muted block text-[10px]">{str('Members', 'Abakiise')}</span>
                <span className="font-mono font-bold text-primary">{state.members.length}</span>
              </div>
              <div className="bg-canvas-bg p-2 rounded">
                <span className="text-text-muted block text-[10px]">{str('Box Cash', 'Ssente mu Kasanduuko')}</span>
                <span className="font-mono font-bold text-secondary">
                  UGX {(state.boxCashBalance / 1000).toFixed(0)}k
                </span>
              </div>
              <div className="bg-canvas-bg p-2 rounded">
                <span className="text-text-muted block text-[10px]">{str('Welfare', 'Obuyambi')}</span>
                <span className="font-mono font-bold text-primary">
                  UGX {(state.welfareFundBalance / 1000).toFixed(0)}k
                </span>
              </div>
            </div>

            <div className="pt-1 flex flex-col gap-2">
              {Math.floor((Date.now() - new Date(state.lastBackupDate).getTime()) / 86400000) >= 7 && (
                <div className="p-2.5 bg-status-warn-bg border border-[#FDE68A] rounded-lg text-[11px] text-status-warn-tx font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">schedule</span>
                  <span>
                    {str(
                      'Last backup is over a week old. Download a fresh copy below after each meeting.',
                      'Backup y’okutoolodora yali wo mwiiki nga wagendera. Doola eŋŋanzi buli lukuŋŋaana oluvannyuma lw’ekisooka.'
                    )}
                  </span>
                </div>
              )}
              <button
                onClick={handleShareBackup}
                className="w-full min-h-[52px] bg-[#DCFCE7] text-[#166534] border border-[#86efac] rounded-lg font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition"
                type="button"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">ios_share</span>
                {str('Send backup on WhatsApp', 'Sindika backup ku WhatsApp')}
              </button>
              <p className="text-[11px] text-text-muted text-center px-1">
                {str(
                  'Best for a phone: the file goes straight to your own WhatsApp, so a lost phone does not mean lost records.',
                  'Kikulu ku ssimu: fayilo agenda muntu mu WhatsApp gwo, nga ssimu ekigiddwa tebali kikulu ebitabo.'
                )}
              </p>

              <button
                onClick={handleDownloadBackup}
                className="w-full py-3 bg-secondary hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow active:scale-[0.99] transition"
                type="button"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">download</span>
                {str('Download Offline Backup (.json)', 'Koppa Backup y’ekigendererwa (.json)')}
              </button>

              <button
                onClick={() => setIsRecoveryOpen(true)}
                className="w-full py-3 bg-primary text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow active:scale-[0.99] transition"
                type="button"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">print</span>
                {language === 'LU' ? 'Kuba olupapula lw’okuzzaawo' : 'Print recovery sheet'}
              </button>

              <button
                onClick={handleCopyClipboard}
                className="w-full py-2.5 bg-surface-container hover:bg-surface-container-high border border-border-strong text-primary rounded-lg font-semibold text-xs flex items-center justify-center gap-2 active:scale-[0.99] transition"
                type="button"
              >
                <span className="material-symbols-outlined text-base">
                  {isCopied ? 'check' : 'content_copy'}
                </span>
                {isCopied ? str('Copied to Clipboard!', 'Kikozesezwa ku clipboard!') : str('Copy Raw JSON String', 'Kikopozza nkoma ya JSON')}
              </button>
            </div>
          </section>

          {/* Meeting Audit Slip Preview Card */}
          <section className="bg-surface-card rounded-xl border border-border-line p-4 shadow-sm space-y-3">
             <h3 className="font-headline-sm text-sm font-bold text-primary flex items-center gap-1.5">
               <span className="material-symbols-outlined text-primary" aria-hidden="true">receipt_long</span>
               {str('Printable Meeting Audit Slip', 'Olupapula lw’okukebera olw’okukuba')}
             </h3>
             <p className="text-xs text-text-muted">
               {str(
                 'Physical sign-off slip generated for the 3 keyholders to countersign at the meeting close.',
                 'Olupapula lw’okusigana buli ekyaliwo ku bakwasi batatu okubasiza nga olukuŋŋaana tulinna.'
               )}
             </p>

            <div className="bg-[#FFFDF5] border border-[#E5E0D0] p-3 rounded-lg font-mono text-[11px] text-[#333] space-y-1.5">
              <div className="text-center font-bold pb-1 border-b border-[#E5E0D0]">
                 *** {state.groupName || str('SAVINGS GROUP', 'EKIBIINA KY’OKUTEREKA EBY’ALOBA')} ***<br />
                {str('MEETING AUDIT & SAFEBOX SLIP', 'OLUPAPULA LW’OLUKUŊŊAANA N’OKUKEBERA')}
              </div>
              <div className="flex justify-between">
                <span>{str('Box ID:', 'Namba ya Kasanduuko:')}</span>
                <span className="font-bold">{state.boxIdentifier}</span>
              </div>
              <div className="flex justify-between">
                <span>{str('Meeting:', 'Olukuŋŋaana:')}</span>
                <span className="font-bold">
                  #{state.recentMeetingsCount} ({str('Cycle', 'Olukalu')} {state.cycle})
                </span>
              </div>
              <div className="flex justify-between">
                <span>{str('Physical Cash in Box:', 'Ssente ez’ekikoleko mu Kasanduuko:')}</span>
                <span className="font-bold">UGX {state.boxCashBalance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>{str('Loan Fund Balance:', 'Bikomo by’Ebbanja:')}</span>
                <span className="font-bold">UGX {state.loanFundBalance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>{str('Welfare Emergency:', 'Obuyambi bwa Kizibu:')}</span>
                <span className="font-bold">UGX {state.welfareFundBalance.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-dashed border-[#CCC] space-y-1 text-[10px]">
                 <div>{str('Keyholder 1:', 'Omukwasi 1:')} __________________ [ ]</div>
                 <div>{str('Keyholder 2:', 'Omukwasi 2:')} __________________ [ ]</div>
                 <div>{str('Keyholder 3:', 'Omukwasi 3:')} __________________ [ ]</div>
              </div>
            </div>

            <button
              onClick={() => {
                window.print();
              }}
              className="w-full py-2 bg-surface-container hover:bg-surface-container-high border border-border-strong text-primary rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
              type="button"
            >
               <span className="material-symbols-outlined text-base" aria-hidden="true">print</span>
               {str('Print Slip / Save as PDF', 'Kuba olupapula / Omutwana nka PDF')}
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
               <span className="material-symbols-outlined text-primary" aria-hidden="true">upload_file</span>
               {str('Upload Backup File', 'Sindika File ya Backup')}
             </h3>
             <p className="text-xs text-text-muted">
               {str('Select a previously downloaded', 'Londa file ya')}{' '}
               <code className="bg-canvas-bg px-1 rounded">.json</code>{' '}
               {str('file to restore the entire VSLA database.', 'eyakookeredwa kumala okuzzaawo database yonna ya VSLA.')}
             </p>

            <label className="border-2 border-dashed border-border-strong hover:border-primary rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer bg-canvas-bg transition">
              <span className="material-symbols-outlined text-3xl text-primary mb-1">
                cloud_upload
              </span>
               <span className="text-xs font-bold text-primary">{str('Click to select backup file', 'Kikira okulonda file ya backup')}</span>
               <span className="text-[11px] text-text-muted mt-0.5">{str('Supports .json exports', 'Emirimu emigabo ya .json')}</span>
               <input
                 type="file"
                 accept=".json,application/json"
                 onChange={handleFileUpload}
                 disabled={isProcessing}
                 aria-label={str('Backup file', 'File ya backup')}
                 className="hidden"
               />
            </label>
          </section>

          {/* Paste JSON Restore */}
          <section className="bg-surface-card rounded-xl border border-border-line p-4 shadow-sm space-y-3">
             <h3 className="font-headline-sm text-sm font-bold text-primary flex items-center gap-1.5">
               <span className="material-symbols-outlined text-primary" aria-hidden="true">code</span>
               {str('Paste Backup Payload', 'Fumba Payload ya Backup')}
             </h3>
             <p className="text-xs text-text-muted">
               {str(
                 'Paste JSON text directly from a phone message, Bluetooth note, or email.',
                 'Fumba eddoboozi la JSON muntu mu message ya ssimu, mu note ya Bluetooth, oba email.'
               )}
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
          {/* Phone storage meter — cheap phones die near ~5MB */}
          {(() => {
            const { used } = phoneStorageBytes();
            const mb = used / (1024 * 1024);
            const pct = Math.min(100, Math.round((used / (5 * 1024 * 1024)) * 100));
            const hot = mb > 3.5;
            return (
              <section className={`rounded-xl border p-3.5 ${hot ? 'bg-status-warn-bg border-[#FDE68A]' : 'bg-surface-card border-border-line'}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-bold ${hot ? 'text-status-warn-tx' : 'text-primary'}`}>
                    {language === 'LU' ? 'Data mu ssimu' : 'Phone storage'} · {mb.toFixed(1)} MB
                  </span>
                  <span className="font-mono text-text-muted">{pct}%</span>
                </div>
                <div className="w-full bg-border-line rounded-full h-2 mt-2 overflow-hidden">
                  <div className={`h-2 rounded-full ${hot ? 'bg-status-warn-tx' : 'bg-secondary'}`} style={{ width: `${Math.max(2, pct)}%` }} />
                </div>
                {hot && (
                  <p className="text-[11px] font-bold text-status-warn-tx mt-1.5">
                    {language === 'LU'
                      ? 'Kumpi kujjula — wannula backup, era sazaamu snapshots enkadde wansi.'
                      : 'Nearly full — download a backup, then delete old snapshots below.'}
                  </p>
                )}
              </section>
            );
          })()}
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
                  {onDeleteSnapshot && (
                    <button
                      onClick={() => setDeleteTarget(snap)}
                      className="px-2.5 py-1.5 bg-white border border-border-strong text-status-bad-tx text-xs font-bold rounded-lg active:scale-95"
                      type="button"
                      title="Delete snapshot to free phone storage"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))
            )}
          </section>
        </div>
      )}

      {/* TAB 4: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-2 animate-in fade-in duration-150">
          <section className="bg-surface-card rounded-xl border border-border-line p-4 shadow-sm">
            <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary">verified_user</span>
              Immutable Audit Trail
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Every cash movement, approval and waiver — stamped with officer and time. Newest first.
            </p>
          </section>
          {(!state.auditLog || state.auditLog.length === 0) ? (
            <div className="bg-surface-card border border-border-line rounded-xl p-4 text-center text-xs text-text-muted">
              No audited actions yet. Approvals, repayments, fines and payouts will appear here.
            </div>
          ) : (
            state.auditLog.map((entry) => (
              <div
                key={entry.id}
                className="bg-surface-card border border-border-line rounded-xl p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-primary">{entry.action}</p>
                    <p className="text-[11px] text-text-muted mt-0.5">{entry.details}</p>
                    <p className="text-[10px] text-text-muted mt-1 font-mono">
                      {entry.actorName} · {formatAuditTime(entry.timestamp)}
                    </p>
                  </div>
                  {typeof entry.amount === 'number' && (
                    <span className="font-mono text-xs font-bold text-secondary shrink-0">
                      UGX {entry.amount.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {isPractice && (
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
      )}

      <RecoverySheetModal
        isOpen={isRecoveryOpen}
        onClose={() => setIsRecoveryOpen(false)}
        state={state}
        language={language}
      />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={language === 'LU' ? 'Sazaamu snapshot?' : 'Delete snapshot?'}
        body={
          deleteTarget
            ? language === 'LU'
              ? `"${deleteTarget.label}" ejja kusazibwamu. Ebitabo ebiriwo tebikwatibwako.`
              : `Delete "${deleteTarget.label}"? The live books stay untouched.`
            : ''
        }
        confirmLabel={language === 'LU' ? 'Yee, sazaamu' : 'Yes, delete it'}
        language={language}
        danger
        onConfirm={() => {
          if (deleteTarget && onDeleteSnapshot) onDeleteSnapshot(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </main>
  );
};
