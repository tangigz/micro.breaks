/**
 * Service worker: turns Chrome events into engine inputs (spec › Tech › Stack).
 * Listeners are registered synchronously at the top level so Chrome can wake the
 * worker for them.
 */
import type { IdleState } from '@/engine';
import { runDevCommand, simulatedIdle } from '@/background/dev';
import { kindOf, notificationsAllowed, TEST_NOTIFICATION } from '@/background/notifications';
import { dispatch, WAKE_ALARM } from '@/background/run';
import { ensureHomeTab, openHomeTab, openSetupTab } from '@/background/tabs';
import { DEV_TOOLS } from '@/lib/clock';
import type { DevMessage } from '@/lib/dev';
import { HEALTH_KEY, type ActionMessage, type Health } from '@/lib/messages';
import { readSetup } from '@/lib/setup';

const TICK_ALARM = 'tick';
/** System-wide input; "idle" fires at exactly the 5-min break threshold. */
const IDLE_DETECTION_SECONDS = 300;

export default defineBackground(() => {
  browser.idle.setDetectionInterval(IDLE_DETECTION_SECONDS);

  browser.runtime.onInstalled.addListener(async ({ reason }) => {
    await ensureAlarms();
    // Health first, so the setup knows at once whether notifications are allowed.
    await tick();
    if (reason === 'install') await openSetupTab();
  });

  browser.runtime.onStartup.addListener(async () => {
    await ensureAlarms();
    await dispatch({ type: 'startup' });
    const setup = await readSetup();
    await ensureHomeTab(setup.timer && setup.confirmed);
    await tick();
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === TICK_ALARM || alarm.name === WAKE_ALARM) void tick();
  });

  browser.idle.onStateChanged.addListener(async (idle) => {
    // While the dev panel simulates the person, real idle changes don't apply.
    if (DEV_TOOLS && (await simulatedIdle())) return;
    void dispatch({ type: 'idle', idle: idle as IdleState });
  });

  browser.runtime.onMessage.addListener((msg: ActionMessage | DevMessage, _sender, sendResponse) => {
    if (msg?.type === 'action') {
      void dispatch({ type: 'action', action: msg.action }).then(() => sendResponse());
      return true;
    }
    if (DEV_TOOLS && msg?.type === 'dev') {
      runDevCommand(msg.command).then(
        () => sendResponse({ ok: true }),
        (err: unknown) => sendResponse({ ok: false, error: String(err) }),
      );
      return true;
    }
  });

  // Every notification's button (and a click on its body) does the one thing it offers.
  const onNotification = (id: string) => {
    if (id === TEST_NOTIFICATION) return void browser.notifications.clear(id);
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
  const idle =
    (DEV_TOOLS ? await simulatedIdle() : null) ??
    ((await browser.idle.queryState(IDLE_DETECTION_SECONDS)) as IdleState);
  await dispatch({ type: 'tick', idle });
  const health: Health = { notifications: (await notificationsAllowed()) ? 'granted' : 'denied' };
  await browser.storage.local.set({ [HEALTH_KEY]: health });
}
