/**
 * Dev tools (dev builds only): a fake clock and a simulated person, so a full
 * day can be tested in minutes by hand (dev panel) or by the e2e tests.
 * The simulated person reports idle like chrome.idle: "idle" 5 min after they
 * leave, "locked" at once.
 */
import { IDLE_DETECTION, MIN, type IdleState } from '@/engine';
import { now, setDevClock, currentDevClock, initClock } from '@/lib/clock';
import { DEV_PRESENCE_KEY, type DevCommand, type PresenceMode } from '@/lib/dev';
import { dispatch, enqueue, resetState, runStep } from './run';

interface Presence {
  mode: PresenceMode;
  /** Fake time the mode started. */
  since: number;
  /** Last idle state sent to the engine. */
  reported: IdleState;
}

async function getPresence(): Promise<Presence | null> {
  const got = await browser.storage.local.get(DEV_PRESENCE_KEY);
  return (got[DEV_PRESENCE_KEY] as Presence | undefined) ?? null;
}

async function setPresence(p: Presence | null) {
  if (p) await browser.storage.local.set({ [DEV_PRESENCE_KEY]: p });
  else await browser.storage.local.remove(DEV_PRESENCE_KEY);
}

function idleOf(p: Presence, t: number): IdleState {
  if (p.mode === 'locked') return 'locked';
  if (p.mode === 'away' && t - p.since >= IDLE_DETECTION) return 'idle';
  return 'active';
}

/** The simulated idle state, or null when real chrome.idle applies. */
export async function simulatedIdle(): Promise<IdleState | null> {
  await initClock();
  const p = await getPresence();
  return p ? idleOf(p, now()) : null;
}

/** Sends the engine the simulated idle state if it changed, then a tick. */
async function step() {
  const p = await getPresence();
  if (p) {
    const idle = idleOf(p, now());
    if (idle !== p.reported) {
      await setPresence({ ...p, reported: idle });
      await runStep({ type: 'idle', idle });
    }
    await runStep({ type: 'tick', idle });
  } else {
    await runStep({ type: 'tick', idle: 'active' });
  }
}

async function ensureFakeClock() {
  await initClock();
  if (!currentDevClock()) await setDevClock({ realAt: Date.now(), fakeAt: Date.now(), speed: 1 });
  if (!(await getPresence())) await setPresence({ mode: 'present', since: now(), reported: 'active' });
}

let lastTickAt = 0;

export async function runDevCommand(c: DevCommand): Promise<void> {
  await initClock();
  switch (c.cmd) {
    case 'speed': {
      await ensureFakeClock();
      await setDevClock({ realAt: Date.now(), fakeAt: now(), speed: c.speed });
      return;
    }
    case 'presence': {
      await ensureFakeClock();
      const p = (await getPresence())!;
      await setPresence({ ...p, mode: c.mode, since: now() });
      // Coming back is input, like a key press: the engine hears it at once.
      if (c.mode !== 'away') await enqueue(step);
      return;
    }
    case 'tick': {
      // At 60× a real second is a fake minute; tick at most every 30 fake seconds.
      if (!currentDevClock() || now() - lastTickAt < 30_000) return;
      lastTickAt = now();
      await enqueue(step);
      return;
    }
    case 'forward': {
      await ensureFakeClock();
      // Minute by minute, like a real stretch of time with Chrome open.
      await enqueue(async () => {
        const c0 = currentDevClock()!;
        const start = now();
        for (let i = 1; i <= c.minutes; i++) {
          await setDevClock({ realAt: Date.now(), fakeAt: start + i * MIN, speed: c0.speed });
          await step();
        }
      });
      return;
    }
    case 'closeChrome': {
      await ensureFakeClock();
      // No steps while closed; the person was away the whole time.
      await enqueue(async () => {
        const c0 = currentDevClock()!;
        await setDevClock({ realAt: Date.now(), fakeAt: now() + c.minutes * MIN, speed: c0.speed });
        await setPresence({ mode: 'present', since: now(), reported: 'active' });
        await runStep({ type: 'startup' });
        await step();
      });
      return;
    }
    case 'freshDay': {
      const at = new Date(c.at).getTime();
      if (Number.isNaN(at)) throw new Error(`Bad time: ${c.at}`);
      await enqueue(async () => {
        await resetState();
        await setDevClock({ realAt: Date.now(), fakeAt: at, speed: currentDevClock()?.speed ?? 1 });
        await setPresence({ mode: 'present', since: at, reported: 'active' });
        await step();
      });
      return;
    }
    case 'realTime': {
      await enqueue(async () => {
        await setDevClock(null);
        await setPresence(null);
        await resetState();
      });
      await dispatch({ type: 'tick', idle: 'active' });
      return;
    }
  }
}
