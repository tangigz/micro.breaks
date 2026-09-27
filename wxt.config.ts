import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

// See docs/spec.html › Tech › Stack for why each permission is needed.
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  // Chrome 137+ ignores --load-extension, so WXT can't open a browser with the
  // extension. `npm run dev` builds to .output/chrome-mv3-dev: load it once with
  // "Load unpacked"; it then reloads itself on every change.
  webExt: { disabled: true },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'micro.breaks',
    description: 'Move a little, every hour you sit.',
    permissions: ['idle', 'alarms', 'notifications', 'storage', 'tabs'],
  },
});
