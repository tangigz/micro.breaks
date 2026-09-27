import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

// See docs/spec.html › Tech › Stack for why each permission is needed.
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'micro.breaks',
    description: 'Move a little, every hour you sit.',
    permissions: ['idle', 'alarms', 'notifications', 'storage', 'tabs'],
  },
});
