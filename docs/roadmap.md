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

## Progressions tab

We are going to introduce a new, top-level Progressions page, unifying the Progressions page on the Reference page, the My Progressions editor, and the Progression Analysis tool. 

Do this in a new feature branch. No need to use git worktrees. Try to do it in one shot (trust your recommendations on design decisions) as this session will be left unattended for some time. Do not merge the branch to main or attempt to publish it. I will review it once implemented. Use subagent based implementation and the Superpowers design, spec, review, etc. skills as normal.

Create a new top-level page called Progressions. Add a link in the top and footer navigation bar, after Reference.

Use the Progression Analysis tool page as the starting point. It contains about two-thirds of what we need: we will reuse its progression / chord tile input and analysis (substitutions and soloing) panels. The layout with input on the left and analysis on the right is also correct.

Add a progression selector drop-down to the top of the new page, in a new row above the current two-column layout.

This drop-down should be the same as the equivalent drop-down from the Progressions tab on the current Reference page: showing the built-in/standard progressions in their categories, and "My progressions" in a separate category (if there are any), as well as the "?" (more details) and "+" (study this progression) buttons, with their respective overlays and actions working exactly as they do now on the Reference page.

The "pencil" edit icon should also be copied over, but we will change its purpose to open an "edit title + description" modal – see below.

When a progression is selected, load it into the progression editor chord tiles. From this, we should already have functional harmony analysis (roman numerals), and the capability for the user to click on a chord tile and view available soloing scales and substitutions in the panels on the right side of the screen.

Below the progression chord tile input, the possible buttons are: Save (primary), Save as (secondary, unless save is hidden, in which case it's primary), and Delete (destructive)

When loading a standard progression, it read-only, so hide the Save button and make the "Save as..." button the primary styling.

The "Save as..." button should create a copy of the current progression as a custom progression, with a new title and description, entered by the user via pop-up. These should default to the standard progression's title and description (in Markdown format).

A custom progression should have all three buttons – Save, Save as (to save a copy), and Delete. Save just saves the progression as-is, Save as opens a modal to enter a new title/description (defaulting to the current) and then saves and switches to the new copy, and Delete deletes the progression, after a modal confirmation dialogue.

The pencil icon next to the progression selection drop-down should only be shown for custom progressions. It should pop up a modal dialogue to change the progression title and/or description, with Save and Cancel buttons.

Add (refactor if necessary and fully reuse) the bottom tabs from the Reference page to the Progressions page - that is, the tabs with Scales, Arpeggios, Chords, and Inversions. These should work identically on the new Progressions page as they do on the Reference page. They should be in a new row below the chord tile input (left side) and analysis (right side), using the full width of the page, just like they do on the Reference page.

Ensure that when a chord tile is clicked in the Progressions page, the Arpeggios, Chords, and Inversions tabs are all updated to select the relevant root and chord type.

Add the "right-pointing triangle" icon and link back to the Soloing tab on the Progressions page analysis panel (right side) and restore the functionality so that when a "scale to solo over" is clicked, the Scales tab on the Progressions page is updated to the relevant scale in the relevant key - just like on the Progressions tab. This should hopefully make it possible to reuse the Soloing tab in the analysis panel between the Reference and Progressions page. Try to maximise DRY.

Once this is done, remove the Progressions tab on the Reference page. Since Modes is now the only tab left, remove the tab bar entirely from the top-right harmony panel, leaving only the MODE drop-down selector and associated chord tiles and the Soloing/Substitutions tabs underneath them.

Also remove the previous "My Progressions" edit page. Progressions are now edited only on the Progressions tab.

Finally, remove the Progression Analysis tool.

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

