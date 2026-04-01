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

## Implement Fretboard.js

The fretboard view of scales and arpeggios is not working. I want to change direction and use a different tool: Fretboard.js.

GitHub: https://github.com/moonwave99/fretboard.js
Docs: https://moonwave99.github.io/fretboard.js/documentation-fretboard.html and https://moonwave99.github.io/fretboard.js/documentation-music-tools.html

The goal is to be able to show the whole fretboard as a single graphic, with the relevant notes overlaid and the ability to display either intervals or note names. By default, show all relevant notes, but also allow choosing _either_ a 3NPS box, a pentatonic box (only for the pentatonic and blues scales), or a CAGED anchor to highlight. See https://moonwave99.github.io/fretboard.js/examples-systems.html for an example.

It should be possible to toggle between showing note names or intervals. The root, third, fifth, and seventh degrees (with accidentals relevant to the scale) should be colour-coded consistently with the colour codings used on the scale/arpeggio tab view.

For argpeggios, only show the arpeggio notes, obviously, but use the same visualisation system.

If Fretboard.js does not easily support certain scales/arpeggios that we currently render, keep track of which ones and ask me what to do.

## Chromatic scale

Add the chromanic scale to the scale viewer. The purpose of this, in particular, is to be able to show the intervals for every note on the fretboard relative to a key, as well as showing all the note names.

