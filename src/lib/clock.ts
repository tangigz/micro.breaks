/**
 * The one clock the background and the screens read. In production it is the
 * real time. In dev builds the dev panel can move it and speed it up, so a whole
 * day can be tested in minutes; it is shared through chrome.storage.
 */
export const DEV_TOOLS = import.meta.env.MODE !== 'production';
export const DEV_CLOCK_KEY = 'devClock';

export interface DevClock {
  /** Real Date.now() when the clock was last set. */
  realAt: number;
  /** Fake time at that moment. */
  fakeAt: number;
  /** Fake seconds per real second (1 = real time). */
  speed: number;
}

let dev: DevClock | null = null;
let ready: Promise<void> | null = null;

export function fakeTime(c: DevClock, real: number): number {
  return c.fakeAt + (real - c.realAt) * c.speed;
}

export function now(): number {
  return dev ? fakeTime(dev, Date.now()) : Date.now();
}

export function currentDevClock(): DevClock | null {
  return dev;
}

/** Dev only: set the clock here and for every other page. `null` returns to real time. */
export async function setDevClock(c: DevClock | null): Promise<void> {
  dev = c;
  if (c) await browser.storage.local.set({ [DEV_CLOCK_KEY]: c });
  else await browser.storage.local.remove(DEV_CLOCK_KEY);
}

/** Loads the dev clock and follows its changes. Resolves at once in production. */
export function initClock(): Promise<void> {
  if (!DEV_TOOLS) return Promise.resolve();
  ready ??= (async () => {
    const got = await browser.storage.local.get(DEV_CLOCK_KEY);
    dev = (got[DEV_CLOCK_KEY] as DevClock | undefined) ?? null;
    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && DEV_CLOCK_KEY in changes) {
        dev = (changes[DEV_CLOCK_KEY]!.newValue as DevClock | undefined) ?? null;
      }
    });
  })();
  return ready;
}
