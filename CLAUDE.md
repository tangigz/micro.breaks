# micro.breaks

Chrome MV3 extension (WXT + React + TypeScript + Tailwind v4). A battery drains while you sit; at zero a prompt tab opens; a 5-min break away from the computer recharges it.

## Sources of truth

- `docs/spec.html`: product rules, screens, style guide, stack, build plan. **Rules change in the spec first, then in code.**
- `docs/design/micro.breaks-M1-screens.html`: Claude Design export v2 (32 frames). Wins over the spec's style guide on visual details (exact tokens, spacing, copy).
- `DECISIONS.md`: decisions taken while building, with dates.

M1 has **no calendar**: the design's meeting states, "Skip my meetings" setup row and "and during [meetings]" token are not built.

## Layout

```
src/
  engine/       rules engine: pure step(state, input, now) → { state, effects } + Vitest tests
  background/   service worker logic: idle, alarms, notifications, tabs, storage; runs engine effects
  entrypoints/  WXT entrypoints (background.ts, newtab/, …); thin, no rule logic
  ui/           design-system components and tokens.css
  data/         Dexie db, event log, derived day stats
  lib/          shared helpers: messages between screens and background, formatting
  assets/       Fluent Emoji 3D illustrations (MIT)
```

## Rules for code

- Every product rule lives in `src/engine/` and is tested with a fake clock. Screens read state and send actions; they never decide rules.
- The engine is pure: no `chrome`, no `Date.now()`, no storage (enforced by ESLint).
- The service worker sleeps: persist engine state after every step, restore on wake.
- Colours come from tokens (`bg-raised`, `text-ink-2`, …), never hex in components.
- Respect `prefers-reduced-motion`; keep the a11y roles from the spec (timer, img, radiogroup, listbox).

## Commands

- `npm run dev`: opens Chrome for Testing (Playwright's) with the extension, profile in `.dev-profile/`, hot reload. Chrome 137+ can't auto-load extensions, hence Chrome for Testing.
- `npm run check`: typecheck, lint, format check, unit tests, build
- `npm run e2e`: builds the dev extension and runs Playwright tests in Chrome for Testing (`tests/e2e/`), driving the dev clock
- Dev builds have a dev panel (`dev.html`): fake clock, simulated presence, fast-forward. It never ships in production builds. See `docs/TESTING.md`.

## Workflow

One build-plan slice = one GitHub issue = one branch = one PR into `main`. PRs need green CI and the owner's review; never merge or enable auto-merge yourself. Each PR description ends with a "How to test" checklist written for the dev panel (docs/TESTING.md), and new rules get an e2e test when they involve tabs, keys or notifications.
