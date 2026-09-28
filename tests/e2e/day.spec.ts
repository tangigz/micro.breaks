import { MONDAY, expect, test } from './fixtures';

// A workday in the real extension, on the fake clock. Each test checks what the
// person would see: tabs that open and close, screens, and the engine's state.

test('before the first activity, the main screen waits for the day', async ({ dev, openPage }) => {
  await dev({ cmd: 'freshDay', at: `${MONDAY}T08:55` });
  const tab = await openPage('/newtab.html');
  await expect(tab.getByText('Before working hours')).toBeVisible();
  await expect(tab.getByRole('heading', { name: '9:00' })).toBeVisible();
});

test('at zero the prompt opens in a new tab, after a heads-up', async ({ dev, engine, promptTab }) => {
  await dev({ cmd: 'freshDay', at: `${MONDAY}T09:00` });
  await dev({ cmd: 'forward', minutes: 60 });
  const prompt = await promptTab();
  await expect(prompt.getByText('Time to move.')).toBeVisible();
  const st = await engine();
  expect(st.episode).toMatchObject({ status: 'open' });
  expect(st.headsUpFor).not.toBeNull();
});

test('choose a break, leave 6 min, come back: "Recharged."', async ({ dev, engine, promptTab }) => {
  await dev({ cmd: 'freshDay', at: `${MONDAY}T09:00` });
  await dev({ cmd: 'forward', minutes: 60 });
  const prompt = await promptTab();
  await prompt.keyboard.press('2');
  await prompt.keyboard.press('Enter');
  await expect(prompt.getByText('to start the timer.')).toBeVisible();
  expect((await engine()).breakTimer).toMatchObject({ intent: 'focus' });

  await dev({ cmd: 'presence', mode: 'away' });
  await dev({ cmd: 'forward', minutes: 6 });
  await dev({ cmd: 'presence', mode: 'present' });

  await expect(prompt.getByText('Recharged.')).toBeVisible();
  const st = await engine();
  expect(st.today.breaks).toBe(1);
  expect(st.episode).toMatchObject({ status: 'succeeded' });
});

test('Esc closes the prompt; three reminders follow, then silence', async ({ dev, engine, promptTab }) => {
  await dev({ cmd: 'freshDay', at: `${MONDAY}T09:00` });
  await dev({ cmd: 'forward', minutes: 60 });
  const prompt = await promptTab();
  const closed = prompt.waitForEvent('close');
  await prompt.keyboard.press('Escape');
  await closed;

  await dev({ cmd: 'forward', minutes: 21 });
  expect((await engine()).episode).toMatchObject({
    status: 'failed',
    failReason: 'unanswered',
    remindersSent: 3,
  });
});

test('skip shows when the next prompt comes', async ({ dev, openPage, promptTab }) => {
  await dev({ cmd: 'freshDay', at: `${MONDAY}T09:00` });
  await dev({ cmd: 'forward', minutes: 60 });
  await (await promptTab()).getByRole('button', { name: 'Skip this one' }).click();
  const tab = await openPage('/newtab.html');
  await expect(tab.getByText(/Skipped\. Next prompt at 11:00\./)).toBeVisible();
});

test('Chrome closed for 40 min asks once; "Yes, I moved" recharges', async ({ dev, engine, openPage }) => {
  await dev({ cmd: 'freshDay', at: `${MONDAY}T09:00` });
  await dev({ cmd: 'forward', minutes: 20 });
  await dev({ cmd: 'closeChrome', minutes: 40 });
  const tab = await openPage('/newtab.html');
  await expect(tab.getByText('Did you step away?')).toBeVisible();
  await tab.getByRole('button', { name: 'Yes, I moved' }).click();
  await expect.poll(async () => (await engine()).pendingRecharge?.source).toBe('gap');
});

test('lunch is silent and the battery is full after it', async ({ dev, engine, openPage }) => {
  await dev({ cmd: 'freshDay', at: `${MONDAY}T12:20` });
  await dev({ cmd: 'forward', minutes: 15 });
  const tab = await openPage('/newtab.html');
  await expect(tab.getByRole('heading', { name: 'Lunch.' })).toBeVisible();
  await dev({ cmd: 'forward', minutes: 60 });
  const st = await engine();
  expect(st.lunchEndHandled).toBe(true);
  expect(st.episode).toBeNull();
});

test('the main screen counts down, and the theme toggle is remembered', async ({ dev, engine, openPage }) => {
  await dev({ cmd: 'freshDay', at: `${MONDAY}T09:00` });
  await dev({ cmd: 'forward', minutes: 42 });
  const tab = await openPage('/newtab.html');
  await expect(tab.getByRole('timer')).toHaveText(/^1[78]:\d\d$/);
  await expect(tab.getByText('since your last active break')).toContainText('42 min');
  await expect(tab.getByRole('img', { name: /Battery at 30 percent/ })).toBeVisible();

  await tab.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(tab.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect.poll(async () => (await engine()).settings.theme).toBe('light');
  const again = await openPage('/newtab.html');
  await expect(again.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('overdue after the prompt, with the next reminder', async ({ dev, openPage, promptTab }) => {
  await dev({ cmd: 'freshDay', at: `${MONDAY}T09:00` });
  await dev({ cmd: 'forward', minutes: 60 });
  await (await promptTab()).keyboard.press('Escape');
  await dev({ cmd: 'forward', minutes: 8 });
  const tab = await openPage('/newtab.html');
  await expect(tab.getByText('Break overdue by')).toBeVisible();
  await expect(tab.getByText(/reminder 2 of 3 at 10:10/)).toBeVisible();
  await expect(tab.getByRole('img', { name: 'Battery empty, your break is due' })).toBeVisible();
});

test('the prompt: time since the last break, three cards, keys 1 2 3', async ({ dev, promptTab }) => {
  await dev({ cmd: 'freshDay', at: `${MONDAY}T09:00` });
  await dev({ cmd: 'forward', minutes: 62 });
  const prompt = await promptTab();
  await expect(prompt.getByText('since your last active break')).toContainText('1 h 02');
  const cards = prompt.getByRole('radio');
  await expect(cards).toHaveCount(3);
  await expect(prompt.getByRole('radio', { name: 'Energy, Take the stairs' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await prompt.keyboard.press('3');
  await expect(prompt.getByRole('radio', { name: 'Pain relief, Stand and stretch' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await prompt.getByRole('radio', { name: 'Focus, Get some water' }).click();
  await expect(prompt.getByRole('radio', { name: 'Focus, Get some water' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
});

test('working from home, Energy is "Walk around"', async ({ dev, openPage }) => {
  await dev({ cmd: 'freshDay', at: `${MONDAY}T09:00` });
  const settings = await openPage('/settings.html');
  await settings.getByRole('button', { name: /^Place, from the office/ }).click();
  await settings.getByRole('button', { name: 'Save' }).click();
  const prompt = await openPage('/prompt.html');
  await expect(prompt.getByRole('radio', { name: 'Energy, Walk around' })).toBeVisible();
});
