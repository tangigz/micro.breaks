/** Dev tools protocol between the dev panel (or e2e tests) and the background. Dev builds only. */
export const DEV_PRESENCE_KEY = 'devPresence';

export type PresenceMode = 'present' | 'away' | 'locked';

export type DevCommand =
  | { cmd: 'speed'; speed: number }
  | { cmd: 'presence'; mode: PresenceMode }
  | { cmd: 'forward'; minutes: number }
  | { cmd: 'closeChrome'; minutes: number }
  /** Fresh state at a local time, e.g. "2026-10-05T08:55". */
  | { cmd: 'freshDay'; at: string }
  /** Sent every second by an open micro.breaks page: lets fast time flow. */
  | { cmd: 'tick' }
  | { cmd: 'realTime' };

export interface DevMessage {
  type: 'dev';
  command: DevCommand;
}
