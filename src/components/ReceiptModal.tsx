import React from 'react';

export interface ReceiptData {
  kind: 'repayment' | 'shares';
  refNo: string;
  date: string;
  memberName: string;
  memberNo: string;
  amount: number;
  extraLine: string;
  issuerName: string;
  groupName: string;
  boxIdentifier: string;
}

interface ReceiptModalProps {
  receipt: ReceiptData | null;
  onClose: () => void;
}

/**
 * Upgrade #8 — printable transaction receipts.
 * Shows a cash receipt after repayments / share purchases with a
 * print button (print CSS isolates the receipt on paper).
 */
export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onClose }) => {
  if (!receipt) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-4 no-print" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Printable receipt body */}
        <div className="print-area p-6 text-[#141b2b]">
          <div className="text-center border-b-2 border-dashed border-[#CBD5E1] pb-3">
            <p className="font-bold text-sm">{receipt.groupName}</p>
            <p className="text-[11px] font-mono text-[#4B5563]">{receipt.boxIdentifier}</p>
            <p className="text-xs font-bold mt-1 uppercase tracking-wider">
              {receipt.kind === 'repayment' ? 'Loan Repayment Receipt' : 'Share Purchase Receipt'}
            </p>
          </div>
          <div className="py-3 space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-[#4B5563]">Receipt No</span><span className="font-mono font-bold">{receipt.refNo}</span></div>
            <div className="flex justify-between"><span className="text-[#4B5563]">Date</span><span className="font-semibold">{receipt.date}</span></div>
            <div className="flex justify-between"><span className="text-[#4B5563]">Member</span><span className="font-semibold">{receipt.memberName} (#{receipt.memberNo})</span></div>
            <div className="flex justify-between"><span className="text-[#4B5563]">Details</span><span className="font-semibold text-right max-w-[60%]">{receipt.extraLine}</span></div>
            <div className="flex justify-between text-sm pt-2 border-t border-[#E5E7EB]">
              <span className="font-bold">AMOUNT</span>
              <span className="font-mono font-bold">UGX {receipt.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between"><span className="text-[#4B5563]">Received by</span><span className="font-semibold">{receipt.issuerName}</span></div>
          </div>
          <p className="text-center text-[10px] text-[#4B5563] border-t-2 border-dashed border-[#CBD5E1] pt-2">
            Keep this receipt with your passbook · Kuuma risiti eno ne ppaasibuku yo
          </p>
        </div>
        {/* Screen-only actions */}
        <div className="p-4 pt-0 flex gap-2 no-print">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 min-h-[48px] bg-[#00261b] text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            Print
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[48px] bg-[#F6F7F6] border border-[#E5E7EB] rounded-lg font-bold text-sm active:scale-[0.99]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
