# Decisions

Newest first. Each entry is reflected in `docs/spec.html`.

## 2026-09-27 · Main screen

- **At lunch the battery refills gradually** over the lunch hour, from its level at lunch start to full at lunch end (the design animates "fills up to green"). Lunch is still not logged as a break.
- **"Done for today" writes the longest stretch in minutes** ("longest 72 min"), as the design does; the recap uses "1 h 12".
- **Recap and movement timer links** (Today pill, See your day, timer chip) are in place but open nothing until #7 and #10. **Turn on** in the health line opens Chrome's notification settings until the setup (#6) exists.

## 2026-09-27 · Rules engine

- **Unanswered episode** fails 5 min after the third reminder (+20 min).
- **Nothing interrupts while away or on the break timer.** Reminders that come due then are dropped; later ones still fire. Because chrome.idle only reports idle 5 min after the last input, a prompt can still open just after you leave; the break counts when you come back and the episode succeeds.
- **Break timer ends while you're at the computer**: it closes 1 min after zero (the idle signal and the timer end land on the same second when you left right after the click), nothing logged.
- **"Still here?"** shows on activity seen 30 s or more after Start my break.
- **"Did you step away?"** holds prompts until answered; no answer after 5 min counts as seated, then the prompt follows if due.
- **Computer asleep with Chrome open** (no tick for 6+ min) counts as away from the last tick.
- **Time away is clipped** to working hours outside lunch, and can't start before Chrome started.

## 2026-09-27 · Before the build

- **No calendar in M1.** Google Calendar needs a Google Cloud project and OAuth client; too much setup for a one-person test week. Prompts may fire during calls, and a silent call of 5+ min counts as a break. Meeting states, "Skip my meetings" and the "meetings" token are designed but not built. Calendar moves to M2.
- **No "Open Chrome at login" step.** micro.breaks runs once you open Chrome yourself.
- **Reminders are notifications only.** Their Start break reopens (or refocuses) the single prompt tab.
- **An unanswered prompt** behaves like Remind me later: reminders at +5, +10, +15 min; the tab stays open.
- **After Skip or a failed episode**, no heads-up (the battery is already empty); the next prompt fires one interval after the skipped or failed prompt.
- **Episodes cut by lunch** are left out of the 80% goal.
- **Break length** picked on the timer (5/10/15) becomes the default for the next breaks.
- **"Today I work from…"** resets to the office every morning.
- **Export**: an "Export data" link under the recap downloads the event log and daily stats as JSON, including prompt episodes (succeeded, failed, cut).
- **Tokens**: the design export wins where it differs from the spec (light `pill` is `#EBEBEF`; `attBg`, `line2`, `onPos`, `dotOff`, idle battery grey come from the design).
- **Stack versions**: TypeScript 6.0 (typescript-eslint does not support 7 yet), Tailwind v4, Vitest 5, WXT 0.21.
