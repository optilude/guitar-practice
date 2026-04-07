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
Account management and better authentication support. Consider moving to a SaaS authentication service, either by default or as an option. Add an admin UI for managing default library content (CRUD) and users, including anointing admins.

---

# Future ideas

* Improve the metronome on the practice session page (different time signatures, different beat patterns)

* All the user to add additional progressions (Reference tab)

* Align the selector values in Inversions and Chords? They currently use different conventions (descriptive vs. common suffixes). The argument against is that `chords-db` uses the suffix style, so we'd need a translation, and these are more the chord symbols you'd see in a song sheet. The Inversions tab is more about studying and memorising inversions for use in improvisation or comping, where the theoretical function of each chord is more relevant.

* Should each practice routine element allow for more than one topic? Might be useful to introduce some degree of optionality to the practice routine without having to create lots of different routines, e.g. add major and minor triads to a single triad study section.

* More streaks/gamification features
* Practice notifications/reminders

* Midi playback for scales, arpeggios, and progressions?
* Audio recorder for practice (note this will significantly change data storage requirements)

# Known issues

* "+ New goal" is left-aligned. Should be "+ Add goal" and centre aligned.

General/UX:

* More comprehensive testing on mobile/iPad

Scales:

* When switching between light and dark mode, the stave view is corrupted until the view is changed (e.g. click a different tab in the UI)
* Review/refine the chord-to-scale mapping. It might be somewhat naive.

Chords:

* There are issues with some of the chord voicings (e.g. strange barres) - consider finding a better source than `chords-db`.

# Resources / notes

* Music theory: https://www.simplifyingtheory.com

# Prompts

## Start phase 7

Let's build the chord finder tool using the Superpowers plugin.

- Create a 6-fret chord box like the one used for the Fingerings boxes on the Chords tab. Let the user pick the start fret (default to fret 1, at the nut). Then let the user click on any fret to toggle a dot (finger) on that fret.
- In real time, calculate any possible chord or inversion that could represent that fingering, starting with the simpler or more obvious ones. Root position inversions (i.e. root note in the bass) would be more obvious than other inversions, for instance.
- By default, consider this for any scale (but in this case, prefer flats over sharps and don't list all enharmonics). However, allow the user to also select a key and scale/mode (using the same dropdowns as for the Scales tab in the Reference section), in which case the chord options should be calculated relative to this.

Consider how best to implement and test this, noting that will add other "finder" tools shortly, so we should establish UX patterns that make sense for those too.

- Build the scale finder. Render a fretboard like the one used in the Fretboard panels on the Reference page. Allow the user to click on any fret/string to add a note. In real time, list all scales that contain these notes. By default, consider only the modes of the major key (but any key centre). However, allow the user to choose a specific key centre, and in this case, calculate all scales that could contain these notes with that key centre.

- Build the key finder. Allow the user to enter a set of chords, visually following the style of the harmony section (Modes and Progressions) on the Reference tab. Click "+" to add a new chord and type in the chord symbol. Use autocomplete to limit to known chord types (per the Chord tab on the Reference panel). Allow drag-and-drop to reorder chords in the progression, as well as removing erroneous chord tiles. In real time, calculate all valid keys for a progression containing these chords, with more common or likely ones first. If necessary, consider the first and/or last chord as resolutions to the key centre, and use knowledge of harmony (e.g. 7th chords may be V of a key, or part of V-I or ii-V-I) to guide the key finding.

- Build the transposer. Enter a progression in the same vein as for the key finder, but have the user explicitly select a key centre and scale/mode from a drop-down similar to the one used for the Modes tab on the harmony section of the reference page. then allow the user to choose a target key centre and show the same chords transposed to this new key.

- Build the standalone metronome. Base this on the simple metronome from the practice session view, but allow the user to choose alternative time signatures (e.g. 6/8 or 3/4, but default to 4/4) and to play only certain beats of the masure (e.g. "2 and 4"). If helpful, we can introduce additional dependencies for the metronome component.

## Start phase 8

Currently, there is no way to manage users, and no concept of an administrator. Users also can't change or reset their passwords.

Research the best way to add user mangagement. I want a way to do it for free at low user volumes, but woudl consider a SaaS solution, so long as there is a practical way to run and test "offline" during development. Alternatively, we can build a simple user management and permission system (admin vs. normal is sufficient for now), though this might introduce a dependency on SMTP to send password reset emails and the like, which is just another dependency. Consider the best options and recommend a path forward.

Once this exists, there needs to be a way for an administrator to promote or demote other users as admins. We also need a way to seed the database with a default admin who's forced to set a new password when the app is first set up.

With admin mode established, create an editor for the default library content. This can use the exact same components and UX as the "Manage my library" screen, except it is editing the default library content.