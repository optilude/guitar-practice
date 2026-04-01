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

## Phase 3: Music Theory Engine
Integrate TonalJS to power interactive music theory tools: scales, chords, circle of fifths visualisation. Needs design/brainstorming session before implementation.

---

## Phase 4: Goals, Routines & Practice Session UI
The core practice workflow:
- Set learning goals
- Build practice routines (drawing from the library)
- Run a session: timer, metronome, flashcards, notes

---

## Phase 5: Progress Tracking
Session logs, streaks, and per-topic completion status (linked to Phase 2 library content). Phase 4 and 5 are closely coupled — may be worth combining into one phase when the time comes.

---

# Future ideas

* Add drop-2 and drop-3 voicings for chords (if not already included)

* Add chromatic scale (to show all intervals)

* Content source / attribution for all links in library
* Admin UI to manage default links
* UI to allow users to add their own section to the library (list of links)

* More streaks/gamification features

* Audio recorder for practice

* Better account management (at least change + reset password) – consider moving to OAuth

# Known issues

Chords:

* There are reported issues with some of the chord voicings. We might need a better source library and/or renderer than chords-db/react-chord.
* The triad viewer sometimes renders a dot outside the box when there is a 5-fret spread, e.g. C major 4-2-1 open 2nd inversion.
* Some chord types are showing invalid barres e.g. 9th chords

# Resources / notes

* Guitar chords in JSON format: https://github.com/szaza/guitar-chords-db-json
* Fretboard.js: https://github.com/moonwave99/fretboard.js

# Prompts

## Chromatic scale

Add the chromanic scale to the scale viewer. The purpose of this, in particular, is to be able to show the intervals for every note on the fretboard relative to a key, as well as showing all the note names.

## Arpeggio viewer

I'd like the chord selector for the arpeggio viewer to be the same as for the chord viewer. If it's impractical to include all chord types, I'm ok to limit them, but they should be in the same groupings and order.

## Start phase 4

Phase 3 is done for now! Let's move onto Phase 4: Goals, Routines & Practice Session UI. This covers the core practice workflow:
- Set learning goals
- Build practice routines (drawing from the library)
- Run a session: timer, metronome, flashcards, notes

Here are the original specifications, slightly expanded:

Basic flow:

- Let the user define goals, eg “Follow the changes on a jazz blues progression”. Goals should have a title and a short description. Bonus if this can be Markdown formatted.
- It should also be possible to rename, archive, unarchive, and delete goals
- At any one time, a single goal is active, and the previous session’s goal should be the default. Other unarchived goals should be quick to select. Archived goals should be hidden behind a secondary page/UI. The goal should be persistent across sessions for each user, i.e. the currently active goal is saved.
- For each goal, pick the relevant topics to study. This should include conceptual lessons as well as specific scales, arpeggios, chords/voicings etc from the music theory system. So either – pick one or more lessons from the list of lessons, or pick one or more scales, arpeggios, chords, or triads using filters equivalent to the ones on the Reference page.
- Create (CRUD) one or more routines against this goal. A routine has a fixed duration in minutes. It consists of separately timed sections by type eg technique warmup, scales/arpeggio warmup, the main topic(s), song practice, free practice. Research recommended guitar practice routines to suggest a default structure, but allow it to be modified: elements included, their order, and duration.
- The front page of the app should simply and easily give access to the current goal and practice routine, and make it easy to change to a different route within the goal or a different goal.
- A one click action should launch the routine with a timer keeping track of routine timings. It must be possible to pause the timer, or prematurely end the session.
- When ending a session (either manually or because the timer ran out), give the option to save it (default) or discard it.

More details on practice routine elements:

- Routine elements need to support different types
- Lesson: Provide a link to the lesson but otherwise just show a timer
- Scale, arpeggio practice, chord: Moving through the selected key(s) either chromatically, randomly, or through the circle of fourths/fifths (user can choose which when setting up the routine).
- When running a routine, show a “flash card” for each element, where an item to practice is shown without detail, but the detail is revealed if the user clicks the card to “turn it”. The timer should be shown next to the flash card.
- Include a simple metronome function that can be started or stopped at any time. It can play a basic sound but should support different tempos, time signatures and beat patterns. Let this be available during any practice session and at all times.
