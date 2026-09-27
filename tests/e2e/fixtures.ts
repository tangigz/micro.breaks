import { resolve } from 'node:path';
import { test as base, chromium, expect, type BrowserContext, type Page } from '@playwright/test';
import type { browser } from 'wxt/browser';
import type { EngineState } from '../../src/engine';
import type { DevCommand } from '../../src/lib/dev';

/** `chrome` inside extension pages, where page.evaluate() callbacks run. */
declare const chrome: typeof browser;

const EXTENSION = resolve('.output/chrome-mv3-dev');

/** Monday 5 October 2026: every test runs on the same fake workday. */
export const MONDAY = '2026-10-05';

interface Fixtures {
  context: BrowserContext;
  extensionId: string;
  /** A micro.breaks page used to send dev commands and read state. */
  control: Page;
  dev: (command: DevCommand) => Promise<void>;
  engine: () => Promise<EngineState>;
  openPage: (path: `/${string}.html`) => Promise<Page>;
  /** The prompt tab once the extension opened it. */
  promptTab: () => Promise<Page>;
}

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: !process.env.HEADED,
      args: [`--disable-extensions-except=${EXTENSION}`, `--load-extension=${EXTENSION}`],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    const sw = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    // Any error the background logs fails the test: effects swallow errors to keep running.
    const errors: string[] = [];
    // What happened, printed only when a test fails.
    const trail: string[] = [];
    const t0 = Date.now();
    const note = (x: string) => trail.push(`${Date.now() - t0}ms ${x}`);
    sw.on('console', (m) => {
      note(`[sw ${m.type()}] ${m.text()}`);
      if (m.type() === 'error') errors.push(m.text());
    });
    context.on('page', (p) => {
      note(`open ${p.url()}`);
      p.on('framenavigated', (f) => f === p.mainFrame() && note(`nav ${f.url()}`));
      p.on('close', () => note(`close ${p.url()}`));
    });
    context.on('serviceworker', (w) => note(`new worker ${w.url()}`));
    await use(new URL(sw.url()).host);
    if (test.info().status !== test.info().expectedStatus) console.log(trail.join('\n'));
    expect(errors, 'service worker errors').toEqual([]);
  },
  control: async ({ context, extensionId }, use) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/dev.html`);
    await use(page);
  },
  dev: async ({ control }, use) => {
    await use(async (command) => {
      const res = await control.evaluate(
        (c) =>
          Promise.race([
            chrome.runtime.sendMessage({ type: 'dev', command: c }),
            new Promise((r) => setTimeout(() => r({ ok: false, error: 'no answer in 10 s' }), 10_000)),
          ]),
        command,
      );
      expect(res, JSON.stringify(command)).toMatchObject({ ok: true });
    });
  },
  engine: async ({ control }, use) => {
    await use(async () =>
      control.evaluate(async () => (await chrome.storage.local.get('engine')).engine as EngineState),
    );
  },
  openPage: async ({ context, extensionId }, use) => {
    await use(async (path) => {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}${path}`);
      return page;
    });
  },
  promptTab: async ({ context }, use) => {
    await use(async () => {
      await expect.poll(() => context.pages().some((p) => p.url().includes('/prompt.html'))).toBe(true);
      const page = context.pages().find((p) => p.url().includes('/prompt.html'))!;
      // Keys pressed before the page has rendered go nowhere: wait until it's ready.
      await expect(page.getByText('Time to move.')).toBeVisible();
      return page;
    });
  },
});

export { expect };
