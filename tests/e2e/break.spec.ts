import { MONDAY, expect, test } from './fixtures';

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
  await expect(prompt.getByRole('timer')).toHaveText(/^[45]:\d\d$/);
  await expect(prompt.getByText('Leave the computer.')).toBeVisible();
  await prompt.getByRole('button', { name: '10 min' }).click();
  await expect(prompt.getByRole('button', { name: '10 min' })).toHaveAttribute('aria-pressed', 'true');
  await expect(prompt.getByRole('timer')).toHaveText(/^(10:00|9:\d\d)$/);
});

test('coming back too early: "Still here?"', async ({ dev, promptTab }) => {
  await dev({ cmd: 'forward', minutes: 60 });
  const prompt = await promptTab();
  await prompt.keyboard.press('Enter');
  await dev({ cmd: 'presence', mode: 'away' });
  await dev({ cmd: 'forward', minutes: 1 });
  await dev({ cmd: 'presence', mode: 'present' });
  await expect(prompt.getByText('Still here?')).toBeVisible();
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
