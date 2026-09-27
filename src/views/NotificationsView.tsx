import React from 'react';
import type { AppNotification, Language, ScreenId, UserAccount } from '../types';

interface NotificationsViewProps {
  notifications: AppNotification[];
  currentUser: UserAccount;
  language: Language;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onOpen: (notification?: AppNotification) => void;
}

const iconFor = (kind: AppNotification['kind']): string => {
  if (kind === 'loan_request' || kind === 'welfare') return 'request_quote';
  if (kind === 'approval_code') return 'sms';
  if (kind === 'payout') return 'payments';
  if (kind === 'rejection') return 'cancel';
  return 'verified_user';
};

const labelFor = (kind: AppNotification['kind'], language: Language): string => {
  if (language === 'LU') {
    if (kind === 'loan_request') return 'Ebisanyizo by\'ekyewolo';
    if (kind === 'welfare') return 'Ebisanyizo by\'obuyambi';
    if (kind === 'approval_code') return 'Koodi y\'okukkiriza';
    if (kind === 'payout') return 'Kuzingo kukikwatala';
    if (kind === 'rejection') return 'Okusaba kuganyiddwa';
    return 'Ebisanyizo by\'okukkiriza';
  }
  if (kind === 'loan_request') return 'Loan request';
  if (kind === 'welfare') return 'Welfare request';
  if (kind === 'approval_code') return 'Phone approval code';
  if (kind === 'payout') return 'Payout confirmed';
  if (kind === 'rejection') return 'Request rejected';
  return 'Approval update';
};

const bodyFor = (kind: AppNotification['kind'], language: Language): string => {
  if (language !== 'LU') return '';
  if (kind === 'loan_request') return 'Ebisanyizo bikusindikwa abakozesa abiri.';
  if (kind === 'welfare') return 'Ebisanyizo by\'obuyambi bisindikwa abakozesa.';
  if (kind === 'approval_code') return 'Koodi esobola okukozesebwa mu kuki kya 1/2.';
  if (kind === 'payout') return 'Ssente zo zatumidwa era zikakasseetwa.';
  if (kind === 'rejection') return 'Ebisanyizo byaganyiddwa. Buuza omuwandiisi w\'ekibiina.';
  return 'Ebisanyizo bikikwatala; soma ebyafaayo.';
};

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  currentUser,
  language,
  onMarkRead,
  onMarkAllRead,
  onOpen,
}) => {
  const isMember = currentUser.role === 'member';
  const title = language === 'LU' ? 'Ebizibu' : 'Notifications';
  const empty = language === 'LU' ? 'Tewali ebisanyizo.' : 'No notifications yet.';
  const markAll = language === 'LU' ? 'Soma byonna' : 'Mark all read';

  return (
    <main className="w-full max-w-lg mx-auto px-4 pt-4 flex-1 space-y-4 pb-12">
      <section className="bg-surface-card border border-border-line rounded-xl p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[24px]">notifications</span>
            <h1 className="text-headline-lg font-headline-lg text-primary font-bold">{title}</h1>
          </div>
          {notifications.some((notification) => !notification.read) && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="min-h-[40px] px-3 rounded-lg border border-border-strong text-primary text-xs font-bold"
            >
              {markAll}
            </button>
          )}
        </div>
        <p className="text-xs text-text-muted mt-2">
          {language === 'LU'
            ? 'Ebisanyizo biri ku kibiina kyo era nga bwa kukkirizibwa.'
            : 'Updates stay with this savings group and follow the signed-in account.'}
        </p>
      </section>

      {notifications.length === 0 ? (
        <section className="bg-surface-card border border-border-line rounded-xl p-8 text-center space-y-2">
          <span className="material-symbols-outlined text-4xl text-secondary">notifications_off</span>
          <h2 className="font-bold text-primary">{empty}</h2>
          <p className="text-xs text-text-muted">
            {language === 'LU' ? 'Ebisanyizo bishja okulabika oluvannyuma lw\'ekikolo.' : 'New updates will appear here after a group action.'}
          </p>
        </section>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => {
                onMarkRead(notification.id);
                onOpen(notification);
              }}
              className={`w-full text-left p-3 rounded-xl border bg-surface-card flex gap-3 items-start active:scale-[0.99] transition ${
                notification.read ? 'border-border-line' : 'border-secondary shadow-[0px_1px_3px_rgba(0,0,0,0.08)]'
              }`}
            >
              <span className={`mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${notification.read ? 'bg-surface-container text-text-muted' : 'bg-primary-container text-white'}`}>
                <span className="material-symbols-outlined text-[20px]">{iconFor(notification.kind)}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">{labelFor(notification.kind, language)}</span>
                  {!notification.read && <span className="w-2 h-2 rounded-full bg-secondary" aria-label={language === 'LU' ? 'Tewali kisomero' : 'Unread'} />}
                </span>
                <span className="block font-bold text-sm text-primary mt-1">
                  {language === 'LU' ? labelFor(notification.kind, language) : notification.title}
                </span>
                <span className="block text-xs text-text-muted mt-0.5">
                  {language === 'LU' ? bodyFor(notification.kind, language) : notification.body}
                </span>
                <span className="block text-[10px] text-text-muted mt-1">
                  {new Date(notification.createdAt).toLocaleString(language === 'LU' ? 'en-GB' : 'en-GB')}
                </span>
              </span>
              {notification.actionScreen && (
                <span className="material-symbols-outlined text-text-muted text-[18px] self-center">chevron_right</span>
              )}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() =>         onOpen()}
        className="w-full min-h-[44px] rounded-lg border border-border-strong bg-surface-card text-primary text-xs font-bold"
      >
        {isMember
          ? language === 'LU'
             ? 'Ggulawo ppaasibuku lyaffe'
            : 'Open my passbook'
          : language === 'LU'
             ? 'Ggulawo ebisanyizo by\'okukkiriza'
            : 'Open approvals'}
      </button>
    </main>
  );
};

export const notificationActionScreen = (notification: AppNotification, isMember: boolean): ScreenId =>
  notification.actionScreen || (isMember ? 'member_home' : 'approvals');
