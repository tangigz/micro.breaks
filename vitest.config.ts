import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    include: ['src/**/*.test.ts'],
    // Tests read like the spec ("9:04", "12:30"): pin a timezone with DST.
    env: { TZ: 'Europe/Paris' },
  },
});
