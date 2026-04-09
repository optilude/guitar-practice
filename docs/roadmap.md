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

* Add more sophisticated substitutions support to the progressions view
* Add functional harmony to all progression views (e.g. detect ii-V-I and display appropriately in Roman numeral analysis) – Progressions tab on the Reference page, key finder, custom progression editor
* Create a new tool to analyse a progression using functional harmony analysis. This may need to be aware of bars as well as just a sequence of chords.

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

## Chord substitutions

We are going to add a "chord substitutions" capability to the Reference view viewing a Progression (standard or custom).

This should live in a new feature branch, which I will test carefully before merging to main.

We already have "Scales to solo over" available when choosing any chord in a progression. Put this behind a secondary tab called "Soloing", with the same style and function as the "Soloing" panel under the "Chords" and "Inversions" tabs at the bottom of the ference page.

Next to this tab, add a second tab called "Substitutions". This is where the new substitutions UI lives.

A set of known substitution rules have been extracted from an authoritative source and placed in `docs/research/chord_substitution_rules.yaml`. We will use this to seed the system, but not introduce a build or runtime dependency on this file specifically. The key information here is the name, applicable contexts (needs to be understood and mapped to logic that can be used to analyse a progression), effect (user-friendly description of how the substitution works), and mechanics (the rule to apply). Study this file to understand its structure and reason about how it can be adopted in this application. Some tweaks to how we manage music theory data is acceptable, but if it is too difficult to do reliably, we should abandon this endeavour.

In terms of UX, the list of valid substitutions (calculated to match the current key) should appear when selecting a chord tile in the progressions panel. Clicking a substitution option in the list should then temporarily swap it into the visual progression (suitably highlighted, e.g. a dashed outline), allowing the user to see the updated Roman numerals and hear how it resolves to the next chord.

It is likely that we will need to consider the next (and possibly previous) chord in the progression to apply chord substiutions rules.

Some substitutions may depend on information we don't have, e.g. melody notes. We should probably ignore these but consider if there are ways to make the user aware of them.

## Start phase 8

Currently, there is no way to manage users, and no concept of an administrator. Users also can't change or reset their passwords.

Research the best way to add user mangagement. I want a way to do it for free at low user volumes, but would consider a SaaS solution so long as there is a practical way to run and test "offline" during development. Alternatively, we can build a simple user management and permission system (admin vs. normal is sufficient for now), though this might introduce a dependency on SMTP to send password reset emails and the like, which might require another hosted tool. Note that I am likely to use Vercel for hosting the app itself. Consider the best options and recommend a path forward.

Once this exists, there needs to be a way for an administrator to promote or demote other users as admins. We also need a way to seed the database with a default admin who's forced to set a new password when the app is first set up.

With admin mode established, create an editor for the default library content. This can use the exact same components and UX as the "Manage my library" screen, except it is editing the default library content.