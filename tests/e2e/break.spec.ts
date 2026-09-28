import type { browser } from 'wxt/browser';
import { MONDAY, expect, test } from './fixtures';

/** `chrome` inside extension pages, where page.evaluate() callbacks run. */
declare const chrome: typeof browser;

test.beforeEach(async ({ dev }) => {
  await dev({ cmd: 'freshDay', at: `${MONDAY}T09:00` });
});

test('the break timer shows the activity, a countdown and the length switch', async ({ dev, promptTab }) => {
  await dev({ cmd: 'forward', minutes: 60 });
  const prompt = await promptTab();
  await prompt.keyboard.press('2');
  await prompt.keyboard.press('Enter');
  await expect(prompt.getByRole('heading', { name: 'Get some water' })).toBeVisible();
  await expect(prompt.getByText('Refill your water, look out of a window on the way.')).toBeVisible();
  // Waiting for you to leave: the full time, standing still.
  await expect(prompt.getByRole('timer')).toHaveText('5:00');
  await expect(prompt.getByText('to start the timer.')).toBeVisible();
  await prompt.getByRole('button', { name: '10 min' }).click();
  await expect(prompt.getByRole('button', { name: '10 min' })).toHaveAttribute('aria-pressed', 'true');
  await expect(prompt.getByRole('timer')).toHaveText('10:00');
});

test('the countdown runs while you are away, pauses when you are back, and adds up', async ({
  dev,
  promptTab,
}) => {
  await dev({ cmd: 'forward', minutes: 60 });
  const prompt = await promptTab();
  await prompt.keyboard.press('Enter');
  await dev({ cmd: 'presence', mode: 'away' });
  await dev({ cmd: 'forward', minutes: 2 });
  // The test clock runs in real time between commands: a few seconds more than 2 min away.
  await expect(prompt.getByRole('timer')).toHaveText(/^(3:00|2:5\d)$/);
  await dev({ cmd: 'presence', mode: 'present' });
  await expect(prompt.getByText('Still here?')).toBeVisible();
  await expect(prompt.getByText('The timer continues when you leave again.')).toBeVisible();
  // Paused: the countdown stays where it stopped (about 3:00), however long you stay.
  const paused = await prompt.getByRole('timer').textContent();
  expect(paused).toMatch(/^(3:00|2:[45]\d)$/);
  await dev({ cmd: 'forward', minutes: 5 });
  await expect(prompt.getByRole('timer')).toHaveText(paused!);
  await dev({ cmd: 'presence', mode: 'away' });
  await dev({ cmd: 'forward', minutes: 3 });
  await dev({ cmd: 'presence', mode: 'present' });
  await expect(prompt.getByRole('heading', { name: 'Recharged.' })).toBeVisible();
  await expect(prompt.getByText('+5 min')).toBeVisible();
});

test("I'm back before 5 min: nothing logged, the tab shows the overdue screen", async ({
  dev,
  engine,
  promptTab,
}) => {
  await dev({ cmd: 'forward', minutes: 60 });
  const prompt = await promptTab();
  await prompt.keyboard.press('Enter');
  await prompt.getByRole('button', { name: "I'm back" }).click();
  await expect(prompt).toHaveURL(/\/newtab\.html$/);
  await expect(prompt.getByText('Break overdue by')).toBeVisible();
  expect((await engine()).today.breaks).toBe(0);
});

test('a timed break: "Recharged." in the tab, Back to work closes it', async ({ dev, promptTab }) => {
  await dev({ cmd: 'forward', minutes: 60 });
  const prompt = await promptTab();
  await prompt.keyboard.press('Enter');
  await dev({ cmd: 'presence', mode: 'away' });
  await dev({ cmd: 'forward', minutes: 6 });
  await dev({ cmd: 'presence', mode: 'present' });
  await expect(prompt.getByRole('heading', { name: 'Recharged.' })).toBeVisible();
  await expect(prompt.getByText('+6 min')).toBeVisible();
  await expect(prompt.getByText('Break 1 of 8 today')).toBeVisible();
  const closed = prompt.waitForEvent('close');
  await prompt.getByRole('button', { name: 'Back to work' }).click();
  await closed;
});

test('an unprompted break plays "Recharged." once on the main screen', async ({ dev, engine, openPage }) => {
  await dev({ cmd: 'forward', minutes: 20 });
  await dev({ cmd: 'presence', mode: 'away' });
  await dev({ cmd: 'forward', minutes: 10 });
  await dev({ cmd: 'presence', mode: 'present' });
  const tab = await openPage('/newtab.html');
  await expect(tab.getByText('While you were away')).toBeVisible();
  await expect(tab.getByText('+10 min')).toBeVisible();
  await expect(tab.getByText('Counted as break 1 of 8 today')).toBeVisible();
  await tab.getByRole('button', { name: 'Back to work' }).click();
  await expect(tab.getByText('Next break in')).toBeVisible();
  expect((await engine()).pendingRecharge).toBeNull();
});

test('"Yes, I moved" plays "Recharged." right there', async ({ dev, openPage }) => {
  await dev({ cmd: 'forward', minutes: 15 });
  await dev({ cmd: 'closeChrome', minutes: 40 });
  const tab = await openPage('/newtab.html');
  await tab.getByRole('button', { name: 'Yes, I moved' }).click();
  await expect(tab.getByText('Chrome was closed · You moved')).toBeVisible();
  await expect(tab.getByText('+40 min')).toBeVisible();
});

test('"Recharged." waits until its tab is in front, then plays', async ({ context, dev, promptTab }) => {
  // Headless Chrome counts every tab as focused: let the test say when the break tab is in front.
  await context.addInitScript(() => {
    const w = window as unknown as { mbFront: boolean };
    w.mbFront = false;
    document.hasFocus = () => w.mbFront;
  });
  await dev({ cmd: 'forward', minutes: 60 });
  const prompt = await promptTab();
  await prompt.keyboard.press('Enter');
  await dev({ cmd: 'presence', mode: 'away' });
  await dev({ cmd: 'forward', minutes: 6 });
  await dev({ cmd: 'presence', mode: 'present' });
  await expect(prompt.getByRole('heading', { name: 'Recharged.' })).toBeAttached();
  await expect(prompt.locator('.rc-play')).toHaveCount(0);

  await prompt.evaluate(() => {
    (window as unknown as { mbFront: boolean }).mbFront = true;
    window.dispatchEvent(new Event('focus'));
  });
  await expect(prompt.locator('.rc-play')).toHaveCount(1);
});

test('a break timer saved by an older version still shows a countdown, not NaN', async ({
  control,
  dev,
  openPage,
}) => {
  await dev({ cmd: 'forward', minutes: 60 });
  // What the previous version saved: an end time, no time away.
  await control.evaluate(async () => {
    const got = await chrome.storage.local.get('engine');
    const st = got.engine as Record<string, unknown>;
    const t = Date.now();
    st.breakTimer = {
      startedAt: t,
      endsAt: t + 300_000,
      intent: 'energy',
      lengthMin: 5,
      early: false,
      ended: false,
    };
    await chrome.storage.local.set({ engine: st });
  });
  const tab = await openPage('/prompt.html');
  await expect(tab.getByRole('timer')).toHaveText('5:00');
  await expect(tab.getByText('to start the timer.')).toBeVisible();
});
