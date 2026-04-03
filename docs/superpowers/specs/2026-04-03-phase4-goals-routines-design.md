# Phase 4: Goals & Routines Design

## Goal

Give users a structured way to define learning goals, assign study topics from the Library and Reference sections to those goals, and build timed practice routines made up of ordered sections — each linked to relevant topics.

## Architecture

Server-rendered pages with async data fetching, client components for interactive forms and the drag-and-drop section builder. All persistence via Prisma server actions following the patterns established in Phases 1–3. Markdown descriptions rendered with `react-markdown`. Section reordering powered by `@dnd-kit/sortable`.

## Tech Stack additions

- `react-markdown` — render Markdown descriptions for goals, routines, and sections
- `@dnd-kit/core` + `@dnd-kit/sortable` — drag-and-drop section reordering in routine builder

## Implementation split

This spec is implemented in two plans:

- **Plan A** — Data model migration + Goals CRUD (goals page, goal detail, archived goals, active goal management)
- **Plan B** — Topic assignment UI (Library + Reference integration) + Routines & Sections builder

---

## Data Model

Six new Prisma models. All existing models are unchanged. The `User` model gains a `goals` relation.

### Enums

```prisma
enum TopicKind {
  lesson        // a library lesson (Topic record)
  scale
  chord
  triad
  arpeggio
  progression
  harmony
}

enum SectionType {
  warmup
  technique
  muscle_memory
  theory
  lessons
  songs
  free_practice
}

enum PracticeMode {
  chromatic_asc
  chromatic_desc
  circle_fifths_asc
  circle_fourths_desc
  random
}
```

### Models

```prisma
model Goal {
  id          String      @id @default(cuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  title       String
  description String      @default("")
  isActive    Boolean     @default(false)
  isArchived  Boolean     @default(false)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  topics      GoalTopic[]
  routines    Routine[]
}

model GoalTopic {
  id            String        @id @default(cuid())
  goalId        String
  goal          Goal          @relation(fields: [goalId], references: [id], onDelete: Cascade)
  kind          TopicKind
  subtype       String?       // "major", "maj7", "pop-standard" — null for lessons
  lessonId      String?       // FK to Topic — null for reference items
  lesson        Topic?        @relation(fields: [lessonId], references: [id])
  defaultKey    String?       // "C", "F#" — null for lessons
  refKey        String        // computed: "lesson:cuid" or "scale:major:C"
  createdAt     DateTime      @default(now())
  sectionTopics SectionTopic[]

  @@unique([goalId, refKey])
}

model Routine {
  id              String    @id @default(cuid())
  goalId          String
  goal            Goal      @relation(fields: [goalId], references: [id], onDelete: Cascade)
  title           String
  description     String    @default("")
  durationMinutes Int
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  sections        Section[]
}

model Section {
  id              String        @id @default(cuid())
  routineId       String
  routine         Routine       @relation(fields: [routineId], references: [id], onDelete: Cascade)
  type            SectionType
  title           String
  description     String        @default("")
  durationMinutes Int
  order           Int
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  sectionTopics   SectionTopic[]
}

model SectionTopic {
  id           String        @id @default(cuid())
  sectionId    String
  section      Section       @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  goalTopicId  String
  goalTopic    GoalTopic     @relation(fields: [goalTopicId], references: [id], onDelete: Cascade)
  keys         String[]      @default([])   // [] = use GoalTopic.defaultKey; ["*"] = all 12 keys; otherwise explicit list e.g. ["C","G","D"]
  practiceMode PracticeMode?

  @@unique([sectionId, goalTopicId])
}
```

### Key decisions

- `refKey` is computed at the application layer (`"lesson:{lessonId}"` or `"{kind}:{subtype}:{defaultKey}"`). The `@@unique([goalId, refKey])` constraint prevents duplicate topic assignments at the DB level without null-in-unique-index problems.
- `Goal.isActive` is a boolean. Activating a goal runs a transaction: set all user's goals to `isActive = false`, then set the target to `isActive = true`. At most one goal is active at a time.
- `Section.order` is an integer. Drag-and-drop reordering writes all affected `order` values in one transaction.
- All relations use `onDelete: Cascade` so deleting a goal removes all its topics, routines, sections, and section-topics automatically.

---

## Routing

All routes are under `app/(app)/` (protected by the existing auth proxy).

```
/goals                                    goal list (unarchived)
/goals/[goalId]                           goal detail: topics + routines
/goals/[goalId]/routines/new              create routine
/goals/[goalId]/routines/[routineId]      routine detail + section builder
/goals/archived                           archived goals management
```

---

## Pages

### `/goals` — Goal list

Async server component. Fetches all unarchived goals for the current user, ordered by `createdAt` descending.

- Active goal displayed with accent border and an "Active" badge.
- Each goal card: title, description excerpt (first line, truncated), routine count, topic count.
- Actions per card: "Make active" (hidden if already active), "View" (links to `/goals/[goalId]`), "Archive".
- "New goal" button at top expands an inline form (title + description textarea). If no goals exist, the form is shown open by default with an empty-state message.
- Link to `/goals/archived` at the bottom of the page.

### `/goals/[goalId]` — Goal detail

Async server component. Two-column layout (stacked on mobile).

**Left column — Goal metadata:**
- Title: editable inline (click to edit, save on blur/Enter).
- Description: renders as Markdown (react-markdown) when not editing; pencil icon enters edit mode (textarea).
- Archive button (with confirmation for active goals).

**Right column — two sections:**

*Topics:*
- List of assigned GoalTopics. Each shows: kind badge, display name (e.g. "C major scale", "Pop Axis progression", "Let It Be — Library"), remove button.
- Empty state: "No topics yet. Use the + button in Library or Reference to add topics."

*Routines:*
- List of routines for this goal. Each shows: title, duration, section count, link to routine detail, delete button.
- "Add routine" button links to `/goals/[goalId]/routines/new`.
- Empty state: "No routines yet."

### `/goals/[goalId]/routines/new` — Create routine

Server-rendered form. Fields:
- Title (required text input)
- Duration in minutes (required number input, min 1)
- Description (optional Markdown textarea)
- Checkbox: "Start with recommended structure"

On submit, `createRoutine(goalId, data)` creates the routine. If "recommended structure" is checked, creates 5 sections in the same transaction:

| Order | Type | Title | Duration |
|---|---|---|---|
| 1 | warmup | Warm Up | 5 min |
| 2 | technique | Technique & Scales | 15 min |
| 3 | muscle_memory | Muscle Memory | 10 min |
| 4 | songs | Songs & Repertoire | 20 min |
| 5 | free_practice | Free Practice | 10 min |

Redirects to `/goals/[goalId]/routines/[routineId]` on success.

### `/goals/[goalId]/routines/[routineId]` — Routine detail + section builder

Async server component shell; section list is a client component.

**Top area:** Title (editable inline), duration (editable inline), description (Markdown view/edit toggle).

**Section list:**
- Rendered with `@dnd-kit/core` + `@dnd-kit/sortable`.
- Each section is a card with a drag handle (⠿ icon) on the left.
- Reordering calls `reorderSections(routineId, orderedIds[])` which writes all `order` values in one transaction.
- Keyboard-accessible via dnd-kit's keyboard sensor.

**Section card — collapsed:** Type badge (colour-coded), title, duration, topic count, expand chevron, delete button.

**Section card — expanded:**
- Description: Markdown view with pencil-icon edit mode.
- Assigned topics: list of topics with remove button. For reference topics: key selector (defaults to `GoalTopic.defaultKey`; options: "Default key only" → `keys = []`, "All 12 keys" → `keys = ["*"]`, or a multi-select of specific keys → `keys = ["C", "G", ...]`) and a practice mode dropdown (chromatic ascending, chromatic descending, circle of fifths ascending, circle of fourths descending, random). Practice mode is only shown when keys involves multiple values (i.e. `keys = ["*"]` or `keys.length > 1`).
- "Add topic" button: opens an inline panel listing all of this goal's GoalTopics not yet in this section. Selecting one adds it via `addTopicToSection(sectionId, goalTopicId)`.

**Add section form:** "Add section" button at bottom of list. Inline form: type selector dropdown, title (pre-filled from type label), duration (minutes). Appended with `order = current max + 1`. No limit on section count or type repetition.

**Delete section:** Inline confirmation ("Remove this section?") before calling `deleteSection(sectionId)`.

### `/goals/archived` — Archived goals

Simple async server component list. Each goal shows title and description excerpt. Actions: "Unarchive" (sets `isArchived = false`, goal returns to `/goals` as inactive) and "Delete permanently" (requires typed confirmation: displays warning about cascading deletion, then calls `deleteGoal(goalId)`).

Empty state: "No archived goals."

---

## "Add to Goal" Integration

A `+` icon button is added to two existing sections of the app.

### Library (`/library/[category]`)

Each lesson row gets a `+` button on the right (always visible, not hover-only). Clicking opens the AddToGoal modal with:
- Item name (lesson title)
- Goal selector (defaults to active goal, lists all unarchived goals)
- "Add to goal" button

### Reference (`/reference`)

A `+` button is placed next to the primary type selector on each tab:
- Scales tab: next to the scale type selector
- Chords tab: next to the chord type selector
- Triads tab: next to the triad type selector
- Arpeggios tab: next to the arpeggio type selector
- Progressions tab: next to the progression selector

Clicking opens the AddToGoal modal with:
- Item description (e.g. "C major scale", "Am7 chord")
- Goal selector (defaults to active goal)
- Default key (shown read-only as "Default key: C" — overrides happen in the section builder)
- "Add to goal" button

### AddToGoal modal behaviour

- If no goals exist: shows "You don't have any goals yet — [Create your first goal]" with a link to `/goals`. No selector shown.
- If the item is already in the selected goal: button label changes to "Already added" and is disabled.
- Double-taps are safe: the server action uses `upsert` semantics (succeeds silently if `refKey` already exists for that goal).

### Server action: `addTopicToGoal`

```ts
// app/(app)/goals/actions.ts
"use server"
addTopicToGoal(goalId: string, topicRef: {
  kind: TopicKind
  subtype?: string
  lessonId?: string
  defaultKey?: string
}): Promise<{ success: true } | { error: string }>
```

Computes `refKey` from `topicRef`, then upserts a `GoalTopic` record. Validates that the goal belongs to the current user.

---

## Goal Management — Server Actions

All actions live in `app/(app)/goals/actions.ts`.

| Action | Signature | Notes |
|---|---|---|
| `createGoal` | `(data: { title, description? })` | Creates inactive, unarchived goal for current user |
| `updateGoal` | `(goalId, data: { title?, description? })` | Validates ownership |
| `setActiveGoal` | `(goalId)` | Transaction: deactivate all user goals, activate target |
| `archiveGoal` | `(goalId)` | Sets `isArchived = true`, clears `isActive` if was active |
| `unarchiveGoal` | `(goalId)` | Sets `isArchived = false` |
| `deleteGoal` | `(goalId)` | Hard delete; cascade removes all child records |
| `addTopicToGoal` | `(goalId, topicRef)` | Upsert by `refKey` |
| `removeTopicFromGoal` | `(goalTopicId)` | Validates goal ownership |

---

## Routine & Section — Server Actions

Also in `app/(app)/goals/actions.ts`.

| Action | Signature | Notes |
|---|---|---|
| `createRoutine` | `(goalId, data: { title, durationMinutes, description?, useRecommended? })` | Creates routine + optional default sections in one transaction |
| `updateRoutine` | `(routineId, data: { title?, durationMinutes?, description? })` | Validates ownership via goal |
| `deleteRoutine` | `(routineId)` | Hard delete |
| `createSection` | `(routineId, data: { type, title, durationMinutes, description? })` | Appended at end |
| `updateSection` | `(sectionId, data: { type?, title?, durationMinutes?, description? })` | |
| `deleteSection` | `(sectionId)` | |
| `reorderSections` | `(routineId, orderedIds: string[])` | Writes all `order` values in one transaction |
| `addTopicToSection` | `(sectionId, goalTopicId)` | Validates goal membership |
| `removeTopicFromSection` | `(sectionTopicId)` | |
| `updateSectionTopic` | `(sectionTopicId, data: { keys?, practiceMode? })` | Key/practice-mode overrides |

---

## Navbar

The active goal name is shown as a small subdued label beneath the "Goals" nav link (read-only, just for orientation). Fetched server-side in the navbar layout. Hidden when no goal is active.

---

## Display names for topics

A pure function `formatTopicName(topic: GoalTopic): string` handles display:

- `kind === "lesson"`: use `topic.lesson.title`
- `kind === "scale"`: `"{defaultKey} {subtype} scale"` — e.g. "C major scale"
- `kind === "chord"`: `"{defaultKey}{subtype} chord"` — e.g. "Am7 chord"
- `kind === "triad"`: `"{defaultKey} {subtype} triad"` — e.g. "C major triad"
- `kind === "arpeggio"`: `"{defaultKey} {subtype} arpeggio"` — e.g. "Dm7 arpeggio"
- `kind === "progression"`: use the progression's `displayName` from the theory engine (looked up by `subtype` slug)
- `kind === "harmony"`: `"{defaultKey} {subtype}"` — e.g. "C ionian"

---

## Section type colours

Each `SectionType` gets a distinct badge colour (using existing Tailwind theme variables where possible):

| Type | Badge style |
|---|---|
| warmup | amber/accent |
| technique | blue |
| muscle_memory | purple |
| theory | teal |
| lessons | green |
| songs | orange |
| free_practice | neutral/muted |

---

## Error handling

- All server actions validate that the target resource belongs to the current user before mutating. Return `{ error: "Not found" }` otherwise.
- Forms show inline error messages from action responses.
- Optimistic UI is not used — server actions revalidate the page path on success using Next.js `revalidatePath`.

---

## Testing

- Unit tests for `formatTopicName` (pure function, all 7 kinds).
- Unit tests for `refKey` computation logic.
- Integration tests (with mocked Prisma) for each server action: happy path + auth check.
- Component tests for the AddToGoal modal (open, goal selection, already-added state, no-goals state).
- Component tests for the section list (render, expand/collapse, add section form).
- No DnD tests (dnd-kit drag simulation in jsdom is unreliable — reorder action is tested via the server action test).
