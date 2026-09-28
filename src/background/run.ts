/**
 * Feeds the rules engine and runs its effects. One step at a time: Chrome events
 * can arrive together, and each step reads the state the previous one saved.
 * The service worker sleeps between events, so state lives in chrome.storage.
 */
import {
  dayKey,
  idleDetectionMs,
  IDLE_DETECTION,
  initialState,
  step,
  type Effect,
  type EngineState,
  type Input,
} from '@/engine';
import { db } from '@/data/db';
import { STATE_KEY } from '@/lib/messages';
import { initClock, now } from '@/lib/clock';
import { clearNotifications, showNotification } from './notifications';
import { closePromptTab, openPromptTab } from './tabs';

export const WAKE_ALARM = 'wake';

/**
 * chrome.idle's current detection window: 5 min, or 15 s while the break timer runs
 * (the engine decides). Every idle report tells the engine which window it used.
 */
let detectionMs = IDLE_DETECTION;

export function currentDetectionMs(): number {
  return detectionMs;
}

export async function applyDetection(st: EngineState, force = false) {
  const want = idleDetectionMs(st);
  if (want === detectionMs && !force) return;
  detectionMs = want;
  browser.idle.setDetectionInterval(want / 1000);
}

/** On service worker start: Chrome forgets the window, set it from the saved state. */
export async function restoreDetection() {
  await applyDetection(await loadState(), true);
}

let chain: Promise<void> = Promise.resolve();

export function dispatch(input: Input): Promise<void> {
  return enqueue(() => runStep(input));
}

/** Runs `job` after every step already queued, never alongside one. */
export function enqueue(job: () => Promise<void>): Promise<void> {
  chain = chain.then(job).catch((err) => console.error('[micro.breaks]', err));
  return chain;
}

/** Dev only: forget today's state, keep the settings. */
export async function resetState(): Promise<void> {
  const st = await loadState();
  await browser.storage.local.set({ [STATE_KEY]: initialState(st.settings) });
}

export async function loadState(): Promise<EngineState> {
  const got = await browser.storage.local.get(STATE_KEY);
  const st = got[STATE_KEY] as EngineState | undefined;
  if (!st || st.version !== 1) return initialState(st?.settings);
  return st;
}

export async function runStep(input: Input) {
  await initClock();
  const t = now();
  const res = step(await loadState(), input, t);
  await browser.storage.local.set({ [STATE_KEY]: res.state });
  await applyDetection(res.state);
  for (const effect of res.effects) await runEffect(effect);
  if (res.wakeAt != null) await browser.alarms.create(WAKE_ALARM, { when: res.wakeAt });
}

/** A Chrome API that never answers (seen with notifications) must not freeze the queue. */
const EFFECT_TIMEOUT = 5_000;

async function runEffect(e: Effect) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${EFFECT_TIMEOUT} ms`)), EFFECT_TIMEOUT);
  });
  try {
    await Promise.race([applyEffect(e), timeout]);
  } catch (err) {
    // One failing effect (a closed window, a blocked notification) must not stop the others.
    console.error('[micro.breaks] effect failed', e.type, e.type === 'notify' ? e.kind : '', String(err));
  } finally {
    clearTimeout(timer);
  }
}

async function applyEffect(e: Effect) {
  switch (e.type) {
    case 'log':
      await db.events.add({
        ts: e.event.ts,
        day: dayKey(e.event.ts),
        type: e.event.type,
        payload: e.event.payload,
      });
      return;
    case 'notify':
      await showNotification(e.kind, e.data);
      return;
    case 'clearNotifications':
      // The day recap stays until opened; everything else is stale once acted on.
      await clearNotifications(['dayEnd']);
      return;
    case 'openPromptTab':
      await openPromptTab();
      return;
    case 'closePromptTab':
      await closePromptTab();
      return;
  }
}
