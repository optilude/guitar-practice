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
- Build practice routines (drawing from the library and reference)


---

## Phase 5: Progress Tracking
Run a practice session: timer, metronome, flashcards, notes. Session logs, streaks, and per-topic completion status (linked to Phase 2 library content). Phase 4 and 5 are closely coupled — may be worth combining into one phase when the time comes.

---

# Future ideas

* Better account management (at least change + reset password) – consider moving to OAuth

* Harmonic Minor and Melodic Minor mode systems for harmony viewer
* Enrich the set of "scales to solo over this chord" options
* Add drop-2 and drop-3 voicings for chords (if not already included)

* Admin UI to manage default links
* UI to allow users to add their own section to the library (list of links)

* More streaks/gamification features

* Audio recorder for practice

# Known issues

UX:

* Reference view does not work well in dark mode - none of the lines are visible so we only see text

Scales:

* Need to find a way to test that they are in fact being rendered correctly

Chords:

* There are issues with some of the chord voicings (e.g. strange barres)
* Some chord voicings are missing
* The triad viewer sometimes renders a dot outside the box when there is a 5-fret spread

# Resources / notes

* Chords: https://github.com/szaza/guitar-chords-db-json - 99k voicings (machine generated)
* Chord rendering: https://github.com/omnibrain/svguitar - can render interval names

# Prompts

## Modes

Change the name of the "Harmony" tab to "Modes".

When selecting a mode other than Ionian, show the parent major key next to the mode selector, on the same line.

Add a checkbox (default off) called "Relative". If ticked, change the roman numeral position of the relative major key, so e.g. if the key is D and the mode is Dorian, then the first chord, Dm7, would be listed as "ii" (second diatonic chord of C major) instead of "i" (first diatonic chord of D dorian). Add a tooltip (title attribute).

Put this checkbox on the same line as the "Diatonic 7th chords". To make it fit, simplify the title – no need to repeat the scale name since it's already shown on screen via the Circle of Fifths and drop-down.

## Scale selector

Decouple the circle of fifths from the Scale, Arpeggio, Chord, and Triad references.

For each, add a "Root" dropdown to the left of the existing "Scale type", "Chord type", and "Triad type" selectors. This should contain all possible roots notes in alphabetical order. Show enharmonic notes as two separate entities so it goes "Ab, A, A#, Bb, B, C, C#, Db, D" and so on.

Make the rest of the content in each tab use this as its root, rather than the Circle of Fifths data.

## Start phase 4

Phase 3 is done for now! Let's move onto Phase 4: Goals and Routines. We will cover the 
- Set learning goals
- Build practice routines (drawing from the library)
- Manage goals and routines 

Managing goals:

- Let the user define **Goals**, eg “Follow the changes on a jazz blues progression”. 
- Goals should have a title and a short description, which should be simple Markdown formatted.
- It should also be possible to rename, archive, unarchive, and delete goals
- At any one time, a single goal is active, and this should be persisted across browser sessions and logins.
- Other unarchived goals should be quick to select, maybe from the top level bar.
- Archived goals should be hidden behind a secondary page/UI, from which they can be unarchived or deleted permanently.

Assigning topics to goals:

- Against any lesson or reference item, the user can click "Add to goal" to make it a **Topic** of study against a goal.
- This should default to the currently active goal, but also easily allow any other un-archived goal to be used, probably in an overlay dialogue box.
- We will need an unobtrusive but obvious way to do this at various points in the UI, e.g. next to a lesson in the topic list, for a given scale, arpeggio type, chord type, triad, harmony, or progression. In the reference viewer, this will probably be next to the top level selector for "Triad type", "Chord type", "Scale type", etc.
- For each topic of study linked to a goal, we need to store what it is (lesson, triad, arpeggio, progression, etc.), and the type of thing per the primary selector (e.g. "maj7 arpeggio" or "diminished triad"), and the _default_ key (i.e. the one currently selected), though later we will have more options for modulating the key.

Managing routines

- Against each goal, we need a way to create/manage (CRUD) one or more **Routines**
- A routine has a fixed duration in minutes, a title, and a Markdown-formatted description.
- A routine consists of multiple, separately timed **Sections** of different **Section Types**: warmup, technique, theory, lessons, songs, free practice. It can include 0, 1, or multiple sections of each type.
- Research recommended guitar practice routines to suggest a default structure, but allow it to be modified
- This means we need a simple UI to add, remove, and re-order sections in a routine.
- Each section should have a title, description (Markdown formatted again) and zero or more relevant topics
- The topics are selected from the list of Topics previously added to the Goal.
- When adding a reference topic that is relevant to a key, default to the key that was saved when the topic was added, but also allow selecting all or a set of keys from a list, and then choosing: chromatic up, chromatic down, circle of fifths up, circle of fourths down, or random. This will be used in the practice session later.

This phase is finished when we have a robust way to manage goals, assign study topics to goals, create routines within a goal, and manage the sections within each routine.x    