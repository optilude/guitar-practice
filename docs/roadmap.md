# Guitar Practice App — Roadmap

## Phase 1: Foundation ✅ Complete
Tech stack, authentication (email + password), UI shell, navigation, dark/light mode, PWA manifest, Docker deployment.

Spec: `docs/superpowers/specs/2026-03-31-phase1-foundation-design.md`

---

## Phase 2: Content Library ✅ Complete
Browsable reference library of guitar learning topics sourced from HubGuitar's public sitemap. 264 topics across 6 categories (Fretboard Knowledge, Music Theory, Improvisation, Technique, Sight Reading, Songs). Topics link out to HubGuitar — no content is copied locally. Curriculum ordering preserved via `scripts/fetch-topic-order.ts`.

Spec: `docs/superpowers/specs/2026-03-31-phase2-content-library-design.md`

Note: per-topic progress tracking (Not Started / In Progress / Done) is deferred to Phase 5 — the schema is ready for it (`UserTopicProgress` table to be added).

---

## Phase 3: Music Theory Engine ✅ Complete
Integrate TonalJS to power interactive music theory tools: scales, chords, circle of fifths visualisation. Needs design/brainstorming session before implementation.

---

## Phase 4: Goals and Routines Management ✅ Complete
The core practice workflow:
- Set learning goals
- Build practice routines (drawing from the library and reference)

---

## Phase 5: Custom library ✅ Complete
Allow the user to maintain a custom library of lessons.

---

## Phase 6: Sessions and Progress Tracking
Run a practice session: timer, metronome, flashcards, notes. Session logs, streaks, and per-topic completion status (linked to Phase 2 library content).

---

## Phase 7: Authentication and administration
Account management and better authentication support. Admin UI for managing users and library content (CRUD).

---

# Future ideas

* Align the selector values in Inversions and Chords? They currently use different conventions (descriptive vs. common suffixes). The argument against is that `chords-db` uses the suffix style, so we'd need a translation, and these are more the chord symbols you'd see in a song sheet. The Inversions tab is more about studying and memorising inversions for use in improvisation or comping, where the theoretical function of each chord is more relevant.

* Should each practice routine element allow for more than one topic? Might be useful to introduce some degree of optionality to the practice routine without having to create lots of different routines, e.g. add major and minor triads to a single triad study section.

* Create a "tools" section with...
  - A chord calculator (fingerings/notes -> chord name - use fretboard visualisation)? 
  - A key finder (chords -> progression key)?
  - A scale finder (put notes on fretboard, calculate possible keys)?
  - A standalone metronome?
  - Transposition tools?

* More streaks/gamification features
* Practice notifications/reminders

* Midi playback for scales, arpeggios, and progressions?
* Audio recorder for practice (note this will significantly change data storage requirements)

# Known issues

Practice session UI:

* If a practice session has been started (even if currently paused), and the user navigates away (either by browser action or clicking a link in the app), use a modal to give them the option to stay on the session to not lose progress

Inversions:

* When rendering an inversion on a low string, so that the highest used fret is fret 5 or 5 or lower, adjust the chord diagram so that it is always shown at the nut, even if that means the lowest visible fret (fret 1) is unused. An example would be Bb major, 2nd inversion, strings 4-3-2. It's currently rendered as three notes on the first visible fret with the box fixed 3fr. It would be more logical to show this box anchored at the nut, with the three notes on the third fret.
* For inversions that are omitting one or more chord tones, call these out ("No root", etc.)

General/UX:

* More comprehensive testing for dark mode
* More comprehensive testing on mobile/iPad
* Review button, action link, and modal dialogue styles for consistency

Scales:

* When switching between light and dark mode, the stave view is corrupted until the view is changed (e.g. click a different tab in the UI)

* Find a way to test scale patterns and tabs for accuracy
* Review/refine the chord-to-scale mapping. It might be somewhat naive.

Chords:

* There are issues with some of the chord voicings (e.g. strange barres) - consider finding a better source than `chords-db`.

# Resources / notes

* Music theory: https://www.simplifyingtheory.com

# Prompts

