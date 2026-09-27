# micro.breaks

Move a little, every hour you sit. A Chrome extension that drains a battery while you sit and prompts a short break away from the computer.

The source of truth for product, design and tech is [`docs/spec.html`](docs/spec.html).

## Run it

Requires Node 22+.

```bash
npm install
npm run dev
```

Then, once:

1. Open `chrome://extensions`, turn on **Developer mode** (top right).
2. **Load unpacked** → pick the `.output/chrome-mv3-dev` folder of this repo.

The extension now reloads itself whenever the code changes. Tip: use a separate Chrome profile for development, so test days don't mix with your real week.

For the test week, use the production build instead: `npm run build`, then **Load unpacked** → `.output/chrome-mv3`.

## Check

`npm run check` runs what CI runs: typecheck, lint, format, tests, build.
