# micro.breaks

Move a little, every hour you sit. A Chrome extension that drains a battery while you sit and prompts a short break away from the computer.

The source of truth for product, design and tech is [`docs/spec.html`](docs/spec.html).

## Run it

Requires Node 22+.

```bash
npm install   # also downloads Chrome for Testing, once
npm run dev   # opens it with micro.breaks installed, reloads on every change
```

Open a new tab, then **Dev panel** to move time and play the person at the computer. How to test a pull request, the dev panel and the automated tests: [`docs/TESTING.md`](docs/TESTING.md).

## Check

`npm run check` runs typecheck, lint, format, unit tests and build; `npm run e2e` runs the extension end-to-end in Chrome for Testing. CI runs both on every pull request.

For the test week, use the production build in your own Chrome: `npm run build`, then `chrome://extensions` › Developer mode › **Load unpacked** › `.output/chrome-mv3`.
