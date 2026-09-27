import type { NotificationKind } from '@/engine';
import { duration } from '@/lib/format';

export interface NotificationCopy {
  title: string;
  message: string;
  button: string;
}

/** Notification copy from the design export (frame "Notifications"). */
export function notificationCopy(kind: NotificationKind, data: Record<string, number>): NotificationCopy {
  switch (kind) {
    case 'headsUp':
      return {
        title: 'Nearly time to move.',
        message: 'Get ready for your active break in 5 min.',
        button: 'Start break now',
      };
    case 'prompt':
      return {
        title: 'Time to move.',
        message: `${duration(data.seatedMin ?? 0)} seated. Your break is ready in Chrome.`,
        button: 'Start break',
      };
    case 'reminder':
      return {
        title: 'Your break is waiting.',
        message: `${duration(data.seatedMin ?? 0)} seated.`,
        button: 'Start break',
      };
    case 'breakDone':
      return {
        title: 'Break done. Welcome back.',
        message: `+${data.minutes ?? 0} min of movement. Battery recharged.`,
        button: 'Open',
      };
    case 'dayEnd':
      return {
        title: 'Your day is done.',
        message: `${data.breaks ?? 0} of ${data.goal ?? 0} breaks. See how your day went.`,
        button: 'See recap',
      };
  }
}
