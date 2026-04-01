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
- Build practice routines (drawing from the library)
- Run a session: timer, metronome, flashcards, notes

---

## Phase 5: Progress Tracking
Session logs, streaks, and per-topic completion status (linked to Phase 2 library content). Phase 4 and 5 are closely coupled — may be worth combining into one phase when the time comes.

---

# Future ideas

* Content source / attribution for all links in library
* Admin UI to manage default links
* UI to allow users to add their own section to the library (list of links)
* More streaks/gamification features
* Audio recorder for practice