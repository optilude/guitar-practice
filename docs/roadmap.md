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

* Change Triads to Inversions. The first category should be the basic triads like now, but this adds many (!) more types.
* Add the Soloing tab to Inversions

* Add a footer with some basic information / links. Apart from being informative, this will help ensure the content doesn't end right at the bottom of the window, which can be harder to read.

* Should each practice routine element allow for more than one topic? Might be useful to introduce some degree of optionality to the practice routine without having to create lots of different routines, e.g. add major and minor triads to a single triad study section.

* Harmonic Minor and Melodic Minor mode systems?

* Create a "tools" section with...
  - A chord calculator (fingerings -> chord name)
  - A standalone metronome
  - A key finder (chords -> progression key)
  - Transposition tools?

* More streaks/gamification features
* Practice notifications/reminders

* Midi playback for scales, arpeggios, and progressions?
* Audio recorder for practice (note this will significantly change data storage requirements)

# Known issues

Scales:

* When switching between light and dark mode, the stave view is corrupted until the view is changed (e.g. click a different tab in the UI)
* Scales note viewer has standard notation on a stave. Some of the low notes appear really low - are they actually correct? They may be transposed down an octive or two.
* Find a way to test scale patterns and tabs for accuracy
* Review/refine the chord-to-scale mapping. It might be somewhat naive.

Chords:

* There are issues with some of the chord voicings (e.g. strange barres)
* The `capo` key in the `chords-db` dataset may be causing confusion, but we cannot filter it out since we lose all the barre chords

# Resources / notes

* Chords: https://github.com/szaza/guitar-chords-db-json - 99k voicings (machine generated)
* Chord rendering: https://github.com/omnibrain/svguitar - can render interval names
* Music theory: https://www.simplifyingtheory.com
* Guitar lessons: https://hubguitar.com

# Prompts

## Start phase 6

We now need to tackle running and tracking practice sessions.

On the front page, show the current goal and all available practice routines for that goal in a nice, easy-to-access list.

When the user clicks a practice routine, go to a "Practice Session" page configured for that routine.

This page shows the elements of that routine in order, a countdown timer with start/pause/restart options, an "end session" option, and an always-visible Markdown formatted text area for keeping track of notes related to the session.

Also include the option of starting a simple metronome, with a bpm entry box, start, and stop buttons. Play a simple click sound when the metronome runs.

Design a "flash card" UI that will be used to present each practice session element. The idea is that when a practice session runs, the user is shown the topic of study – either the name of a lesson in the library, or a particular item from the reference section, which may have a key, and that key may modulate based on the rules of the practice routine element – on the flash card related to each practice session element.

The user can on a flash card see relevant details as the card "turns". For lessons, that's just a link that opens in a new window. For reference elements, it should be the appropriate card/panel from the reference section, rendered inline on the "back" of the flashcard, so the user can review the information without having to leave the practice UI.

Move the user between the practice rotine elements in accordance with the routine timings and the practice countdown clock (which may be paused).

Add buttons to let the user move backwards or forwards through the practice routine elements. Also let them jump straight to one by clicking on it. When manually moving between elements, the practice timer should adjust accodingly, showing the time remaining for that section and the whole routine, as if just arriving at the start of the section.

When the timer is completed, or the user manually ends the session, show a modal dialogue to allow the user to save or discard the session. On this, show the practice notes, which the user will have been able to add to during the session. Let the user amend the notes as needed.

All completed (non-discarded) sessions should be shown on the History view. Show a simple calendar that indicates days of practice and, when clicking a day, show any practice sessions on that day. Allow this to be filtered by goal.

Let the user click a practice routine and then see the start and end date and time (i.e. real time, in the timezone they were in when they ran the session, if if that timezone has now changed) of the practice session, the structure they followed, the topics they studied, and any notes.

It is possible that a practice routine is deleted or modified after the session has been completed. Therefore, we need to store the full details of what was studied in the history, not just a reference to a practice routine element.

Allow the user to delete previous practice sessions if saved in error, but put this behind a confirmation dialogue.

Also show recently completed sessions specific to a goal underneath that goal on the Goals page.

