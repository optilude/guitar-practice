# Phase 6: Sessions and Progress Tracking — Design Spec

## Goal

Allow a user to run a timed, guided practice session against one of their routines, capture notes during the session, save a permanent record of what was practised, and review past sessions in a calendar-based history view. Also wire up streak tracking on the home page and surface quick-start actions throughout the app.

## Architecture

- **Session runner**: fully client-side during the session (no DB write until save). State lives in custom hooks. The routine data is loaded server-side and passed as props.
- **Session persistence**: on save, a server action writes a denormalised snapshot of the session (independent of the live routine, which may later be edited or deleted).
- **History**: server-rendered pages reading from the snapshot tables; calendar rendered client-side with `react-day-picker`.
- **Streaks**: computed server-side from stored `localDate` strings at page load time.

## New Dependencies

- `react-day-picker` v9 — calendar UI with custom day highlighting
- `date-fns` v3 — date arithmetic (streak computation, formatting); also a peer dependency of react-day-picker

---

## 1. Database Schema

Three new Prisma models added to `prisma/schema.prisma`. Existing models (Goal, Routine, Section, SectionTopic, etc.) are untouched.

### `PracticeSession`

```prisma
model PracticeSession {
  id             String            @id @default(cuid())
  userId         String
  user           User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  goalId         String?           // plain string — no FK, survives goal deletion
  goalTitle      String            // snapshot
  routineTitle   String            // snapshot
  startedAtLocal String            // "YYYY-MM-DD HH:mm:ss" — timezone-naive local time
  endedAtLocal   String            // "YYYY-MM-DD HH:mm:ss"
  localDate      String            // "YYYY-MM-DD" derived from startedAtLocal, used for calendar/streak queries
  notes          String            @default("")
  sections       SnapshotSection[]

  @@index([userId, localDate])
  @@index([userId, goalId])
}
```

Add `practiceSessions PracticeSession[]` to the `User` model.

### `SnapshotSection`

```prisma
model SnapshotSection {
  id              String                 @id @default(cuid())
  sessionId       String
  session         PracticeSession        @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  title           String
  type            SectionType
  description     String                 @default("")
  durationMinutes Int
  order           Int
  topics          SnapshotSectionTopic[]
}
```

### `SnapshotSectionTopic`

```prisma
model SnapshotSectionTopic {
  id           String        @id @default(cuid())
  sectionId    String
  section      SnapshotSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  kind         TopicKind
  subtype      String?
  displayName  String        // pre-computed at save time via formatTopicName()
  keys         String[]      // the keys actually configured for this topic
  practiceMode PracticeMode?
  lessonUrl    String?       // populated for lesson/userLesson topics
}
```

### Migration

One new Prisma migration: `prisma migrate dev --name add_practice_sessions`.

---

## 2. Navigation Changes

File: `app/(app)/_components/nav.tsx` (or equivalent navigation component — locate by searching for existing nav items).

- Reorder nav tabs: **Home → Goals → History → Library → Reference**
- Add **History** nav entry pointing to `/history`
- The "Guitar Practice" logo/wordmark links to `/` (was previously not a link or linked elsewhere)

---

## 3. Home Page (`app/(app)/page.tsx`)

Currently a static server component. Becomes a dynamic server component fetching:

1. The user's active goal (where `isActive = true`, `isArchived = false`) with its routines (title, section count, total duration from `SUM(durationMinutes)`).
2. All distinct `localDate` values for the user's sessions (for streak computation).
3. All distinct `localDate` values for sessions matching the active goal's ID (for goal-specific streak).

### Streak computation (`lib/sessions.ts`)

```ts
// Returns the current consecutive-day streak ending today or yesterday.
function computeStreak(localDates: string[]): number
```

- Sort dates descending.
- Starting from today (`format(new Date(), 'yyyy-MM-dd')`), walk backwards: if today has a session, streak = 1 + count of consecutive prior days with sessions. If today has no session but yesterday does, start from yesterday (streak not yet broken for today).
- Returns 0 if no sessions or no recent run.

### Layout

```
Good morning / Good afternoon / Good evening
Get started

🔥 14-day streak  ·  7 days on this goal     ← hidden (opacity-0) if both are 0

── Active goal ──────────────────────────────
[Goal title]
[Goal description if non-empty]

Practice routines:
  ┌───────────────────────────────────────┐
  │ Routine title  · N sections · 45 min  │  [▶ Start]
  └───────────────────────────────────────┘
  ... (one card per routine)

  + New routine →    ← links to /goals/[goalId]

── No active goal ───────────────────────────
Set your first goal to get started → (link to /goals)
```

- If streak is 0 for both counts, the streak line is hidden (`hidden` class).
- If only one count is non-zero, show just that one.
- "▶ Start" button links to `/sessions/run?routineId=[routineId]`.
- "New routine" link goes to the goal detail page where routines are managed.

---

## 4. Session Runner (`app/(app)/sessions/run/page.tsx`)

A `"use client"` page. Receives routine data server-side via a thin server component wrapper that fetches `Routine` + nested `Section[]` + `SectionTopic[]` + `GoalTopic[]`, then renders the client component with that data as props.

Route: `/sessions/run?routineId=xxx`

If `routineId` is missing or the routine doesn't belong to the current user: redirect to `/goals`.

**"← Back" button** in the header calls `router.back()`. If the session has unsaved notes, it does not prompt — navigating away discards the in-progress session (no confirmation needed; the discard path via the modal is the intended route for intentional exits).

### Data shape passed to client

```ts
type SessionRoutine = {
  id: string
  title: string
  goalId: string
  goalTitle: string
  sections: SessionSection[]
}

type SessionSection = {
  id: string
  title: string
  type: SectionType
  description: string
  durationMinutes: number
  order: number
  topic: SessionTopic | null
}

type SessionTopic = {
  kind: TopicKind
  subtype: string | null
  displayName: string          // from formatTopicName()
  defaultKey: string | null
  keys: string[]               // [] = use defaultKey only; ["*"] = all 12 chromatic; explicit list = those keys
  practiceMode: PracticeMode | null
  lessonUrl: string | null
}
```

### Key sequence resolution (`lib/sessions.ts`)

Given a `SessionTopic`, produce the ordered list of keys to cycle through:

```ts
function resolveKeySequence(topic: SessionTopic): string[]
```

- `keys = []` or `keys = [defaultKey]`: returns `[defaultKey ?? "C"]` — single key, no rotation.
- `keys = ["*"]`: returns all 12 chromatic keys in a fixed standard order determined by `practiceMode` (always starts from C — `defaultKey` is not used here):
  - `chromatic_asc`: C, C#, D, D#, E, F, F#, G, G#, A, A#, B
  - `chromatic_desc`: reverse of above
  - `circle_fifths_asc`: C, G, D, A, E, B, F#, C#, Ab, Eb, Bb, F
  - `circle_fourths_desc`: reverse of above
  - `random`: Fisher-Yates shuffle, seeded fresh each session start
- `keys = ["C", "F", "G"]` (explicit list): returns those keys in that order (practiceMode ignored).

For `lesson` topics: always returns `[""]` — no key concept applies, key strip is hidden.

### Page layout

```
┌─ Header (sticky top) ──────────────────────────────────────────────┐
│  [← Back]   Routine title            00:12  /  00:45  [End Session]│
└────────────────────────────────────────────────────────────────────┘

Desktop (lg+):
┌─ Flashcard (flex-1) ──────┐  ┌─ Notes (w-80 shrink-0) ────────────┐
│                            │  │  Session notes                      │
│  [card front or back]      │  │  ──────────────────────────────     │
│                            │  │  [Markdown textarea, grows to fill] │
└────────────────────────────┘  └────────────────────────────────────┘

Mobile (below lg): flashcard full width, notes textarea below it.

┌─ Section strip (horizontal scroll, sticky bottom-ish) ─────────────┐
│  [■ Scales 5m] [Arpeggios 10m] [Free Practice 15m]                │
└────────────────────────────────────────────────────────────────────┘

┌─ Controls ─────────────────────────────────────────────────────────┐
│  [← Prev]   [▶ / ⏸]   [Next →]                                    │
│  [🎵 Metronome]   [⟳ Auto-advance: ON / OFF]                      │
└────────────────────────────────────────────────────────────────────┘

┌─ Metronome panel (collapsible, hidden by default) ─────────────────┐
│  BPM: [▼] [120] [▲]     [▶ Start] / [■ Stop]                      │
└────────────────────────────────────────────────────────────────────┘
```

### Timer display

Two values in the header:
- **Section remaining**: `MM:SS` counting down from `section.durationMinutes × 60`
- **Total remaining**: `MM:SS` counting down from sum of all remaining sections from the current one

When navigating to a section manually: section timer resets to that section's full `durationMinutes × 60`. Total remaining recalculates as the sum of that section's duration + all subsequent sections' durations.

### Custom hooks

**`useSessionTimer(initialSectionSeconds: number)`**

```ts
{
  sectionSecondsRemaining: number
  totalSecondsRemaining: number
  isRunning: boolean
  play: () => void
  pause: () => void
  resetSection: (newSectionSeconds: number, newTotalSeconds: number) => void
  // totalSecondsRemaining recomputed externally and passed in on section change
}
```

Uses `setInterval` (1-second tick) via `useEffect`. Clears interval on unmount or pause. Fires `onSectionComplete` callback when `sectionSecondsRemaining` reaches 0.

**`useSessionNav(sections: SessionSection[])`**

```ts
{
  currentSectionIndex: number
  currentKeyIndex: number
  currentKeySequence: string[]       // resolveKeySequence for current section's topic
  goToSection: (index: number) => void
  goToNextSection: () => void
  goToPrevSection: () => void
  goToNextKey: () => void
  goToPrevKey: () => void
}
```

`goToSection` recomputes the key sequence for that section and resets `currentKeyIndex` to 0.

**`useMetronome()`**

```ts
{
  bpm: number
  setBpm: (bpm: number) => void
  isRunning: boolean
  start: () => void
  stop: () => void
}
```

Uses Web Audio API (`AudioContext`). Click sound: create a 50ms `OscillatorNode` at 1000 Hz with a `GainNode` envelope (attack 0s, decay 0.05s, sustain 0, release 0). Schedules ticks via `AudioContext.currentTime` arithmetic (not `setInterval`, to avoid drift). On `stop`: cancel all scheduled events and close the audio context. AudioContext created lazily on first `start()` call (browser autoplay policy).

**`useAutoAdvance`**

Not a separate hook — handled inline in the page component: when `sectionSecondsRemaining === 0 && autoAdvance && isRunning`, call `goToNextSection()` and `resetSection(...)`.

### Flashcard

Fixed-height container (`h-96` or similar) with CSS 3D flip (`rotateY`). Front and back are absolutely positioned face-to-face. Back has `overflow-y: auto` for tall reference panels.

**Front face:**

```
┌──────────────────────────────────────────────────┐
│  [Warm Up]  ← section type badge (coloured)      │
│                                                  │
│         C major scale                            │  ← text-2xl font-semibold
│                                                  │
│  [C] [C#] [D] [D#] [E] [F] [F#] [G] [Ab] ...   │  ← key strip (hidden for lessons)
│                  [←]  1/12  [→]                  │  ← prev/next key + position
│                                                  │
│              [Turn card ↩]                       │
└──────────────────────────────────────────────────┘
```

Key strip: horizontally scrollable row of pill buttons. Current key is highlighted (`bg-accent text-accent-foreground`). Clicking a pill sets `currentKeyIndex` directly.

**Back face:**

```
┌──────────────────────────────────────────────────┐
│  [C] [C#] [D] ...  [←]  1/12  [→]               │  ← same key strip
│  ───────────────────────────────────────────     │
│  [Reference panel rendered inline]               │
│  (ScalePanel / ChordPanel / ArpeggioPanel /      │
│   InversionPanel / ProgressionsTab / HarmonyTab  │
│   or lesson title + external link)               │
│                                                  │
│              [Turn card ↩]                       │
└──────────────────────────────────────────────────┘
```

Reference panel mapping (all panels receive `root={currentKey}` and the appropriate type prop):

| TopicKind    | Component          | Props                                                          |
|-------------|--------------------|----------------------------------------------------------------|
| `scale`     | `<ScalePanel>`     | `root={currentKey} scaleTypeTrigger={{ type: subtype }}`      |
| `arpeggio`  | `<ArpeggioPanel>`  | `root={currentKey} chordTypeTrigger={{ type: subtype }}`      |
| `chord`     | `<ChordPanel>`     | `root={currentKey} chordTypeTrigger={{ type: subtype }}`      |
| `inversion` | `<InversionPanel>` | `root={currentKey} inversionTypeTrigger={{ type: subtype }}`  |
| `progression`| `<ProgressionsTab>`| `tonic={currentKey} defaultProgressionName={subtype}`         |
| `harmony`   | `<HarmonyTab>`     | `tonic={currentKey} defaultMode={subtype}`                    |
| `lesson`    | inline             | title + `<a href={lessonUrl} target="_blank">Open lesson →</a>` |

For `lesson` topics with no URL: show title + "(no link available)".

**Required component changes:** `ProgressionsTab` and `HarmonyTab` currently manage `progressionName` and `mode` state internally with no way to set them from outside. Both need a new optional prop:

- `ProgressionsTab`: add `defaultProgressionName?: string` — used as the `useState` initial value instead of `"pop-standard"`.
- `HarmonyTab`: add `defaultMode?: string` — used as the `useState` initial value instead of `"ionian"`.

These are one-line changes to each component and do not affect existing usage (the props are optional with the existing defaults as fallbacks).

**Sections with no topic:** If `section.topic` is null, the flashcard front shows the section title, type badge, and description (if any). There is no key strip, no "Turn card" button, and no back face. The card is non-flippable and acts purely as a reminder of what to do.

### Section strip

Horizontal scrollable row below the flashcard. One chip per section:

```
[■ type-colour dot]  [section title]  [N min]
```

Active section: `bg-accent/20 border-accent`. Past sections: slightly dimmed. Future sections: normal. Clicking any chip calls `goToSection(index)`.

### Controls

- **← Prev**: `goToPrevSection()` (disabled at first section)
- **▶ / ⏸**: `play()` / `pause()`  
- **Next →**: `goToNextSection()` (disabled at last section)
- **Metronome**: toggles metronome panel open/closed
- **Auto-advance**: toggle button showing current state (ON/OFF). Default: ON.

### Notes panel

`<textarea>` (or contenteditable with markdown preview toggle — keep simple: plain textarea). Markdown will be rendered on the session detail page. Label: "Session notes". Placeholder: "Note anything useful from this session…". Value persists in React state for the duration of the session and is passed to the save modal.

---

## 5. End Session Modal

Triggered by "End Session" button or when total session timer hits 0. Timer pauses immediately when modal opens. Modal rendered with a fixed backdrop.

```
┌─ Save session? ───────────────────────────────────┐
│                                                    │
│  [Routine title]                                   │
│  [Goal title]  ·  [start time] – [end time]       │
│  Duration: 43 min                                  │
│                                                    │
│  ── Session notes ────────────────────────────     │
│  [Textarea — pre-filled from in-session notes,     │
│   editable before saving]                          │
│                                                    │
│  [Save session]          [Discard]                 │
└────────────────────────────────────────────────────┘
```

- `startedAtLocal` is captured when the session page first mounts (before the user starts the timer) — format: `"YYYY-MM-DD HH:mm:ss"` from `format(new Date(), 'yyyy-MM-dd HH:mm:ss')` (date-fns).
- `endedAtLocal` is captured when "Save session" is clicked.
- `localDate` = first 10 characters of `startedAtLocal`.
- Duration display = `endedAtLocal` minus `startedAtLocal` in minutes (computed client-side).

**On Save**: server action `saveSession(data)` writes:
1. `PracticeSession` record
2. One `SnapshotSection` per section (all sections, regardless of how far the user got — the full routine structure is preserved)
3. One `SnapshotSectionTopic` per section that has a topic

On success: navigate to `/history/[newSessionId]`.

**On Discard**: modal closes, user is returned to the session runner (timer remains paused). The Back button in the header exits to `/goals` without saving. No orphaned DB records are created.

---

## 6. History Page (`app/(app)/history/page.tsx`)

Server component. Fetches:
- All `PracticeSession` records for the user (id, goalId, goalTitle, routineTitle, startedAtLocal, endedAtLocal, localDate) — no need to load snapshots at this level.
- All distinct `goalId` + `goalTitle` pairs from the user's sessions (for the goal filter dropdown).

Accepts optional `?goalId=xxx` query param to pre-filter.

### Layout

```
History

Filter by goal: [All goals ▼]  ← dropdown of distinct goals from sessions

◀  April 2026  ▶    [2026 ▼]   ← month nav + year dropdown
────────────────────────────
Mo  Tu  We  Th  Fr  Sa  Su
          1   2   3   4   5
 6  [7]  8   9  10  11  12   ← [7] = filled circle (has session)
13  14  15  16  17  18  19
...

── Sessions on 7 April ───────────────────────────
  Morning Warmup  ·  09:15 – 10:02  ·  Jazz Basics  →
  Evening Review  ·  19:30 – 19:55  ·  Jazz Basics  →

(click a day with sessions to populate the list)
(clicking a day with no sessions shows "No sessions on this day")
```

Calendar rendered client-side with `react-day-picker`. The set of "highlighted" days is computed from sessions matching the current goal filter. Sessions are passed as props to a `"use client"` calendar component.

Month navigation: `◀` / `▶` buttons step one month. Year dropdown lists a range (e.g. current year ±5). Navigating month/year updates which sessions appear highlighted.

Clicking a session row navigates to `/history/[sessionId]`. The goal filter updates the URL (`?goalId=xxx`) and re-fetches server-side.

---

## 7. Session Detail (`app/(app)/history/[sessionId]/page.tsx`)

Server component. Fetches `PracticeSession` with nested `SnapshotSection[]` and `SnapshotSectionTopic[]`.

If session doesn't exist or belongs to a different user: `notFound()`.

```
[← Back to History]

Morning Warmup
Jazz Basics  ·  7 April 2026  ·  09:15 – 10:02  (43 min)

── Sections ──────────────────────────────────────────
1. Warm Up  (5 min)  [Warm Up badge]
   C major scale  ·  Keys: C, C#, D, D#, E, F, F#, G, Ab, Bb, B  ·  Chromatic ascending

2. Technique  (10 min)  [Technique badge]
   Cmaj7 arpeggio  ·  Key: C

3. Free Practice  (15 min)  [Free Practice badge]
   (no topic)

── Notes ─────────────────────────────────────────────
[Rendered markdown from session.notes]
(if notes is empty: "(no notes recorded)")

                              [Delete session]
```

Section type badges use the same `SECTION_TYPE_COLORS` as the routine builder.

**Delete**: "Delete session" button shows an inline confirmation below it:

```
Are you sure? This cannot be undone.
[Confirm delete]   [Cancel]
```

On confirm: server action `deleteSession(sessionId)` removes the `PracticeSession` (cascade deletes snapshots), redirects to `/history`.

---

## 8. Goal Page Updates (`app/(app)/goals/[goalId]/page.tsx`)

Two additions to the existing goal detail page (data fetched server-side, passed to `GoalDetailClient`):

### Quick-start buttons

Each routine card in the existing routines list gets a **▶ Start** link-button:

```
┌──────────────────────────────────────────────────────────┐
│  Morning Warmup  ·  3 sections  ·  45 min    [▶ Start]  │
└──────────────────────────────────────────────────────────┘
```

`href="/sessions/run?routineId=[routineId]"`.

### Recent sessions section

Fetch the 5 most recent `PracticeSession` records where `goalId = goal.id`, ordered by `startedAtLocal` descending.

```
── Recent sessions ──────────────────────────────────────────

  Morning Warmup  ·  7 Apr 2026  ·  09:15 – 10:02        →
  Evening Review  ·  6 Apr 2026  ·  19:30 – 19:55        →
  Morning Warmup  ·  5 Apr 2026  ·  09:00 – 09:48        →

  View all sessions for this goal →     (links to /history?goalId=xxx)
```

If no sessions yet: show "No sessions yet — start one above."

Each row links to `/history/[sessionId]`.

---

## 9. File Structure

New files:

```
app/(app)/sessions/
  run/
    page.tsx             ← thin server wrapper (fetch routine) + renders SessionRunnerClient
    _components/
      session-runner-client.tsx   ← "use client", all session UI
      flashcard.tsx               ← FlashCard component (front/back flip)
      key-strip.tsx               ← KeyStrip component
      section-strip.tsx           ← SectionStrip component
      timer-display.tsx           ← TimerDisplay component
      metronome-panel.tsx         ← MetronomePanel component
      notes-panel.tsx             ← NotesPanel component (textarea)
      end-session-modal.tsx       ← EndSessionModal component

app/(app)/history/
  page.tsx                        ← server component
  [sessionId]/
    page.tsx                      ← server component
  _components/
    history-calendar.tsx          ← "use client", react-day-picker wrapper
    session-list.tsx              ← list of sessions for selected day
    session-detail-view.tsx       ← renders session detail (could be inline in page)

lib/
  sessions.ts                     ← computeStreak(), resolveKeySequence(), saveSession action, deleteSession action

app/(app)/sessions/
  actions.ts                      ← saveSession server action (or colocated in lib/sessions.ts)
```

Modified files:

```
prisma/schema.prisma               ← new models + User relation
app/(app)/page.tsx                 ← home page with active goal + streaks
app/(app)/goals/[goalId]/page.tsx  ← fetch recent sessions + pass to GoalDetailClient
app/(app)/goals/[goalId]/_components/goal-detail-client.tsx  ← add Start buttons + recent sessions section
app/(app)/_components/nav.tsx      ← reorder tabs, add History, logo → /
```

---

## 10. Key Decisions and Constraints

- **No DB write until save.** The session runner is purely in-memory. Closing the tab before saving loses the session — this is acceptable (same as most practice apps).
- **Timezone-naive storage.** `startedAtLocal` and `endedAtLocal` are plain strings from the user's device. No UTC conversion. The `localDate` field enables efficient calendar and streak queries.
- **Full routine snapshot on save.** All sections are written, not just sections the user reached. This preserves the intended structure for history review.
- **Keys array semantics**: `[]` = single default key; `["*"]` = all 12; explicit array = those specific keys. `resolveKeySequence()` is the single source of truth for expanding these.
- **react-day-picker styling.** Use the `classNames` prop to apply Tailwind classes matching the app's design system. No CSS modules.
- **Metronome via Web Audio API.** No external audio library. AudioContext created lazily on first start (avoids browser autoplay block).
- **Streak definition.** A day "counts" if there is at least one saved `PracticeSession` with that `localDate`. Streak = consecutive days ending today (or yesterday, if today has no session yet — streak not yet broken).
