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

* Account management (at least change + reset password) – consider moving to OAuth
* Admin UI: Remove users, manage library content
* Allow users to add their own, personal content to the library via UI

* Harmonic Minor and Melodic Minor mode systems for harmony viewer
* Are there other relevant harmony systems?

* Enrich the set of "scales to solo over this chord" options
* Consider having this feature for any chord in the Chords panel, not just the diatonics

* Add drop-2 and drop-3 voicings for chords (if not already included)
* In general, add more inversions and organise them better

* Add more progressions
* Specifically, add blues progressions (regular, jazz, minor, etc.) - these may require special consideration for soloing scales



* More streaks/gamification features

* Audio recorder for practice (note this will really change data storage and storage costs)

# Known issues

UX:

* Reference view does not work well in dark mode - none of the lines are visible so we only see text

Scales:

* Scales note viewer has standard notation on a stave. Some of the low notes appear really low - are they actually correct? They may be transposed down an octive or two.
* Look fine now but we need to more formally test their correctness

Chords:

* There are issues with some of the chord voicings (e.g. strange barres)
* The triad viewer sometimes renders a dot outside the box when there is a 5-fret spread

# Resources / notes

* Chords: https://github.com/szaza/guitar-chords-db-json - 99k voicings (machine generated)
* Chord rendering: https://github.com/omnibrain/svguitar - can render interval names

# Prompts

## Progressions

Expand the list of Progressions and categorise them in the drop-down. The table below lists the categories and relevant progression (Roman numerals).

There are examples (songs) and notes against each. Add a "Help" or "More" icon next to the progression drop-down box (on the same line if possible). When the user clicks/taps on or hovers over this, show a pop-up window that displays this information, neatly formatted.

| Category | Name | Progression | Examples | Notes |
|---|---|---|---|---|
| Pop | Pop Axis | I – V – vi – IV | Let It Be, No Woman No Cry, With or Without You | The most widely used progression in modern pop. |
| Pop | Relative Minor Loop | vi – IV – I – V | Africa (Toto), Decode (Paramore) | Same chords as the Pop Axis, starting on the minor; darker feel. |
| Pop | Three-Chord Pop | I – IV – V | La Bamba, Twist and Shout, Johnny B. Goode | The simplest complete progression; backbone of early rock 'n' roll. |
| Pop | 50s Progression | I – vi – IV – V | Stand By Me, Blue Moon, Heart and Soul | Also called the Doo-Wop progression; ubiquitous in 1950s pop. |
| Pop | ii–V–I (Pop) | ii – V – I | Common in pop bridges and pre-choruses | Borrowed from jazz; adds harmonic sophistication. Usually played with 7th voicings. |
| Blues | 12-Bar Blues | I7–I7–I7–I7 / IV7–IV7–I7–I7 / V7–IV7–I7–V7 | Sweet Home Chicago, Pride and Joy, La Grange | The foundation of the blues. All chords are dominant 7ths. |
| Blues | Quick-Change Blues | I7–IV7–I7–I7 / IV7–IV7–I7–I7 / V7–IV7–I7–V7 | Pride and Joy (SRV), Sweet Little Angel | 12-bar with IV in bar 2 for added early tension. |
| Blues | 8-Bar Blues | I – V – IV – IV / I – V – I – V | Key to the Highway, Worried Life Blues | Compressed form; feels more urgent and stripped-back. |
| Blues | Minor Blues | i – i – i – i / iv – iv – i – i / V – iv – i – V | The Thrill Is Gone (BB King), All Your Love | 12-bar in minor; more mournful and tense than the major form. |
| Jazz | ii–V–I Major | ii7 – V7 – Imaj7 | Autumn Leaves, All The Things You Are | The core jazz cadence. Appears constantly in standards; played with 7th/9th extensions. |
| Jazz | ii–V–i Minor | iiø7 – V7 – im7 | Autumn Leaves (minor sections), Alone Together | Half-diminished ii chord gives a darker, minor flavour. |
| Jazz | Jazz Turnaround | Imaj7 – VI7 – II7 – V7 | Rhythm Changes endings, many standard codas | Secondary dominants replace diatonic chords to create harmonic momentum. |
| Jazz | Rhythm Changes | I–vi–ii–V (A) / III–VI–II–V (B) | I Got Rhythm (Gershwin), Oleo, Anthropology | 32-bar AABA form; a rite of passage for jazz players. |
| Jazz | Tritone Substitution | ♭II7 – Imaj7 | Bebop standards, Charlie Parker compositions | ♭II7 replaces V7 (a tritone away) for chromatic descending bass motion. |
| Rock | Three-Chord Rock | I – IV – V | Rock Around the Clock, many punk/rock songs | Same numerals as Three-Chord Pop but played as power chords for a harder sound. |
| Rock | Mixolydian Vamp | I – ♭VII – IV | Sweet Home Alabama, Knockin' on Heaven's Door, Hey Joe | ♭VII borrowed from the Mixolydian mode; the quintessential rock flavour. |
| Rock | Aeolian Vamp | i – ♭VII – ♭VI – ♭VII | Stairway to Heaven, All Along the Watchtower | Natural minor rocking between ♭VI and ♭VII; dark and anthemic. |
| Rock | Minor Rock Loop | i – ♭VI – ♭III – ♭VII | Stairway to Heaven (chorus), many alt-rock anthems | Aeolian loop with a resolving quality; huge in stadium rock. |
| Folk / Country | Folk Three-Chord | I – IV – V – I | Wagon Wheel, Take Me Home Country Roads, Blowin' in the Wind | Open-position G, C, D shapes — the most natural fit for acoustic guitar. |
| Folk / Country | Two-Chord Vamp | I – V | Many traditional folk and children's songs | Simplest vehicle for a melody; works well with fingerpicking patterns. |
| Folk / Country | Bluegrass Loop | I – IV – I – V | Deep River Blues, many bluegrass standards | Common in bluegrass and old-time; pairs well with alternating bass picking. |
| Folk / Country | Pachelbel Canon | I – V – vi – iii – IV – I – IV – V | Pachelbel's Canon, many folk-inspired songs | Stepwise descending bass sounds especially rich fingerpicked. |
| Classical / Modal | Andalusian Cadence | i – ♭VII – ♭VI – V | Flamenco tradition, Sultans of Swing, Hit the Road Jack | Descending bass line; V is major for Phrygian tension. Deeply dramatic. |
| Classical / Modal | Lamento Bass | I – I/VII – I/VI – I/V | Air on G String, many Baroque pieces | Stepwise descending bass in the root position; elegant for fingerstyle. |
| Classical / Modal | Plagal Cadence | IV – I | Hymns, gospel, many rock outros | The "Amen" cadence; restful and conclusive without the leading-tone pull of V–I. |
| Classical / Modal | Phrygian Vamp | i – ♭II (repeat) | Flamenco, Middle Eastern-influenced passages | The ♭II (Neapolitan) chord creates an exotic, suspended tension. |

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