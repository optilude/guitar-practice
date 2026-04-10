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

Progressions analysis:

* Put the scales/arpeggios/chords/inversions tabs underneath the progression in the Progression Analysis tool? This would give immediate access to this information and allow us to restore the "click to view" capability from chord tiles to arpeggios/chords/inversions and from soloing scales to 

* If doing this, we might consider removing the Progressions tab from the Reference section and making Progressions a top-level navigation action. We could then remove the standalone progressions editor, and instead incorporate CRUD actions into a single progressions page.

* Introduce measures and song structure to progressions/the progressions analysis tool?

Reference:

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

Admin:

* User admin needs pagination and search

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

## Standard lessons editor

Create an admin-only editor for the default library content. The URL should be /admin/library.

Change the "Admin" link so it goes to an intermediary page with two tiles (visually similar to the Tools page tiles). From here, allow access to /admin/users (existing) and /admin/library (new).

On the new "Manage standard library" page, reuse the components and layout/UX of the "Manage my library" screen (but obviously manage the standard library content itself).

Make sure there are server-side permission controls so that only verified admins can manage this content.

Do this in one shot. Follow the recommended approaches to design decisions. Implement (using subagent-driven development) and test (using TDD) immediately.

## Progressions tab

We are going to introduce a new, top-level Progressions page, unifying the Progressions page on the Reference page, the My Progressions editor, and the Progression Analysis tool.

Create a new top-level page called Progressions. Use the Progression Analysis tool page as the starting point - we want to reuse its progression input and analysis (substitutions and soloing) panels.

Add a progression selector drop-down to the top of the new page. This should be the same as the equiavlent drop-down from the Progressions tab on the current Reference page: showing standard progressions categorised, and my progressions in a separate category (if there are any), as well as the "?" (more details) and "+" (study this progression) buttons, with their respective overlays and actions. The "pencil" edit icon should also be copied over, but we will change its purpose (see below).

When a progression is selected, load it into the progression editor chord tiles. From this, we should already have functional harmony analysis and the capability for the user to click on a chord tile and view available soloing scales and substitutions.

A standard progression is read-only. Hide the Save button. Do show a "Save as..." button. The "Save as..." button should create a copy of the progression as a custom progression, with a new title and description entered via pop-up. These should default to the standard title and description.

A custom progression should have Save, Save as (to clone), and Delete as actions. Save just saves the progression as-is, Save as opens a modal to enter a new title/description (defaulting to the current) and then saves and switches to the new copy, and Delete deletes the progression after a modal confirmation dialogue.

The pencil icon next to the progression selection drop-down should only be shown for custom progressions. It should pop up a modal dialogue to change the progression title and/or description, with save and cancel options.

Add (refactor if necessary and fully reuse) the bottom tabs from the Reference page to the Progressions page - that is, the tabs with Scales, Arpeggios, Chords, and Inversions. These should work identically on the new Progressions page as they do on the Reference page.

Ensure that when a chord tile is clicked in the Progressions page, the Arpeggios, Chords, and Inversions tabs are all updated to select the relevant root and chord type.

Add the "right-pointing triangle" icon and link back to the Soloing tab on the Progressions page analysis panel (right side) and restore the functionality so that when a "scale to solo over" is clicked, the Scales tab on the Progressions page is updated to the relevant scale in the relevant key - just like on the Progressions tab.

Once this is done, remove the Progressions tab on the Reference page. Since Modes is now the only tab left, remove the tab bar entirely, leaving only the MODE drop-down selector and associated chord tiles and the Soloing/Substitutions tabs underneath them.

Also remove the previous "My Progressions" edit page. Progressions are now edited only on the Progressions tab.

Finally, remove the Progression Analysis tool.

## Footer

The footer repeats some of the top navigation bar links. Make sure it is up to date. Remember to do this if the navigation bar is changed in future.

## Readme

Review and update the README.md file. Make sure to include:

- An up-to-date, high level description of the app and its capabilities
- Installation instructions (local)
- Development instructions (local)
- Deployment instructions for Vercel
- Deployment instructions for other hosting options (high level)
- First-time setup
- Acnkowledgements and key dependencies (Fretboard.JS, SVGuitar, HubGuitar.com, chords-db)

Keep the description and commands concise but informative.

