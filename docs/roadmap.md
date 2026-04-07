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

## Phase 6: Sessions and Progress Tracking ✅ Complete
Run a practice session: timer, metronome, flashcards, notes. Session logs, streaks, and per-topic completion status (linked to Phase 2 library content).

---

## Phase 7: Tools
Add a Tools section with chord, scale, and key finders, plus a metronome.

---
## Phase 8: Authentication and administration
Account management and better authentication support. Admin UI for managing users and library content (CRUD).

---

# Future ideas

* Improve the metronome on the practice session page (different time signatures, different beat patterns)

* Align the selector values in Inversions and Chords? They currently use different conventions (descriptive vs. common suffixes). The argument against is that `chords-db` uses the suffix style, so we'd need a translation, and these are more the chord symbols you'd see in a song sheet. The Inversions tab is more about studying and memorising inversions for use in improvisation or comping, where the theoretical function of each chord is more relevant.

* Should each practice routine element allow for more than one topic? Might be useful to introduce some degree of optionality to the practice routine without having to create lots of different routines, e.g. add major and minor triads to a single triad study section.

* More streaks/gamification features
* Practice notifications/reminders

* Midi playback for scales, arpeggios, and progressions?
* Audio recorder for practice (note this will significantly change data storage requirements)

# Known issues

* On the history view, days with a streak are highlighted with a background circle and bold date number. Do not bold the text (leave it the same as the other text).
* On the history view, today's date in the calendar uses the orange font colour for the date number. Revert to black text, but make it bold.
* On the history view, when selecting a date on the calendar, it is shown with a pill-shaped orange background. If the selected date does not contain any practice sessions, make this background gray instead.

* Practice session page: The "Next" and "Prev" buttons at the bottom are not visible without scrolling. Find a way to bring them into view.
* Also, if there are a sufficient number of routine sections, the box scrolls horizontally. This is OK, but the currently selected/running section needs to always be in view. Using auto-advance or the next/prev buttons, it's possible for it to be outside the visible area.

General/UX:

* More comprehensive testing for dark mode
* More comprehensive testing on mobile/iPad

Scales:

* When switching between light and dark mode, the stave view is corrupted until the view is changed (e.g. click a different tab in the UI)

* Find a way to test scale patterns and tabs for accuracy
* Review/refine the chord-to-scale mapping. It might be somewhat naive.

Chords:

* There are issues with some of the chord voicings (e.g. strange barres) - consider finding a better source than `chords-db`.

# Resources / notes

* Music theory: https://www.simplifyingtheory.com

# Prompts

## Start phase 7

Add a new top-level nav section: Tools. Also add this to the footer.

The Tools page should have tiles or other selectors similar to the Library page, though with sensible icons for each tool.

- The first tool is a chord calculator. Render a 6-fret chord box like the one used for the Fingerings boxes on the Chords tab. Let the user pick the start fret (default to fret 1, at the nut). Then let the user click on any fret to toggle a dot (finger) on that fret. In real time, calculate any possible chord or inversion that could represent that fingering, starting with the simpler or more obvious ones. Root position inversions (i.e. root note in the bass) would be more obvious than other inversions, for instance. By default, consider this for any scale (but in this case, prefer flats over sharps and don't list all enharmonics). However, allow the user to also select a key and scale/mode (using the same dropdowns as for the Scales tab in the Reference section), in which case the chord options should be calculated relative to this.

- The second tool is a scale calculator. Render a fretboard like the one used in the Fretboard panels on the Reference page. Allow the user to click on any fret/string to add a note. In real time, list all scales that contain these notes. By default, consider only the modes of the major key (but any key centre). However, allow the user to choose a specific key centre, and in this case, calculate all scales that could contain these notes with that key centre.

- The third tool is a key finder. Allow the user to enter a set of chords, visually following the style of the harmony section (Modes and Progressions) on the Reference tab. Click "+" to add a new chord and type in the chord symbol. Use autocomplete to limit to known chord types (per the Chord tab on the Reference panel). Allow drag-and-drop to reorder chords in the progression, as well as removing erroneous chord tiles. In real time, calculate all valid keys for a progression containing these chords, with more common or likely ones first.

- The fourth tool is a transposer. Enter a progression in the same vein as for the key finder, but have the user explicitly select a key centre and scale/mode from a drop-down similar to the one used for the Modes tab on the harmony section of the reference page. then allow the user to choose a target key centre and show the same chords transposed to this new key.

- The fifth tool is a standalone metronome. Base this on the simple metronome from the practice session view, but allow the user to choose alternative time signatures (e.g. 6/8 or 3/4, but default to 4/4) and to play only certain beats of the masure (e.g. "2 and 4"). If helpful, we can introduce additional dependencies for the metronome component.