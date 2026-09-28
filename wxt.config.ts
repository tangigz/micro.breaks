import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

/**
 * Chrome 137+ ignores --load-extension, so `npm run dev` opens Chrome for
 * Testing (installed by `npx playwright install chromium`) with the extension
 * loaded, in its own profile kept in .dev-profile/.
 */
async function testChrome(): Promise<string | undefined> {
  try {
    const { chromium } = await import('@playwright/test');
    const path = chromium.executablePath();
    return existsSync(path) ? path : undefined;
  } catch {
    return undefined;
  }
}

const chrome = await testChrome();
const profile = resolve('.dev-profile');
if (chrome) mkdirSync(profile, { recursive: true });

// See docs/spec.html › Tech › Stack for why each permission is needed.
export default defineConfig({
  srcDir: 'src',
  // The e2e tests build into their own folder, so they never touch a running `npm run dev`.
  outDirTemplate: process.env.MB_E2E ? '{{browser}}-mv{{manifestVersion}}-e2e' : undefined,
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  webExt: chrome
    ? {
        binaries: { chrome },
        chromiumProfile: profile,
        keepProfileChanges: true,
        startUrls: ['chrome://newtab/'],
      }
    : { disabled: true },
  hooks: {
    // The dev panel and the screen gallery never ship in the test-week build.
    'entrypoints:resolved': (wxt, entrypoints) => {
      if (wxt.config.mode !== 'production') return;
      for (const name of ['dev', 'gallery']) {
        const i = entrypoints.findIndex((e) => e.name === name);
        if (i >= 0) entrypoints.splice(i, 1);
      }
    },
  },
  manifest: {
    name: 'micro.breaks',
    description: 'Move a little, every hour you sit.',
    permissions: ['idle', 'alarms', 'notifications', 'storage', 'tabs'],
  },
});
