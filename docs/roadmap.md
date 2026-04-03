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
Run a practice session: timer, metronome, flashcards, notes. Session logs, streaks, and per-topic completion status (linked to Phase 2 library content).

---

## Phase 6: Custom library
Allow the user to maintain a custom library of lessons.

---

## Phase 7: Authentication and administration
Account management and better authentication support. Admin UI for managing users and library content (CRUD).

---

# Future ideas

* Should each practice routine element allow for more than one topic? Might be useful to introduce some degree of optionality to the practice routine without having to create lots of different routines.

* Harmonic Minor and Melodic Minor mode systems?

* Enrich the set of "scales to solo over this chord" options
* Consider having this feature for any chord in the Chords panel, not just the harmony panel, since it's easier to look up a specific chord there.

* Add drop-2 and drop-3 voicings for chords (if not already included)
* In general, add more inversions and organise them better

* More streaks/gamification features
* Practice notifications/reminders

* Audio recorder for practice (note this will really change data storage and storage costs)

# Known issues

Scales:

* When switching between light and dark mode, the stave view is corrupted until the view is changed (e.g. click a different tab in the UI)
* Scales note viewer has standard notation on a stave. Some of the low notes appear really low - are they actually correct? They may be transposed down an octive or two.
* Find a way to test scale patterns and tabs for accuracy

Chords:

* There are issues with some of the chord voicings (e.g. strange barres)
* The triad viewer sometimes renders a dot outside the box when there is a 5-fret spread

# Resources / notes

* Chords: https://github.com/szaza/guitar-chords-db-json - 99k voicings (machine generated)
* Chord rendering: https://github.com/omnibrain/svguitar - can render interval names
* Music theory: https://www.simplifyingtheory.com
* Guitar lessons: https://hubguitar.com

# Prompts

## Fixes for goals

## Improve scale mapping

I've sourced another reference for scales-to-solo-with logic. I'd like to cross-reference and expand the current mapping of recommended scales for modes and progressions with this and expand our set as required. One thing I've noted is the use of "Tonic" to refer to a scale of the I chord being used to solo over the IV or V chord. I think right now, our scales mapping always the same root note as the selected chord, so we might need to enhance the logic surrounding this.

```
{
  "frameworks": {
    "diatonic_major": [
      {
        "function": "I",
        "chord_type": "Maj7",
        "primary": ["Ionian"],
        "alternatives": ["Major Pentatonic"],
        "esoteric": ["Lydian"],
        "arpeggio": "1-3-5-7"
      },
      {
        "function": "ii",
        "chord_type": "m7",
        "primary": ["Dorian"],
        "alternatives": ["Minor Pentatonic"],
        "esoteric": ["Melodic Minor"],
        "arpeggio": "1-b3-5-b7"
      },
      {
        "function": "iii",
        "chord_type": "m7",
        "primary": ["Phrygian"],
        "alternatives": ["Minor Pentatonic"],
        "esoteric": ["Phrygian Dominant"],
        "arpeggio": "1-b3-5-b7"
      },
      {
        "function": "IV",
        "chord_type": "Maj7",
        "primary": ["Lydian"],
        "alternatives": ["Major Pentatonic"],
        "esoteric": ["Lydian Augmented"],
        "arpeggio": "1-3-5-7"
      },
      {
        "function": "V",
        "chord_type": "7",
        "primary": ["Mixolydian"],
        "alternatives": ["Major Pentatonic", "Bebop Dominant"],
        "esoteric": ["Altered", "Lydian Dominant"],
        "arpeggio": "1-3-5-b7"
      },
      {
        "function": "vi",
        "chord_type": "m7",
        "primary": ["Aeolian"],
        "alternatives": ["Minor Pentatonic"],
        "esoteric": ["Dorian"],
        "arpeggio": "1-b3-5-b7"
      },
      {
        "function": "vii",
        "chord_type": "m7b5",
        "primary": ["Locrian"],
        "alternatives": ["Locrian #2"],
        "esoteric": ["None"],
        "arpeggio": "1-b3-b5-b7"
      }
    ],
    "dominant_blues": [
      {
        "chord": "I",
        "primary": ["Mixolydian", "Minor Pentatonic", "Blues"],
        "alternatives": ["Major Pentatonic", "Dorian"],
        "target_notes": ["Major 3rd"],
        "logic": "The classic 'Major vs Minor' tension."
      },
      {
        "chord": "IV",
        "primary": ["Mixolydian", "Major Pentatonic", "Tonic Minor Pentatonic"],
        "alternatives": ["Blues", "Dorian"],
        "target_notes": ["b7 of IV (b3 of I)"],
        "logic": "I-chord Minor Pentatonic aligns perfectly with IV-chord tones."
      },
      {
        "chord": "V",
        "primary": ["Mixolydian", "Major Pentatonic", "Tonic Minor Pentatonic"],
        "alternatives": ["Blues", "Altered"],
        "target_notes": ["Major 3rd of V"],
        "logic": "The 3rd of the V chord is the leading tone back to the Tonic."
      }
    ],
    "minor_blues": [
      {
        "chord": "i",
        "primary": ["Natural Minor", "Minor Pentatonic", "Blues"],
        "alternatives": ["Dorian", "Melodic Minor"],
        "arpeggio": "1-b3-5-b7",
        "logic": "Dorian adds a 'bright' jazz-blues feel (m6 sound)."
      },
      {
        "chord": "iv",
        "primary": ["Dorian", "iv Chord Minor Pentatonic", "Tonic Minor Pentatonic"],
        "alternatives": ["Blues", "Phrygian"],
        "arpeggio": "1-b3-5-b7",
        "logic": "Tonic minor pentatonic remains the 'safety net'."
      },
      {
        "chord": "V",
        "primary": ["Harmonic Minor (of tonic)", "Phrygian Dominant"],
        "alternatives": ["Altered", "Half-Whole Diminished"],
        "arpeggio": "1-3-5-b7",
        "logic": "Harmonic minor provides the essential #7 leading tone."
      }
    ],
  }
}
```

## Add scale mapping to chords view

Add a new tab to the Chords panel called "Soloing". In this panel list scales that may be used to solo over the currently selected chord. Base this on the same logic that is used in the Modes and Progressions panels. Confirm if this is based on a common set of reference data / logic (preferred), or hardcoded per chord type (more brittle, but may be necessary).

## Start phase 4

Phase 3 is done for now! Let's move onto Phase 4: Goals and Routines: 
- Set learning goals
- Add topics of study to goals
- Build practice routines, drawing from the library and reference
- Manage goals and routines (CRUD)

Managing goals:

- Let the user define **Goals**, eg “Follow the changes on a jazz blues progression”. 
- Goals should have a title and a short description. Description should be simple Markdown formatted.
- It should also be possible to rename, archive, unarchive, and delete goals
- At any one time, a single goal is active, and this should be persisted across browser sessions and logins.
- There may be no goal active (active goal was deleted or archived or no goals set up yet). Handle this gracefully.
- It should be easy to switch between un-archived goals.
- Archived goals should be hidden behind a secondary page/UI, from which they can be unarchived or deleted permanently.

Assigning topics to goals:

- Against any lesson or reference item in the Library or Reference sections, the user can click "Add to goal" (maybe a suitable icon instead of text) to add this as a **Topic** of study against a goal.
- This should default to the currently active goal, but also easily allow any other un-archived goal to be used, probably in an overlay dialogue box.
- We will need an unobtrusive but obvious way to do this at various points in the UI, e.g. next to a lesson in the topic list, for a given scale, arpeggio type, chord type, triad, harmony, or progression. In the reference viewer, this will probably be next to the top level selector for "Triad type", "Chord type", "Scale type", etc.
- For each topic of study linked to a goal, we need to store what it is (lesson, triad, arpeggio, progression, etc.), and the type of thing per the primary selector (e.g. "maj7 arpeggio" or "diminished triad"), and the _default_ key (i.e. the one currently selected), though later we will have more options for modulating the key.

Managing routines

- Against each goal, we need a way to create/manage (CRUD) one or more **Routines**
- A routine has a fixed duration in minutes, a title, and a Markdown-formatted description.
- A routine consists of multiple, separately timed **Sections** of different **Section Types**: warmup, technique, muscle memory, theory, lessons, songs, free practice. It can include 0, 1, or multiple sections of each type.
- Research recommended guitar practice routines to suggest a default structure (sequence of types + their duration), but allow it to be modified.
- This means we need a simple UI to add, remove, and re-order sections in a routine.
- Each section should have a title, description (Markdown formatted again) and zero or more relevant topics
- The topics are selected from the list of Topics previously added to the Goal.
- When adding a reference topic that is relevant to a key (i.e. anything from the reference section), default to the key that was saved when the topic was added, but also allow selecting all or a set of keys from a list, and then choosing a practice mode: chromatic ascending, chromatic descending, circle of fifths ascending, circle of fourths descending, or random. This will be used in the practice session later.

This phase is finished when we have a robust way to manage goals, assign study topics to goals, create routines within a goal, and manage the sections within each routine.  

## Start phase 5

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

## Start phase 6

Allow the user to create and maintain their own supplementary set of links to topics/lessons in the Library. This should be in addition to the default library content, and under the same category headings.

On the Library page, add a "My library" link, to a new page for managing a custom library. Here, create a UI for user to manage (CRUD) a personal list of links with titles, descriptions, and source, categorised into any of the existing categories. Support drag-and-drop re-ordering of lessons within this UI (per category). Do not (for now, at least) allow any further management of categories, e.g. creating custom categories.

When rendering the library, show two tabs for each category - Standard and Personal. The latter is the user's own library.

User-managed lessons need to work in the practice routine builder, just like default lessons.
