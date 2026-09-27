import { expect, test } from './fixtures';

test('on install, the setup opens in the pinned tab; two steps unlock "Start moving"', async ({
  context,
  extensionId,
}) => {
  await expect.poll(() => context.pages().some((p) => p.url().includes('/setup.html'))).toBe(true);
  const setup = context.pages().find((p) => p.url().includes('/setup.html'))!;
  expect(extensionId).toBeTruthy();

  await expect(setup.getByRole('heading', { name: "Let's set up micro.breaks." })).toBeVisible();
  const start = setup.getByRole('button', { name: 'Start moving' });
  await expect(start).toBeDisabled();

  await expect(
    setup.getByText('Every 60 min, 9:00–18:00. Lunch 12:30–13:30. From the office.'),
  ).toBeVisible();
  await setup.getByRole('button', { name: 'Keep these' }).click();
  await expect(setup.getByRole('listitem', { name: /Step 1: .*, done/ })).toBeVisible();

  await setup.getByRole('button', { name: 'Send a test' }).click();
  await expect(setup.getByText('Did the test stay on screen until you closed it?')).toBeVisible();
  await setup.getByRole('button', { name: 'Yes, it stayed' }).click();
  await expect(setup.getByRole('listitem', { name: /Step 2: .*, done/ })).toBeVisible();

  await expect(start).toBeEnabled();
  await start.click();
  await expect(setup).toHaveURL(/\/newtab\.html$/);
  await expect(setup.getByRole('img', { name: /Battery/ })).toBeVisible();
});

test('the setup keeps its progress when reopened', async ({ openPage }) => {
  const first = await openPage('/setup.html');
  await first.getByRole('button', { name: 'Keep these' }).click();
  await first.close();
  const again = await openPage('/setup.html');
  await expect(again.getByRole('listitem', { name: /Step 1: .*, done/ })).toBeVisible();
});
