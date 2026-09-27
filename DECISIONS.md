# Decisions

Newest first. Each entry is reflected in `docs/spec.html`.

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
