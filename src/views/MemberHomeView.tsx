import React from 'react';
import { ApprovalItem, Language, Member, ScreenId, ShopProduct } from '../types';
import { MemberAvatar } from '../components/MemberAvatar';
import { KeyStepper } from '../components/KeyStepper';
import { buildBalanceSnapshot, smsHref, waHref } from '../utils/smsReminders';
import { SpeakButton } from '../components/SpeakButton';
import { speakableAmount } from '../utils/speech';

interface MemberHomeViewProps {
  member: Member;
  requests: ApprovalItem[];
  memberBusinesses: ShopProduct[];
  groupName?: string;
  language?: Language;
  onNavigate: (screen: ScreenId) => void;
  /** Officers' group home — members see this only via a quiet link. */
  onOpenGroupHome?: () => void;
}

/**
 * Member-first home: my savings, my loan position, my requests with
 * approval status, and my neighbours' businesses to buy from.
 * This is the screen a member sees on their OWN phone.
 */
export const MemberHomeView: React.FC<MemberHomeViewProps> = ({
  member,
  requests,
  memberBusinesses,
  groupName = 'Savings Group',
  language = 'EN',
  onNavigate,
  onOpenGroupHome,
}) => {
  const str = (en: string, lu: string) => (language === 'LU' ? lu : en);
  const eligible = member.loanBalance > 0 ? 0 : Math.max(0, member.maxBorrowLimit || 0);
  const mine = memberBusinesses.filter((p) => p.sellerName === member.name);
  const others = memberBusinesses.filter((p) => p.sellerName !== member.name);

  const buyText = (p: ShopProduct) =>
    language === 'LU'
      ? `Gyoli ${p.sellerName || ''}, nze ${member.name} wa ${groupName}. Njagala okugula ${p.name} ku UGX ${p.salePrice.toLocaleString()}. Ekyaliwo?`
      : `Hi ${p.sellerName || 'there'}, I'm ${member.name} from ${groupName}. I'd like to buy ${p.name} at UGX ${p.salePrice.toLocaleString()}. Still available?`;

  // The member's own record, in a message they can forward to anyone.
  const myRecord = buildBalanceSnapshot(
    {
      id: member.id,
      no: member.no,
      name: member.name,
      phone: member.phone,
      loanBalance: member.loanBalance,
      sharesTotal: member.sharesTotal,
      welfareBalance: member.welfareBalance,
    },
    { groupName, lang: language }
  );

  const businessCard = (p: ShopProduct) => (
    <div key={p.id} className="p-3 bg-canvas-bg rounded-lg border border-border-line space-y-1.5">
      <div className="flex items-start gap-3">
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-[#E8F5EE] text-[#006d30] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined">storefront</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 flex-1 min-w-0">
        <p className="text-xs font-bold text-primary truncate">
          {p.name}
          {p.kind === 'service' && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">SERVICE</span>
          )}
        </p>
        <p className="font-mono text-xs font-bold shrink-0">UGX {p.salePrice.toLocaleString()}/{p.unit}</p>
       </div>
       </div>
       <p className="text-xs text-text-muted">
        {p.sellerName || str('A fellow member', 'Omukiise munno')} · {str('Stock:', 'Zisigadde:')} {p.stockQty}
        {p.sellerName === member.name && <span className="ml-1.5 font-bold text-secondary">· {str('Yours', 'Ekyo')}</span>}
      </p>
      {p.sellerName !== member.name && !!p.sellerPhone && p.stockQty > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          <a
            href={smsHref(p.sellerPhone || '', buyText(p))}
            className="py-2 bg-primary-container text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">sms</span> {str('Ask to buy', 'Gula')}
          </a>
          <a
            href={waHref(p.sellerPhone || '', buyText(p))}
            target="_blank"
            rel="noreferrer"
            className="py-2 bg-secondary text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">chat</span> WhatsApp
          </a>
        </div>
      )}
    </div>
  );

  return (
    <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-14 flex-1 space-y-4">
      <div className="flex items-center gap-3">
        <MemberAvatar name={member.name} initials={member.initials} photoUrl={member.photoUrl} sizeClass="w-12 h-12 text-sm" />
        <div className="min-w-0 flex-1">
          <h1 className="font-bold text-primary truncate">
            {str('Hi', 'Gyoli')} {member.name.split(' ')[0]}!
          </h1>
          <p className="text-xs text-text-muted truncate">
            {groupName} · #{member.no}
          </p>
        </div>
        {onOpenGroupHome && (
          <button
            type="button"
            onClick={onOpenGroupHome}
            className="text-xs font-bold text-text-muted underline shrink-0"
          >
            {str('Group home →', 'Ekibiina →')}
          </button>
        )}
      </div>

      {/* My savings */}
      <section className="bg-primary-container text-white rounded-xl p-4 shadow-sm">
        <p className="text-xs text-primary-fixed uppercase tracking-wider font-semibold">{str('My savings', 'Enterekanya yange')}</p>
        <p className="font-mono text-3xl font-bold">UGX {member.sharesTotal.toLocaleString()}</p>
        <p className="text-xs text-primary-fixed mt-0.5">
          {member.sharesCount} {str('shares', 'emigabo')} · {str('can borrow up to', 'nsobola okuwewola')} <span className="font-mono font-bold">UGX {eligible.toLocaleString()}</span>
        </p>
        <SpeakButton
          tone="dark"
          className="mt-2.5"
          label={str('Read aloud', 'Soma')}
          text={`My savings: ${speakableAmount(member.sharesTotal)} shillings. I can borrow up to ${speakableAmount(eligible)} shillings.`}
        />
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            type="button"
            onClick={() => onNavigate('member_passbook')}
            className="py-2.5 bg-white/15 border border-white/30 rounded-lg font-bold text-xs active:scale-95"
          >
            {str('My passbook', 'Ppaasibuku yange')}
          </button>
          <button
            type="button"
             onClick={() => onNavigate(member.loanBalance > 0 ? 'member_passbook' : 'new_loan')}
            className="py-2.5 bg-[#EAB308] text-[#00261b] rounded-lg font-bold text-xs active:scale-95"
          >
            {member.loanBalance > 0
              ? `${str('Owe', 'Obbanja')} UGX ${member.loanBalance.toLocaleString()}`
              : str('Request a loan', 'Saba Ekyewolo')}
          </button>
        </div>
      </section>

      {/* Proof, not promises: the member can send their own record to whoever
          needs to see it. This is the whole point of a savings group. */}
      <section className="bg-surface-card border border-border-strong rounded-xl p-3.5 space-y-2">
        <h3 className="text-xs font-bold text-primary flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">verified_user</span>
          {str('Show my record to anyone', 'Egolokola olufuumbe lwange')}
        </h3>
        <p className="text-[11px] text-text-muted">
          {str(
            'Sends your savings, loan and welfare in one message. Use it when someone asks how much you have saved.',
            'Kitumiza enterekanya, ebbanja n’obuyambi bwo wera. Bweeba nga abuuza ewedde wobutadde.'
          )}
        </p>
        <div className="flex gap-2">
          <a
            href={smsHref(member.phone, myRecord)}
            className="flex-1 min-h-[48px] rounded-xl bg-primary text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-[0.99]"
          >
            <span className="material-symbols-outlined text-[18px]">sms</span>
            SMS
          </a>
          <a
            href={waHref(member.phone, myRecord)}
            className="flex-1 min-h-[48px] rounded-xl bg-[#DCFCE7] text-[#166534] border border-[#86efac] font-bold text-xs flex items-center justify-center gap-1.5 active:scale-[0.99]"
          >
            <span className="material-symbols-outlined text-[18px]">chat</span>
            WhatsApp
          </a>
        </div>
      </section>

      {/* My requests + approval tracking */}
      <section className="bg-surface-card border border-border-line rounded-xl p-4 space-y-2">
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
           {str('My requests', 'Ebik requests byange')} ({requests.length})
        </h3>
        {requests.length === 0 ? (
          <p className="text-xs text-text-muted">{str('No requests yet. Tap “Request a loan” above.', 'Tonnasaba. Nyiga “Saba Ekyewolo” waggulu.')}</p>
        ) : (
          requests.slice(0, 5).map((r) => (
            <div key={r.id} className="p-2.5 bg-canvas-bg rounded-lg border border-border-line space-y-1.5">
               <p className="text-xs font-bold font-mono">UGX {r.amount.toLocaleString()} · {r.reqNumber}</p>
               <p className="text-[10px] text-text-muted">{r.type === 'vsla_loan' ? str('Loan', 'Ebanja') : r.type === 'welfare_grant' ? str('Welfare', 'Obuyambi') : str('Savings withdrawal', 'Kuggwa k\'emigabo')}</p>
              <KeyStepper
                firstBy={r.firstApprovedBy}
                decided={r.status === 'approved'}
                language={language}
                compact
              />
              {r.status !== 'pending' && (
                <p className="text-xs text-text-muted truncate">
                   {r.status === 'approved'
                     ? r.payoutStatus === 'confirmed'
                       ? `${str('Paid', 'Eggulwa')}${r.decidedBy ? ` · ${r.decidedBy}` : ''}`
                       : `${str('Approved — waiting for payment confirmation', 'Kyakkiriziddwa — tulindiriza okukakata nsimbi')}`
                     : `${str('Rejected', 'Kyagaaniddwa')}${r.rejectReason ? ` — ${r.rejectReason}` : ''}`}
                </p>
              )}
            </div>
          ))
        )}
      </section>

      {/* Neighbours' ventures — the gold */}
      <section className="bg-surface-card border border-border-line rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
            {str('Buy from each other', 'Tundanagane')} ({memberBusinesses.length})
          </h3>
          <button type="button" onClick={() => onNavigate('shop')} className="text-xs font-bold text-secondary underline">
            {str('Open shop →', 'Ggulawo kaduuka →')}
          </button>
        </div>
        {memberBusinesses.length === 0 ? (
          <p className="text-xs text-text-muted">
            {str('No businesses listed yet. List yours in the shop so neighbours can buy from you.', 'Tewali bizinesi. Wandiisa eyo mu kaduuka abakiise bakuguleko.')}
          </p>
        ) : (
          <>
            {mine.map(businessCard)}
            {others.map(businessCard)}
          </>
        )}
      </section>
    </main>
  );
};
