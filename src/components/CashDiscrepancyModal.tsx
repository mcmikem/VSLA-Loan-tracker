import React, { useState } from 'react';

interface CashDiscrepancyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyAdjustment: (amount: number, reason: string, method: string) => void;
}

export const CashDiscrepancyModal: React.FC<CashDiscrepancyModalProps> = ({
  isOpen,
  onClose,
  onApplyAdjustment,
}) => {
  const [discrepancyType, setDiscrepancyType] = useState<'shortage' | 'surplus'>('shortage');
  const [selectedReason, setSelectedReason] = useState('Incorrect Note Count');
  const [customReasonText, setCustomReasonText] = useState(
    'Cashier physical counting error: 1x 20,000 note and 1x 10,000 note double-checked under tray.'
  );
  const [adjustmentAmount, setAdjustmentAmount] = useState('30,000');
  const [resolutionMethod, setResolutionMethod] = useState('welfare');
  const [keyholder3Signed, setKeyholder3Signed] = useState(true);

  if (!isOpen) return null;

  const handleApply = () => {
    const numAmount = parseInt(adjustmentAmount.replace(/,/g, ''), 10) || 30000;
    onApplyAdjustment(numAmount, selectedReason + ': ' + customReasonText, resolutionMethod);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#00261b]/80 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Modal Bottom Sheet */}
      <section className="relative z-50 w-full max-w-lg bg-surface-card rounded-t-[20px] border-t-2 border-x border-primary-container shadow-[0px_-4px_24px_rgba(0,0,0,0.22)] max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header with drag bar */}
        <div className="pt-3 px-4 pb-3 border-b border-border-line sticky top-0 bg-surface-card z-20">
          <div className="w-12 h-1.5 bg-border-strong rounded-full mx-auto mb-3" />
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-status-bad-tx inline-block" />
                <h2 className="text-headline-sm font-headline-sm font-bold text-primary tracking-tight">
                  Reconcile Cash Discrepancy
                </h2>
              </div>
              <p className="text-label-sm font-label-sm text-text-muted font-medium mt-0.5">
                Golola Enjawukana y'Essente
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface-container text-primary font-mono text-[11px] font-semibold border border-border-line">
                  Meeting #28 · Box Reconciliation #REC-28-09
                </span>
              </div>
            </div>

            <button
              aria-label="Close modal"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] -mr-2 -mt-1 flex items-center justify-center rounded-lg text-text-muted hover:text-primary hover:bg-surface-container active:scale-95 transition-all"
              type="button"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-4 py-4 space-y-4 flex-1">
          {/* Discrepancy Mode Pill */}
          <div className="bg-canvas-bg rounded-xl border border-border-line p-3.5 space-y-3 shadow-[0px_1px_3px_rgba(0,0,0,0.06)]">
            <div className="flex bg-surface-card p-1 rounded-lg border border-border-strong text-center">
              <button
                onClick={() => setDiscrepancyType('shortage')}
                className={`flex-1 py-1.5 px-2 rounded-md text-label-sm font-label-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                  discrepancyType === 'shortage'
                    ? 'bg-status-bad-bg border border-status-bad-tx text-status-bad-tx shadow-sm'
                    : 'text-text-muted hover:text-on-surface'
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-sm">warning</span>
                <span>Shortage (-30,000 UGX)</span>
              </button>
              <button
                onClick={() => setDiscrepancyType('surplus')}
                className={`flex-1 py-1.5 px-2 rounded-md text-label-sm font-label-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                  discrepancyType === 'surplus'
                    ? 'bg-status-ok-bg border border-secondary text-status-ok-tx shadow-sm'
                    : 'text-text-muted hover:text-on-surface'
                }`}
                type="button"
              >
                <span>Surplus / Excess (+UGX)</span>
              </button>
            </div>

            {/* Split Columns */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Expected */}
              <div className="bg-surface-card p-3 rounded-lg border border-border-line flex flex-col justify-between">
                <div>
                  <span className="text-label-sm font-label-sm font-semibold text-text-muted block">
                    Expected in Box
                  </span>
                  <span className="text-[11px] text-text-muted">Ebyabalirwa</span>
                </div>
                <div className="my-2">
                  <span className="text-headline-sm font-currency-lg font-bold text-primary block tracking-tight">
                    UGX 1,420,000
                  </span>
                </div>
                <div className="border-t border-border-line pt-1.5 space-y-1 text-[11px] text-text-muted font-mono">
                  <div className="flex justify-between">
                    <span>Shares</span>
                    <span className="font-medium text-primary">480,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Welfare</span>
                    <span className="font-medium text-primary">150,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Loans Repaid</span>
                    <span className="font-medium text-primary">720,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Late Fines</span>
                    <span className="font-medium text-primary">70,000</span>
                  </div>
                </div>
              </div>

              {/* Counted */}
              <div className="bg-surface-card p-3 rounded-lg border-2 border-primary-container flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary-container text-white text-[9px] font-bold px-1.5 py-0.5 rounded-bl">
                  PHYSICAL
                </div>
                <div>
                  <span className="text-label-sm font-label-sm font-bold text-primary block">
                    Counted in Box
                  </span>
                  <span className="text-[11px] text-text-muted">Ebiri mu Sanduuko</span>
                </div>
                <div className="my-2">
                  <span className="text-headline-sm font-currency-lg font-bold text-status-bad-tx block tracking-tight">
                    UGX 1,390,000
                  </span>
                </div>
                <div className="border-t border-border-line pt-1.5 space-y-1 text-[11px] text-text-muted font-mono">
                  <div className="flex justify-between">
                    <span>Banknotes (46)</span>
                    <span className="font-medium text-primary">1,370,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Coins in Bag</span>
                    <span className="font-medium text-primary">20,000</span>
                  </div>
                  <div className="flex justify-between text-status-bad-tx font-bold pt-1 border-t border-dashed border-border-line">
                    <span>Difference</span>
                    <span>-30,000</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Shortage Alert */}
            <div className="bg-status-bad-bg border border-status-bad-tx/40 rounded-lg p-3 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-status-bad-tx text-xl shrink-0 mt-0.5">
                warning
              </span>
              <div className="flex-1">
                <p className="text-label-md font-label-md font-bold text-status-bad-tx">
                  Cash Shortage Detected: -UGX 30,000
                </p>
                <p className="text-[12px] text-status-bad-tx/90 mt-0.5 leading-relaxed">
                  Ssente zibulako: Physical notes in the metal box are UGX 30,000 less than calculated meeting transactions.
                </p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Reason */}
            <div>
              <label className="block text-label-md font-label-md font-semibold text-primary mb-1.5">
                Reason for Discrepancy <span className="text-text-muted font-normal text-xs">(Ensonga y'Enjawukana)</span>
              </label>

              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {[
                  'Incorrect Note Count',
                  'MoMo Cashout Float Error',
                  'Unrecorded Late Fine (-2,000)',
                  'Missing Share Entry',
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedReason(reason)}
                    className={`min-h-[44px] px-3 py-2 shrink-0 rounded-lg text-label-sm font-label-sm font-medium flex items-center gap-1.5 border active:scale-95 transition-all ${
                      selectedReason === reason
                        ? 'bg-primary-container text-white border-primary-container'
                        : 'bg-surface-card hover:bg-surface-container text-on-surface border-border-strong'
                    }`}
                  >
                    {selectedReason === reason && (
                      <span className="material-symbols-outlined text-sm">check</span>
                    )}
                    <span>{reason}</span>
                  </button>
                ))}
              </div>

              <textarea
                value={customReasonText}
                onChange={(e) => setCustomReasonText(e.target.value)}
                className="w-full mt-1 rounded-lg border border-border-strong bg-surface-card px-3.5 py-2.5 text-body-sm text-on-surface focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition leading-snug"
                rows={2}
              />
            </div>

            {/* Adjustment Amount */}
            <div>
              <label className="block text-label-md font-label-md font-semibold text-primary mb-1.5">
                Adjustment Amount <span className="text-text-muted font-normal text-xs">(Omuwendo Ogugololwa)</span>
              </label>
              <div className="relative flex items-stretch rounded-lg border-2 border-primary-container shadow-sm bg-surface-card overflow-hidden">
                <div className="bg-surface-container px-3.5 flex items-center justify-center border-r border-border-strong">
                  <span className="text-label-md font-mono font-bold text-primary">UGX</span>
                </div>
                <input
                  type="text"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  className="w-full py-2.5 px-3 text-headline-lg font-mono text-primary bg-surface-card border-0 focus:ring-0 tracking-tight"
                />
                <div className="flex items-center pr-3 text-text-muted">
                  <span className="text-label-sm font-mono font-semibold bg-status-ok-bg text-status-ok-tx px-2 py-1 rounded">
                    MATCH
                  </span>
                </div>
              </div>
              <p className="text-body-sm text-text-muted mt-1.5 text-[12px] flex items-center gap-1">
                <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
                <span>Adjusts box ledger to zero difference. Final balanced cash: UGX 1,390,000.</span>
              </p>
            </div>

            {/* Resolution Action Method */}
            <div>
              <label className="block text-label-md font-label-md font-semibold text-primary mb-2">
                Resolution Action Method <span className="text-text-muted font-normal text-xs">(Ensonga y'Okugolola)</span>
              </label>
              <div className="space-y-2">
                <label
                  onClick={() => setResolutionMethod('welfare')}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                    resolutionMethod === 'welfare'
                      ? 'border-primary-container bg-surface-card shadow-sm'
                      : 'border-border-strong bg-surface-card hover:bg-surface-container/30'
                  }`}
                >
                  <input
                    type="radio"
                    checked={resolutionMethod === 'welfare'}
                    onChange={() => setResolutionMethod('welfare')}
                    className="mt-1 h-4 w-4 text-primary-container focus:ring-primary-container"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-label-md font-label-md font-bold text-primary">
                        Write-off to Welfare Emergency Buffer
                      </span>
                      <span className="text-label-sm bg-status-ok-bg text-status-ok-tx font-bold px-1.5 py-0.5 rounded text-[10px]">
                        APPROVED
                      </span>
                    </div>
                    <p className="text-[12px] text-text-muted mt-0.5">
                      Permitted for minor variances &lt; 50k UGX. Deducts from welfare surplus pot.
                    </p>
                  </div>
                </label>

                <label
                  onClick={() => setResolutionMethod('treasurer')}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                    resolutionMethod === 'treasurer'
                      ? 'border-primary-container bg-surface-card shadow-sm'
                      : 'border-border-strong bg-surface-card hover:bg-surface-container/30'
                  }`}
                >
                  <input
                    type="radio"
                    checked={resolutionMethod === 'treasurer'}
                    onChange={() => setResolutionMethod('treasurer')}
                    className="mt-1 h-4 w-4 text-primary-container focus:ring-primary-container"
                  />
                  <div className="flex-1">
                    <span className="text-label-md font-label-md font-semibold text-primary">
                      Treasurer / Cashier to Cover Shortage Immediately
                    </span>
                    <p className="text-[12px] text-text-muted mt-0.5">
                      Official deposits personal replacement cash (UGX 30,000) into box before locking.
                    </p>
                  </div>
                </label>

                <label
                  onClick={() => setResolutionMethod('hold')}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                    resolutionMethod === 'hold'
                      ? 'border-primary-container bg-surface-card shadow-sm'
                      : 'border-border-strong bg-surface-card hover:bg-surface-container/30'
                  }`}
                >
                  <input
                    type="radio"
                    checked={resolutionMethod === 'hold'}
                    onChange={() => setResolutionMethod('hold')}
                    className="mt-1 h-4 w-4 text-primary-container focus:ring-primary-container"
                  />
                  <div className="flex-1">
                    <span className="text-label-md font-label-md font-semibold text-primary">
                      Hold Discrepancy to Meeting #29 Audit
                    </span>
                    <p className="text-[12px] text-text-muted mt-0.5">
                      Locks ledger with unverified variance note. Flags executive committee review.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* 3-Keyholder Witness */}
            <div className="bg-surface-card rounded-xl border-2 border-border-line p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-border-line pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-sm">vpn_key</span>
                  <h3 className="text-label-md font-label-md font-bold text-primary">
                    3-Keyholder Physical Witness Sign-Off
                  </h3>
                </div>
                <span className="text-label-sm font-mono font-semibold text-secondary">
                  {keyholder3Signed ? '3 / 3 Signed' : '2 / 3 Signed'}
                </span>
              </div>
              <p className="text-[12px] text-text-muted">
                Ugandan VSLA constitution mandates all 3 padlock keyholders visually verify box balance adjustments before committing.
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-status-ok-bg/60 border border-secondary/30">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center text-xs font-bold">
                      ✓
                    </div>
                    <div>
                      <span className="text-label-sm font-label-sm font-bold text-primary block">
                        Keyholder 1: Sarah Nabukalu
                      </span>
                      <span className="text-[11px] text-text-muted font-mono">
                        Padlock Key #1 · Verified 11:51 AM
                      </span>
                    </div>
                  </div>
                  <span className="text-label-sm font-label-sm font-bold text-secondary">
                    WITNESSED
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-status-ok-bg/60 border border-secondary/30">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center text-xs font-bold">
                      ✓
                    </div>
                    <div>
                      <span className="text-label-sm font-label-sm font-bold text-primary block">
                        Keyholder 2: Grace Akello
                      </span>
                      <span className="text-[11px] text-text-muted font-mono">
                        Padlock Key #2 · Verified 11:52 AM
                      </span>
                    </div>
                  </div>
                  <span className="text-label-sm font-label-sm font-bold text-secondary">
                    WITNESSED
                  </span>
                </div>

                <label className="flex items-center justify-between p-2 rounded-lg bg-surface-container border border-primary-container/40 cursor-pointer hover:bg-surface-container-high transition min-h-[44px]">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={keyholder3Signed}
                      onChange={(e) => setKeyholder3Signed(e.target.checked)}
                      className="h-5 w-5 rounded text-primary-container focus:ring-primary-container border-border-strong"
                    />
                    <div>
                      <span className="text-label-sm font-label-sm font-bold text-primary block">
                        Keyholder 3: Peter Ssemwogerere
                      </span>
                      <span className="text-[11px] text-text-muted font-mono">
                        Padlock Key #3 · Tap to witness & verify
                      </span>
                    </div>
                  </div>
                  <span className="text-label-sm font-label-sm font-bold text-primary-container bg-primary-fixed px-2 py-0.5 rounded">
                    {keyholder3Signed ? 'SIGNED' : 'READY'}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Modal Actions Footer */}
        <div className="p-4 border-t border-border-line bg-surface-card space-y-2.5 rounded-b-[20px]">
          <button
            onClick={handleApply}
            className="w-full min-h-[52px] px-4 py-3 bg-[#15803D] hover:bg-[#0B3D2E] active:scale-[0.98] text-white rounded-xl font-label-md font-bold flex items-center justify-center gap-2 shadow-md transition-all"
            type="button"
          >
            <span className="material-symbols-outlined text-lg">check</span>
            <span>Apply Adjustment & Balance Box (UGX 0 Diff)</span>
          </button>

          <button
            onClick={onClose}
            className="w-full min-h-[48px] px-4 py-2.5 bg-surface-card hover:bg-surface-container active:bg-surface-container-high border border-border-strong text-primary rounded-xl font-label-md font-semibold flex items-center justify-center gap-2 transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-lg text-text-muted">restart_alt</span>
            <span>Recount Physical Cash Again</span>
          </button>
        </div>
      </section>
    </div>
  );
};
