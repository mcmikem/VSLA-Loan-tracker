import React from 'react';
import { ApprovalItem, Language, Member, ScreenId, ShopProduct } from '../types';
import { MemberAvatar } from '../components/MemberAvatar';
import { KeyStepper } from '../components/KeyStepper';
import { smsHref, waHref } from '../utils/smsReminders';

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
  const eligible = Math.max(0, (member.maxBorrowLimit || 0) - (member.loanBalance || 0));
  const mine = memberBusinesses.filter((p) => p.sellerName === member.name);
  const others = memberBusinesses.filter((p) => p.sellerName !== member.name);

  const buyText = (p: ShopProduct) =>
    language === 'LU'
      ? `Gyoli ${p.sellerName || ''}, nze ${member.name} wa ${groupName}. Njagala okugula ${p.name} ku UGX ${p.salePrice.toLocaleString()}. Ekyaliwo?`
      : `Hi ${p.sellerName || 'there'}, I'm ${member.name} from ${groupName}. I'd like to buy ${p.name} at UGX ${p.salePrice.toLocaleString()}. Still available?`;

  const businessCard = (p: ShopProduct) => (
    <div key={p.id} className="p-3 bg-canvas-bg rounded-lg border border-border-line space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-primary truncate">
          {p.name}
          {p.kind === 'service' && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">SERVICE</span>
          )}
        </p>
        <p className="font-mono text-xs font-bold shrink-0">UGX {p.salePrice.toLocaleString()}/{p.unit}</p>
      </div>
      <p className="text-xs text-text-muted">
        {p.sellerName || str('A fellow member', 'Omukiise munno')} · {str('Stock:', 'Zisigadde:')} {p.stockQty}
        {p.sellerName === member.name && <span className="ml-1.5 font-bold text-secondary">· {str('Yours', 'Ekyo')}</span>}
      </p>
      {p.sellerName !== member.name && p.stockQty > 0 && (
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
            onClick={() => onNavigate('new_loan')}
            className="py-2.5 bg-[#EAB308] text-[#00261b] rounded-lg font-bold text-xs active:scale-95"
          >
            {member.loanBalance > 0
              ? `${str('Owe', 'Obbanja')} UGX ${member.loanBalance.toLocaleString()}`
              : str('Request a loan', 'Saba Ekyewolo')}
          </button>
        </div>
      </section>

      {/* My requests + approval tracking */}
      <section className="bg-surface-card border border-border-line rounded-xl p-4 space-y-2">
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
          {str('My loan requests', 'Ebyewolo byange')} ({requests.length})
        </h3>
        {requests.length === 0 ? (
          <p className="text-xs text-text-muted">{str('No requests yet. Tap “Request a loan” above.', 'Tonnasaba. Nyiga “Saba Ekyewolo” waggulu.')}</p>
        ) : (
          requests.slice(0, 5).map((r) => (
            <div key={r.id} className="p-2.5 bg-canvas-bg rounded-lg border border-border-line space-y-1.5">
              <p className="text-xs font-bold font-mono">UGX {r.amount.toLocaleString()} · {r.reqNumber}</p>
              <KeyStepper
                firstBy={r.firstApprovedBy}
                decided={r.status === 'approved'}
                language={language}
                compact
              />
              {r.status !== 'pending' && (
                <p className="text-xs text-text-muted truncate">
                  {r.status === 'approved'
                    ? `${str('Approved', 'Kyakkiriziddwa')} ${r.decidedBy ? `· ${r.decidedBy}` : ''}`
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
