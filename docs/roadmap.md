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

## Phase 7: Tools ✅ Complete
Add a Tools section with chord, scale, and key finders, plus a metronome.

---
## Phase 8: Authentication and administration
Account management and better authentication support. Consider moving to a SaaS authentication service, either by default or as an option. Add an admin UI for managing default library content (CRUD) and users, including anointing admins.

---

# Future ideas

* Align the selector values in Inversions and Chords? They currently use different conventions (descriptive vs. common suffixes). The argument against is that `chords-db` uses the suffix style, so we'd need a translation, and these are more the chord symbols you'd see in a song sheet. The Inversions tab is more about studying and memorising inversions for use in improvisation or comping, where the theoretical function of each chord is more relevant.

Practicing:

* Should each practice routine element allow for more than one topic? Might be useful to introduce some degree of optionality to the practice routine without having to create lots of different routines, e.g. add major and minor triads to a single triad study section.
* More streaks/gamification features
* Practice notifications/reminders

Audio:

* Midi playback for scales, arpeggios, and progressions?
* Audio recorder for practice (note this will significantly change data storage requirements)

More theory topics:

* Add support for quartal triads to the Reference section?

# Known issues

* The "OVER THE WHOLE PROGRESSION" scale appears on both the Soloing and Substitutions panels on the Progressions tab on the Reference page. It should only appear on the Soloing panel.

* Functional harmony overrides need more testing
    - I - VI7 - ii - V
    - Tritone sub ii-V-I (ii, bVII7, I)
    - Backdoor dominant (bVII7, I)
    - "Any chord can be a dominant"?

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

## Start phase 8

Currently, there is no way to manage users, and no concept of an administrator. Users also can't change or reset their passwords.

Research the best way to add user mangagement. I want a way to do it for free at low user volumes, but would consider a SaaS solution so long as there is a practical way to run and test "offline" during development. Alternatively, we can build a simple user management and permission system (admin vs. normal is sufficient for now), though this might introduce a dependency on SMTP to send password reset emails and the like, which might require another hosted tool. Note that I am likely to use Vercel for hosting the app itself. Consider the best options and recommend a path forward.

Once this exists, there needs to be a way for an administrator to promote or demote other users as admins. We also need a way to seed the database with a default admin who's forced to set a new password when the app is first set up.

## Standard lessons editor

With admin mode established, create an editor for the default library content. This can use the exact same components and UX as the "Manage my library" screen, except it is editing the default library content.