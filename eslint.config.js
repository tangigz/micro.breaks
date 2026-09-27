import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '.output/',
      '.wxt/',
      'node_modules/',
      'docs/',
      '.dev-profile/',
      'test-results/',
      'playwright-report/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { ...reactHooks.configs.flat['recommended-latest'], files: ['src/**/*.{ts,tsx}'] },
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.webextensions },
    },
  },
  {
    files: ['scripts/**', 'tests/**', '*.config.*'],
    languageOptions: { globals: globals.node },
  },
  {
    // The rules engine is pure: no browser, no clock, no storage.
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', 'chrome', 'browser', 'window', 'document', 'localStorage'],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'The engine gets the time from its `now` argument.',
        },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'The engine gets the time from its `now` argument.',
        },
      ],
    },
  },
);
