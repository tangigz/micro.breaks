import type { NotificationKind } from '@/engine';
import { notificationCopy } from './copy';

const PREFIX = 'mb-';
const KINDS: NotificationKind[] = ['headsUp', 'prompt', 'reminder', 'breakDone', 'dayEnd'];

export function kindOf(notificationId: string): NotificationKind | null {
  const kind = notificationId.slice(PREFIX.length) as NotificationKind;
  return notificationId.startsWith(PREFIX) && KINDS.includes(kind) ? kind : null;
}

/** Stays on screen until acted on, with one action button (spec › Notifications stay). */
export async function showNotification(kind: NotificationKind, data: Record<string, number>) {
  const copy = notificationCopy(kind, data);
  const id = PREFIX + kind;
  await browser.notifications.clear(id);
  await browser.notifications.create(id, {
    type: 'basic',
    iconUrl: browser.runtime.getURL('/icon/128.png'),
    title: copy.title,
    message: copy.message,
    buttons: [{ title: copy.button }],
    requireInteraction: true,
    priority: 2,
  });
}

export async function clearNotifications(except: NotificationKind[] = []) {
  await Promise.all(
    KINDS.filter((k) => !except.includes(k)).map((k) => browser.notifications.clear(PREFIX + k)),
  );
}

export async function notificationsAllowed(): Promise<boolean> {
  return (await browser.notifications.getPermissionLevel()) === 'granted';
}
