/**
 * Test harness: a fake clock plus a person at a computer, fed to the engine the
 * way the background will (1-min ticks, alarms at wakeAt, chrome.idle events).
 */
import { initialState } from './settings';
import { idleDetectionMs, step } from './step';
import { MIN, atMinute } from './time';
import type { Action, Effect, EngineState, IdleState, Input, NotificationKind, Settings } from './types';
import { view } from './view';

export interface Logged {
  at: number;
  effect: Effect;
}

/** "2026-10-05 09:04" → local epoch ms. */
export function parseLocal(s: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (!m) throw new Error(`Bad time: ${s}`);
  const [y, mo, d, h, mi, sec] = m.slice(1).map((x) => Number(x ?? 0)) as number[];
  return new Date(y!, mo! - 1, d!, h!, mi!, sec!).getTime();
}

export function sim(start: string, settings?: Partial<Settings>) {
  let now = parseLocal(start);
  let state: EngineState = initialState();
  if (settings) state.settings = { ...state.settings, ...settings };
  let wakeAt: number | null = null;
  let lastInputAt = -Infinity;
  let working = false;
  let locked = false;
  let reported: IdleState = 'idle';
  let chromeOpen = true;
  const log: Logged[] = [];

  const feed = (input: Input) => {
    const res = step(state, input, now);
    state = res.state;
    wakeAt = res.wakeAt;
    for (const effect of res.effects) log.push({ at: now, effect });
  };
  // Like chrome.idle: the window is 5 min, or 15 s while a break timer runs.
  const window_ = () => idleDetectionMs(state);
  const idleNow = (): IdleState => (locked ? 'locked' : now - lastInputAt >= window_() ? 'idle' : 'active');
  const input = () => {
    lastInputAt = now;
    if (chromeOpen && reported !== 'active' && !locked) {
      reported = 'active';
      feed({ type: 'idle', idle: 'active' });
    }
  };
  /** "10:04" on the current day, or a full "2026-10-06 09:00". */
  const t = (hm: string) => {
    if (hm.includes('-')) return parseLocal(hm);
    const [h, m] = hm.split(':').map(Number) as [number, number];
    return atMinute(now, h * 60 + m);
  };

  const api = {
    get now() {
      return now;
    },
    get state() {
      return state;
    },
    t,
    view: () => view(state, now),
    log,
    /** Effects of a given kind, optionally since a time. */
    notifications: (kind?: NotificationKind, since = -Infinity) =>
      log.filter(
        (l) => l.at >= since && l.effect.type === 'notify' && (!kind || l.effect.kind === kind),
      ) as (Logged & { effect: Extract<Effect, { type: 'notify' }> })[],
    effects: (type: Effect['type'], since = -Infinity) =>
      log.filter((l) => l.at >= since && l.effect.type === type),
    events: (type: string, since = -Infinity) =>
      log.filter((l) => l.at >= since && l.effect.type === 'log' && l.effect.event.type === type),

    /** Let time pass until `hm`, the person working (input every minute) or not. */
    until(hm: string) {
      const end = t(hm);
      while (now < end) {
        const c = [Math.floor(now / MIN) * MIN + MIN, end];
        if (chromeOpen && wakeAt != null) c.push(wakeAt);
        if (chromeOpen && !working && !locked && reported === 'active') c.push(lastInputAt + window_());
        now = Math.min(...c.filter((x) => x > now));
        if (working) input();
        if (!chromeOpen) continue;
        const idle = idleNow();
        if (idle !== reported) {
          reported = idle;
          feed({ type: 'idle', idle, idleMs: window_() });
        }
        if (now % MIN === 0 || now === wakeAt) feed({ type: 'tick', idle, idleMs: window_() });
      }
      return api;
    },
    /** Start working now (continuous input). */
    work() {
      working = true;
      input();
      return api;
    },
    /** Stop touching the computer now. */
    leave() {
      working = false;
      return api;
    },
    /** Come back: input now, and keep working. */
    back() {
      return api.work();
    },
    lock() {
      working = false;
      locked = true;
      reported = 'locked';
      feed({ type: 'idle', idle: 'locked' });
      return api;
    },
    unlock() {
      locked = false;
      return api.work();
    },
    closeChrome() {
      chromeOpen = false;
      return api;
    },
    /** The computer sleeps (lid closed): Chrome stays open but nothing runs. */
    sleep() {
      working = false;
      chromeOpen = false;
      return api;
    },
    /** The computer wakes: no Chrome startup, the person is back at it. */
    wake() {
      chromeOpen = true;
      reported = 'idle';
      return api.work();
    },
    /** Opening Chrome is itself input on the computer. */
    openChrome() {
      chromeOpen = true;
      lastInputAt = now;
      feed({ type: 'startup' });
      reported = idleNow();
      feed({ type: 'tick', idle: reported });
      return api;
    },
    /** Something the person does on a micro.breaks screen (counts as input). */
    act(action: Action) {
      lastInputAt = now;
      reported = locked ? reported : 'active';
      feed({ type: 'action', action });
      return api;
    },
  };
  return api;
}
