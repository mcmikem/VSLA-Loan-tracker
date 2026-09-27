import React, { useState } from 'react';
import { Language, Member, ScreenId, WelfareGrant } from '../types';
import { WELFARE_FAST_TRACK_CAP } from '../utils/policy';
import { AmountConfirmDialog } from '../components/AmountConfirmDialog';

interface WelfareFundViewProps {
  welfareBalance: number;
  grants: WelfareGrant[];
  categoryCaps?: { medical: number; bereavement: number; other: number };
  members?: Member[];
  /** Returns an error message when the payout is refused, null on success. */
  onDisburseGrant: (grant: WelfareGrant) => string | null;
  /** False when this officer may not pay welfare money — the button explains why. */
  canDisburseWelfare?: boolean;
  onNavigate: (screen: ScreenId) => void;
  language?: Language;
}

export const WelfareFundView: React.FC<WelfareFundViewProps> = ({
  welfareBalance,
  grants,
  categoryCaps = { medical: 150000, bereavement: 200000, other: 100000 },
  members = [],
  onDisburseGrant,
  canDisburseWelfare = true,
  onNavigate,
  language = 'EN',
}) => {
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [beneficiaryNo, setBeneficiaryNo] = useState('');
  const [grantCategory, setGrantCategory] = useState<'medical' | 'bereavement' | 'other'>('medical');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isDisbursedSuccess, setIsDisbursedSuccess] = useState(false);
  const [grantError, setGrantError] = useState<string | null>(null);

  const categoryCap = categoryCaps[grantCategory];
  const str = (en: string, lu: string) => (language === 'LU' ? lu : en);
  const paymentMethodLabel = (value: string) =>
    value === 'Cash Handover witnessed by Keyholders'
      ? str('Cash Handover witnessed by Keyholders', 'Okuyisa ssente nkalu n’abakwasi b’ebisumuluzo abakizimbe')
      : value;
  const grantDateLabel = (value: string) => (value === 'Today' ? str('Today', 'Leero') : value);
  const minutesRefLabel = (value: string) =>
    value === 'Minutes ref #M-28' ? str('Minutes ref. #M-28', 'Ebiwandiiko #M-28') : value;

  // Money out of the welfare fund: the beneficiary's name, reason and amount
  // are re-shown and the amount retyped before it is committed (M-Sente style
  // double check used for every cash handover in the app).
  const [amountCheck, setAmountCheck] = useState<{ amount: number; run: () => void } | null>(null);

  const handleDisburse = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(amount.replace(/,/g, ''), 10) || 0;
    if (!beneficiaryNo || !beneficiaryName || num <= 0 || !reason.trim()) {
      setGrantError(str('Choose a member, enter an amount, and write the reason.', 'Londa omukiise, yingiza ssente, era wandiiza ensonga.'));
      setIsDisbursedSuccess(false);
      return;
    }
    if (num > categoryCap) {
      setGrantError(str(`This category is limited to UGX ${categoryCap.toLocaleString()}. Use the approvals queue for a larger request.`, `Ekikolo kino kikweneze ku UGX ${categoryCap.toLocaleString()}. Voresa olusaba ery’okusinga obwo mu kizibu ky’ekukkiriza.`));
      setIsDisbursedSuccess(false);
      return;
    }
    setAmountCheck({ amount: num, run: () => commitGrant(num) });
  };

  const commitGrant = (num: number) => {
    const newGrant: WelfareGrant = {
      id: 'grant-' + Date.now(),
      memberNo: beneficiaryNo,
      memberName: beneficiaryName,
      reason,
      amount: num,
      paymentMethod: 'Cash Handover witnessed by Keyholders',
      date: 'Today',
      minutesRef: 'Minutes ref #M-28',
      type: grantCategory,
    };
    const err = onDisburseGrant(newGrant);
    setGrantError(err);
    setIsDisbursedSuccess(!err);
    if (!err) setTimeout(() => setIsDisbursedSuccess(false), 4000);
  };

  if (members.length === 0) {
    return (
      <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-12 flex-1 space-y-4">
        <section className="bg-surface-card border border-border-line rounded-xl p-5 text-center space-y-3">
          <span className="material-symbols-outlined text-4xl text-secondary">group_add</span>
          <h1 className="text-headline-md font-bold text-primary">{str('No members yet', 'Tewali mukiise')}</h1>
          <p className="text-sm text-text-muted">{str('Add a member before recording a welfare grant.', 'Yongera omukiise nga tannasaba okuwandiika mika y’obuyambi.')}</p>
          <button onClick={() => onNavigate('member_passbook')} className="min-h-[48px] px-5 bg-primary text-white rounded-lg font-bold" type="button">{str('Add a member', 'Yongera omukiise')}</button>
        </section>
      </main>
    );
  }

  return (
    <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-12 flex-1 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('home')}
            className="w-9 h-9 rounded-lg bg-surface-card border border-border-strong flex items-center justify-center text-primary"
            type="button"
            aria-label={str('Back to dashboard', 'Ddayo ku monyeto')}
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <div>
            <h1 className="text-headline-md font-headline-md text-primary font-bold">
              {str('Welfare Emergency Fund', 'Enkoba y’obuyambi mu buzibu')}
            </h1>
            <p className="text-xs text-text-muted">{str('Social Protection', 'Butanike n’obuyambi')}</p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded bg-status-ok-bg text-status-ok-tx text-xs font-bold font-mono">
          {str('NON-REPAYABLE', 'TEKASASULWA')}
        </span>
      </div>

      {/* Welfare Vault Balance Card */}
      <section className="bg-[#003E2B] text-white rounded-xl p-4 shadow-[0px_4px_12px_rgba(0,62,43,0.18)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-tertiary-fixed font-bold uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">health_and_safety</span>
            {str('Available Emergency Buffer', 'Ssente eziri okukwata obuzibu')}
          </span>
          <span className="text-[11px] bg-white/15 px-2 py-0.5 rounded text-white">
            UGX 2,000 / {str('member', 'mukiise')} / {str('week', 'wiiki')}
          </span>
        </div>

        <div>
          <span className="text-xs text-[#c0c8c3] block mb-0.5">{str('Physical cash in the red metal tray', 'Ssente enkalu mu ddibu lya mmaze oluyindulwa')}</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-tertiary-fixed text-lg font-bold font-mono">UGX</span>
            <span className="font-mono text-[28px] font-bold text-white tracking-tight">
              {welfareBalance.toLocaleString('en-US')}
            </span>
          </div>
        </div>

         <div className="pt-2 border-t border-white/20 text-xs text-center">
           <span className="text-[10px] text-[#c0c8c3] block">{str('Instant cash limit', 'Ekkomo ly’essente ekeseera')}</span>
           <span className="font-bold text-white font-mono">UGX {WELFARE_FAST_TRACK_CAP.toLocaleString()}</span>
           <span className="block text-[10px] text-[#c0c8c3] mt-1">{str('Larger requests go to the approvals queue.', 'Emisaba engi genda mu kizibu ky’ebisanyizo.')}</span>
         </div>
      </section>

      {/* Success Toast */}
      {isDisbursedSuccess && (
        <div className="bg-status-ok-bg border border-secondary text-status-ok-tx p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>{str('Emergency grant recorded and deducted from the welfare box!', 'Mikisa y’obuzibu yatandikidwa era yaggyulwa mu sanduuko k’obuyambi!')}</span>
        </div>
      )}

      {/* Cap refusal — route big payouts through the 2-key queue */}
      {grantError && (
        <div className="bg-status-warn-bg border border-[#FDE68A] text-status-warn-tx p-3 rounded-xl text-xs font-bold animate-in fade-in">
          {grantError}
        </div>
      )}

      {/* Request New Grant Form */}
      <form
        onSubmit={handleDisburse}
        className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-3"
      >
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm text-secondary">emergency</span>
          {str('Request Emergency Welfare Grant', 'Saba mika y’obuyambi')}
        </h3>

        {/* Member selection */}
        <div>
          <div id="welfare-beneficiary-label" className="text-xs font-semibold text-text-muted block mb-1">{str('Beneficiary Member', 'Omukiise asobola okufuna mika')}</div>
          <div className="grid grid-cols-2 gap-2 text-xs" role="group" aria-labelledby="welfare-beneficiary-label">
            {members.map((m) => (
              <button
                key={m.no}
                type="button"
                onClick={() => {
                  setBeneficiaryName(m.name);
                  setBeneficiaryNo(m.no);
                }}
                className={`p-2 rounded-lg border text-left transition ${
                  beneficiaryNo === m.no
                    ? 'bg-primary-container text-white border-primary-container'
                    : 'bg-canvas-bg text-on-surface hover:border-primary'
                }`}
              >
                <span className="font-bold block text-xs">#{m.no} {m.name}</span>
                <span className="text-[10px] opacity-80 block">{m.zone || 'Kalerwe'} · {str('Up to date', 'Yasasudde bulungi')}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <div id="welfare-category-label" className="text-xs font-semibold text-text-muted block mb-1">{str('Grant Category', 'Ekikolo ky’obuyambi')}</div>
          <div className="grid grid-cols-3 gap-2 text-xs" role="group" aria-labelledby="welfare-category-label">
            {[
               { id: 'medical', en: 'Medical / Surgery', lu: 'Ebyobulamu / Okugyawa' },
               { id: 'bereavement', en: 'Bereavement', lu: 'Mabugo' },
               { id: 'other', en: 'Disaster / Fire', lu: 'Butababukiro / Muliro' },
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setGrantCategory(c.id as any)}
                className={`p-2 rounded-lg border text-center ${
                  grantCategory === c.id
                    ? 'bg-primary-container text-white border-primary-container font-bold'
                    : 'bg-canvas-bg text-on-surface'
                }`}
              >
                <span className="block text-[11px]">{str(c.en, c.lu)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="welfare-amount" className="text-xs font-semibold text-text-muted block mb-1">{str('Grant Amount (UGX)', "Ekkano ky'obuyambi (UGX)")}</label>
          <div className="relative flex items-center rounded-lg border border-border-strong overflow-hidden">
            <span className="bg-canvas-bg px-3 py-2 text-xs font-mono font-bold text-primary border-r border-border-strong">
              UGX
            </span>
            <input
              id="welfare-amount"
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => { setAmount(e.target.value.replace(/[^\d,]/g, '')); setGrantError(null); }}
              placeholder={str('Enter amount', 'Yingiza ssente')}
              className="w-full py-2 px-3 text-sm font-mono font-bold text-primary border-0 focus:ring-0"
            />
          </div>
          <p className="text-[11px] text-text-muted mt-1">
             {str('Category limit', 'Ekkano ky\'ekigendererwa')}: UGX {categoryCap.toLocaleString()} · {str('Instant payout cap', 'Ekkano ky\'okuggwa')}: UGX {WELFARE_FAST_TRACK_CAP.toLocaleString()}{' · '}
            {str('Larger amounts go through approvals so two officers sign.', 'Ssente ezisinga obwo zigenda mu kizibu ky’ebisanyizo nga abakozesa babiri baakafowolesa emikono.')}
          </p>
        </div>

        {/* Reason */}
        <div>
          <label htmlFor="welfare-reason" className="text-xs font-semibold text-text-muted block mb-1">
            {str('Reason & Supporting Details', 'Ensonga n’amateekateeka gagwokiso')}
          </label>
          <textarea
            id="welfare-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={str('Explain why this grant is needed', 'Nyonyola lwaki mika eno ebaakyozowa')}
            rows={2}
            className="w-full py-2 px-3 text-xs bg-canvas-bg border border-border-strong rounded-lg text-primary"
          />
        </div>

        <button
          type="submit"
          disabled={!canDisburseWelfare}
          className={`w-full min-h-[48px] rounded-lg text-xs flex items-center justify-center gap-2 active:scale-95 transition ${
            canDisburseWelfare
              ? 'bg-secondary text-white font-bold'
              : 'bg-canvas-bg text-text-muted border border-border-line font-bold'
          }`}
        >
          <span className="material-symbols-outlined text-base">payments</span>
          <span>{str('Disburse Emergency Grant Now (Cash Handover)', 'Mika y’obuyambi kati (okuyisa ssente nkalu)')}</span>
        </button>
        {!canDisburseWelfare && (
          <p className="text-[11px] text-status-warn-tx bg-status-warn-bg rounded-lg p-2.5 font-bold">
            {str(
              'You are not allowed to pay welfare money. Ask the officer whose role says “can pay welfare” — they can do this in one tap.',
              'Tosobola kusula ssali n’obuyambi. Buulira omukulu wa kitundu ekisobola okusula obuyambi — ayakikola mu kiseeko kimu.'
            )}
          </p>
        )}
      </form>

      {/* Disbursed History */}
      <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] space-y-2.5">
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
          {str('Approved Grants History (Cycle 1)', 'Ebifaayo by’amikisa ezikkiriziddwa (Nziringana 1)')}
        </h3>
        <div className="space-y-2 text-xs">
          {grants.map((g) => (
            <div key={g.id} className="p-3 bg-canvas-bg rounded-lg border border-border-line space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary">
                  {g.memberName} (#{g.memberNo})
                </span>
                <span className="font-mono font-bold text-status-bad-tx">
                  -UGX {g.amount.toLocaleString('en-US')}
                </span>
              </div>
              <p className="text-text-muted text-[11px]">{g.reason}</p>
              <div className="flex justify-between pt-1 border-t border-border-line text-[10px] text-text-muted">
                <span>{grantDateLabel(g.date)} · {minutesRefLabel(g.minutesRef)}</span>
                <span className="text-secondary font-semibold">{paymentMethodLabel(g.paymentMethod)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};
