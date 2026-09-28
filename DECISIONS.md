# Decisions

Newest first. Each entry is reflected in `docs/spec.html`.

## 2026-09-28 · Break timer and "Recharged."

- **"Still here?"**: while the timer runs, the break tab asks Chrome every 2 s whether there was input in the last 15 s (the shortest window chrome.idle allows). In dev builds, the dev panel's simulated person answers instead.
- **I'm back before 5 min, and Cancel break, turn the tab into the main screen** (overdue), as the spec's "you return to the overdue screen".
- **"Recharged." on the main screen** (unprompted break, "Yes, I moved") plays when the tab is visible, then returns to the normal screen after 8 s, or at once with Back to work. If a break tab was also showing it, that tab closes itself.
- **After a timed break, Back to work closes the break tab.**
- **The ring's 5-min mark turns green at 5 min on the timer**; the break itself counts from 5 min away (engine).
- **E2E tests run with reduced motion**, so they see final states (animation, count-up) at once; `npm run e2e:headed` plays them.

## 2026-09-27 · Break prompt

- **The three breaks live in `src/content/breaks.json`** (the spec says `content/breaks.json`; inside `src/` so the build can import it). Each has a card illustration per intent (bolt, brain, chair) and an activity illustration for the break timer (bolt or footprints at home, droplet, raising hands).
- **"1 h 02 since your last active break" is amber only when the break is due.** Opened early with Start a break now, the time shows in ink ("42 min").
- **No number labels on the prompt cards and no key hints in its header** (your review): the keys 1 2 3, Enter and Esc still work, unannounced.
- **Headlines are set at −0.03em, not the design's −0.045em** (your review): with the Mac's system font, "T" and "i" of "Time to move." touched. Applies to all headlines ("Lunch.", "Done for today.", "Did you step away?").
- **The prompt tab keeps the choice local** until Start my break; reopening the tab starts again from Energy.

## 2026-09-27 · First-run setup

- **The movement timer screen (#7) ships with the setup**, so step 1 offers **Edit** and **Keep these** as designed. Opened from the setup, **Save** returns there with step 1 checked; from the main screen's timer chip, it returns to the main screen.
- **Movement timer: impossible days can't be saved** (the design doesn't cover it): "Your day has to end after it starts.", "Lunch has to end after it starts.", "Lunch has to fit inside your day." The sentence has no "and during [meetings]" in M1.
- **"Allow" opens Chrome's notification settings**: an extension can't ask for the notification permission itself (it's granted at install); the step checks again when the tab regains focus.
- **The test notification is real** (the design's toast is a picture of the macOS alert): "Notifications work." with a Close button, staying until closed.
- **Setup progress is kept** in storage; the pinned tab shows the setup on Chrome start until it's done. The engine runs either way.

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
