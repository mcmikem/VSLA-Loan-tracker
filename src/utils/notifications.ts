import type { AppNotification, UserAccount, VSLAState } from '../types';

const MAX_NOTIFICATIONS = 100;

export type NotificationInput = Omit<AppNotification, 'id' | 'createdAt' | 'read'> &
  Partial<Pick<AppNotification, 'id' | 'createdAt' | 'read'>>;

function notificationId(): string {
  return `note-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function appendNotifications(state: VSLAState, inputs: NotificationInput[]): VSLAState {
  const now = new Date().toISOString();
  const notifications = inputs.map((input) => ({
    ...input,
    id: input.id || notificationId(),
    createdAt: input.createdAt || now,
    read: input.read ?? false,
  }));
  return {
    ...state,
    notifications: [...notifications, ...(state.notifications || [])].slice(0, MAX_NOTIFICATIONS),
  };
}

export function appendNotification(state: VSLAState, input: NotificationInput): VSLAState {
  return appendNotifications(state, [input]);
}

export function notificationsFor(
  state: VSLAState,
  currentUser: UserAccount,
  memberNo?: string
): AppNotification[] {
  const notifications = state.notifications || [];
  if (currentUser.role === 'member') {
    return notifications.filter((notification) => notification.audience === 'member' && notification.memberNo === memberNo);
  }
  return notifications.filter(
    (notification) =>
      notification.audience === 'officer' &&
      (!notification.recipientAccountId || notification.recipientAccountId === currentUser.id)
  );
}

export function unreadNotificationCount(
  state: VSLAState,
  currentUser: UserAccount,
  memberNo?: string
): number {
  return notificationsFor(state, currentUser, memberNo).filter((notification) => !notification.read).length;
}

export function markNotificationsRead(
  state: VSLAState,
  currentUser: UserAccount,
  memberNo: string | undefined,
  ids?: string[]
): VSLAState {
  const visibleIds = new Set(notificationsFor(state, currentUser, memberNo).map((notification) => notification.id));
  const selectedIds = ids ? new Set(ids) : visibleIds;
  return {
    ...state,
    notifications: (state.notifications || []).map((notification) =>
      visibleIds.has(notification.id) && selectedIds.has(notification.id)
        ? { ...notification, read: true }
        : notification
    ),
  };
}
