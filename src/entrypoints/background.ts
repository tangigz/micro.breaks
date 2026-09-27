/**
 * Service worker: turns Chrome events into engine inputs (spec › Tech › Stack).
 * Listeners are registered synchronously at the top level so Chrome can wake the
 * worker for them.
 */
import type { IdleState } from '@/engine';
import { kindOf, notificationsAllowed } from '@/background/notifications';
import { dispatch, WAKE_ALARM } from '@/background/run';
import { ensureHomeTab, openHomeTab } from '@/background/tabs';
import { HEALTH_KEY, type ActionMessage, type Health } from '@/lib/messages';

const TICK_ALARM = 'tick';
/** System-wide input; "idle" fires at exactly the 5-min break threshold. */
const IDLE_DETECTION_SECONDS = 300;

export default defineBackground(() => {
  browser.idle.setDetectionInterval(IDLE_DETECTION_SECONDS);

  browser.runtime.onInstalled.addListener(async ({ reason }) => {
    await ensureAlarms();
    // First-run setup (#6) will open here; until then, the home tab.
    if (reason === 'install') await openHomeTab();
    await tick();
  });

  browser.runtime.onStartup.addListener(async () => {
    await ensureAlarms();
    await dispatch({ type: 'startup' });
    await ensureHomeTab();
    await tick();
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === TICK_ALARM || alarm.name === WAKE_ALARM) void tick();
  });

  browser.idle.onStateChanged.addListener((idle) => {
    void dispatch({ type: 'idle', idle: idle as IdleState });
  });

  browser.runtime.onMessage.addListener((msg: ActionMessage, _sender, sendResponse) => {
    if (msg?.type !== 'action') return;
    void dispatch({ type: 'action', action: msg.action }).then(() => sendResponse());
    return true;
  });

  // Every notification's button (and a click on its body) does the one thing it offers.
  const onNotification = (id: string) => {
    const kind = kindOf(id);
    if (!kind) return;
    void browser.notifications.clear(id);
    if (kind === 'dayEnd') void openHomeTab();
    else void dispatch({ type: 'action', action: { type: 'openPrompt' } });
  };
  browser.notifications.onClicked.addListener(onNotification);
  browser.notifications.onButtonClicked.addListener(onNotification);
});

async function ensureAlarms() {
  if (!(await browser.alarms.get(TICK_ALARM))) {
    await browser.alarms.create(TICK_ALARM, { periodInMinutes: 1 });
  }
}

async function tick() {
  const idle = (await browser.idle.queryState(IDLE_DETECTION_SECONDS)) as IdleState;
  await dispatch({ type: 'tick', idle });
  const health: Health = { notifications: (await notificationsAllowed()) ? 'granted' : 'denied' };
  await browser.storage.local.set({ [HEALTH_KEY]: health });
}
