import { MONDAY, expect, test } from './fixtures';

test('setup › Edit opens the movement timer; Save returns with step 1 done', async ({ engine, openPage }) => {
  const setup = await openPage('/setup.html');
  await setup.getByRole('button', { name: 'Edit' }).click();
  await expect(setup).toHaveURL(/\/settings\.html\?from=setup$/);
  await expect(setup.getByText('Your movement timer')).toBeVisible();

  await setup.getByRole('button', { name: 'Interval, 60 min' }).click();
  await expect(setup.getByRole('listbox', { name: 'Remind me every' })).toBeVisible();
  await setup.keyboard.press('ArrowUp');
  await expect(setup.getByRole('button', { name: 'Interval, 45 min' })).toBeVisible();
  await setup.getByRole('button', { name: 'Done' }).click();

  await setup.getByRole('button', { name: /^Place, from the office/ }).click();
  await expect(setup.getByRole('button', { name: /^Place, from home/ })).toBeVisible();

  await setup.getByRole('button', { name: 'Save' }).click();
  await expect(setup).toHaveURL(/\/setup\.html$/);
  await expect(setup.getByRole('listitem', { name: /Step 1: .*, done/ })).toBeVisible();
  await expect(setup.getByText('Every 45 min, 9:00–18:00. Lunch 12:30–13:30. From home.')).toBeVisible();
  const st = await engine();
  expect(st.settings.intervalMin).toBe(45);
  expect(st.place).toBe('home');
});

test('the timer chip opens the movement timer; Back leaves without saving', async ({
  dev,
  engine,
  openPage,
}) => {
  await dev({ cmd: 'freshDay', at: `${MONDAY}T09:00` });
  const tab = await openPage('/newtab.html');
  await tab.getByRole('button', { name: /Edit your movement timer/ }).click();
  await expect(tab).toHaveURL(/\/settings\.html$/);
  await tab.getByRole('button', { name: 'Start of day, 9:00' }).click();
  await tab.getByRole('option', { name: '9:30' }).click();
  await expect(tab.getByRole('button', { name: 'Start of day, 9:30' })).toBeVisible();
  await tab.getByRole('button', { name: 'Back' }).click();
  await expect(tab).toHaveURL(/\/newtab\.html$/);
  expect((await engine()).settings.dayStart).toBe(9 * 60);
});

test('an impossible day cannot be saved', async ({ openPage }) => {
  const tab = await openPage('/settings.html');
  await tab.getByRole('button', { name: 'End of day, 18:00' }).click();
  for (let i = 0; i < 40; i++) await tab.keyboard.press('ArrowUp');
  await tab.keyboard.press('Enter');
  await expect(tab.getByRole('alert')).toHaveText('Your day has to end after it starts.');
  await expect(tab.getByRole('button', { name: 'Save' })).toBeDisabled();
});
