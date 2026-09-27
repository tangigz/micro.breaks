# Testing micro.breaks

Three layers, from fastest to most real:

| What                 | Command               | Checks                                                      |
| -------------------- | --------------------- | ----------------------------------------------------------- |
| Rules engine         | `npm test`            | Every product rule, on a fake clock, in milliseconds        |
| End-to-end           | `npm run e2e`         | The real extension in Chrome for Testing: tabs, keys, state |
| By hand, with a demo | `npm run dev` + panel | What it looks and feels like                                |

CI runs the first two on every pull request. The third is yours.

## Once

```bash
cd ~/Developer/micro.breaks
npm install
```

Every command in this guide runs from that folder.

This also downloads **Chrome for Testing** (about 150 MB, once), a separate browser used only for testing. Your own Chrome and its profile are never touched.

On macOS, allow its notifications once: **System Settings › Notifications › Google Chrome for Testing** → Allow, style **Alerts** (so they stay on screen, like in the real week).

## Test a pull request by hand

1. In a terminal, go to the project and get the pull request's code (replace `15` with its number):

   ```bash
   cd ~/Developer/micro.breaks
   gh pr checkout 15
   ```

2. Install anything new and start:

   ```bash
   npm install
   npm run dev
   ```

   A Chrome for Testing window opens with micro.breaks installed. Leave the terminal running: every code change reloads the extension on its own.

3. Open a new tab, click **Dev panel** (top right), and follow the **How to test** list in the pull request.

4. Done? Stop with `Ctrl+C` in the terminal.

The test browser keeps its state between runs (in `.dev-profile/`). To start clean, quit it and delete that folder.

## The dev panel

Only in dev builds; it never ships in the test-week build.

- **Start a fresh day**: clears today and puts the clock at 8:55 (before hours), 9:00, 12:20 (before lunch) or 17:50 (before the day ends), on today's date or the next workday. You're at the computer, so the day starts right then with a full battery.
- **Speed**: 60× makes a minute pass every second. Fast time only flows while a micro.breaks tab is open (the panel counts). **Back to real time** returns to the real clock and real computer activity.
- **Skip ahead**: +1 min to +1 h, minute by minute, so heads-ups, prompts and reminders fire on the way, as they would for real.
- **You**: play the person. **Leave the computer** counts as idle after 5 fake minutes, like Chrome does; **Lock the screen** counts at once. **At the computer** is coming back.
- **Chrome**: closed for 3, 10 or 40 min, then reopened.
- **Last events**: what the engine just logged.

### Recipes

| To see…                          | Do                                                                       |
| -------------------------------- | ------------------------------------------------------------------------ |
| Heads-up, then the prompt        | Fresh day 9:00 · +30 min · +15 min · +5 min · +5 min (heads-up at 9:55, prompt tab at 10:00) |
| A break that counts              | Fresh day 9:00 · +1 h · on the prompt 2, Enter · Leave the computer · +5 min · At the computer |
| Reminders, then "stopped"        | Fresh day 9:00 · +1 h · Esc on the prompt · +5 min three times · +5 min  |
| Skip                             | Fresh day 9:00 · +1 h · Skip this one · look at the main screen          |
| "Did you step away?"             | Fresh day 9:00 · +15 min · Chrome closed for 40 min                      |
| Lunch                            | Fresh day 12:20 · +15 min · then +1 h                                    |
| End of day                       | Fresh day 17:50 · +15 min                                                |

## Automated end-to-end tests

```bash
npm run e2e          # headless, ~15 s
npm run e2e:headed   # watch them run in a window
```

They build the dev extension, load it in Chrome for Testing and drive the dev clock. A failing test prints what happened (tabs opened and closed, background logs) and keeps a trace:

```bash
npx playwright show-trace test-results/<test name>/trace.zip
```

## The test week

The real week runs in your own Chrome, with the production build (no dev panel, real time):

```bash
npm run build
```

Then `chrome://extensions` › Developer mode › **Load unpacked** › `.output/chrome-mv3`.
