# Custom Progressions — Design Spec

**Date:** 2026-04-09  
**Status:** Approved

---

## Overview

Allow users to create and manage their own chord progressions. Custom progressions appear in the Progressions tab of the Reference page's Harmony section, alongside the 26 built-in progressions. Like built-in progressions, they can be added to practice goals, included in routine sections, and appear in session history.

---

## Data Model

### New `UserProgression` Prisma model

```prisma
model UserProgression {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  displayName String
  description String   @default("")   // markdown
  mode        String                  // TonalJS mode name: "ionian", "aeolian", etc.
  degrees     String[]                // e.g. ["I", "V", "vi", "IV"]
  order       Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  goalTopics  GoalTopic[]
  @@index([userId])
}
```

**`degrees`** stores the roman numeral string produced by `analyzeProgression()` for each chord — e.g. `["I", "V", "vi", "IV"]` for diatonic chords, `["i", "♭VII", "♭VI", "♭VII"]` for borrowed ones.

**`mode`** stores the TonalJS mode name chosen by the user in the editor (e.g. `"ionian"`, `"aeolian"`, `"dorian"`). This determines the diatonic chord qualities and the "Over the whole progression" scale recommendation.

**Derived at display time (not stored):**
- `romanDisplay` — `degrees.join(" – ")`
- `recommendedScaleType` — derived from mode name (e.g. `"ionian"` → `"Major Scale"`)

### `GoalTopic` — new nullable FK

```prisma
userProgressionId  String?
userProgression    UserProgression? @relation(
  fields: [userProgressionId], references: [id], onDelete: SetNull
)
```

Parallel to the existing `userLessonId` field.

### `computeRefKey` extension (`lib/goals.ts`)

When `userProgressionId` is set, return `"user_progression:{id}:{defaultKey}"`. This maintains the uniqueness constraint per goal.

### `formatTopicName` extension (`lib/goals.ts`)

In the `"progression"` case, also check `topic.userProgression` (the FK relation). If present, return `topic.userProgression.displayName`. Falls back to existing built-in lookup if `userProgressionId` is null.

---

## Editor Page

### Route

`/library/progressions` — alongside `/library/manage`. Consistent with "user-owned content" under Library in the navigation.

### Link from Progressions tab

A small circle-pencil icon button placed after the `?` info button in `ProgressionsTab`. Same visual style as the `?` button (`w-6 h-6 rounded-full border`). Always links to `/library/progressions` — it is a library manager, not scoped to whichever progression is currently selected.

### `/library/progressions` — list page

Mirrors the "Manage my library" page structure:

- Heading: "My Progressions" + "New progression" button (top right)
- `UserProgressionList` — dnd-kit vertical sortable, optimistic reorder with rollback on error
- `UserProgressionCard` for each progression:
  - Drag handle
  - Display name + `romanDisplay` (derived)
  - Edit and Delete buttons
  - `onChanged()` calls `router.refresh()`
- Empty state: "No custom progressions yet." if list is empty

### `/library/progressions/new` and `/library/progressions/[id]/edit` — create/edit pages

Dedicated pages (not modals), matching the depth of the Routine editor:

| Field | Control |
|-------|---------|
| Display name | `<input type="text">` |
| Key | Root note selector (same list as Transposer: Ab, A, A#, …, G#) |
| Scale / Mode | Grouped `<select>` (Common / Modal / Advanced, same as Transposer) |
| Chords | `ChordInputRow` — reorderable, drag-and-drop, same component as Transposer/Key Finder |
| Description | Plain `<textarea>` with a note: "Supports markdown." |

**Chord entry and real-time transposition:**

1. Chord symbols in `ChordInputRow` are stored in component state as absolute names (e.g. `"C"`, `"G"`, `"Am"`), analyzed against the current key+mode via `analyzeProgression()`.
2. Degree badges (I, V, vi, ♭VII…) are shown on each tile, as in the Transposer.
3. When the user changes **key or mode**, all chord symbols are re-derived from the current roman numerals and re-populated — i.e. `transposeProgression()` is used to convert the existing chord list to the new key context.
4. On **Save**, `analyzeProgression()` is called to extract the final `degrees[]` and `mode`, which are persisted to `UserProgression`.
5. Non-diatonic and borrowed chords are supported (same as the Transposer). Their roman numeral strings (e.g. `"♭VII"`) are stored in `degrees`.

### Server actions (`app/(app)/library/progressions/actions.ts`)

```typescript
createUserProgression(data: { displayName, description, mode, degrees })
updateUserProgression(id, data: { displayName?, description?, mode?, degrees? })
deleteUserProgression(id)
reorderUserProgressions(orderedIds: string[])
```

All actions authenticate via `getUserId()`, enforce ownership, and call `revalidatePath`.

---

## Reference Page Integration

### Data flow

`UserProgression[]` for the current user is fetched server-side in `app/(app)/reference/page.tsx` (which is a server component) and passed as a prop into `ProgressionsTab` via `HarmonyStudy`.

### Progression selector

A final `<optgroup label="My Progressions">` is appended to the existing grouped selector. If the user has no custom progressions, the optgroup is omitted entirely.

### Resolving chords

A new `getUserProgressionChords(progression: UserProgression, tonic: string): ProgressionChord[]` function resolves stored degrees + mode to actual chord names in the given tonic — using the same `getDiatonicChords()` machinery as the built-in `getProgression()`. Returns the same `ProgressionChord[]` type.

### Rendering

`ProgressionsTab` dispatches to `getUserProgressionChords()` vs `getProgression()` based on whether the selected name matches a custom progression id. All existing UI — chord blocks (`ChordQualityBlock`), `SoloScalesPanel`, "Over the whole progression" recommendation — works unchanged with the same output type.

### Info popover (`?` button)

Shown for custom progressions. Displays `displayName`, `romanDisplay` (derived), and `description` (rendered as markdown). The built-in `examples` and `notes` fields are omitted.

---

## Goal & Study Topic Integration

### Adding to a goal

`AddToGoalButton` gains an optional `userProgressionId` prop. When set, `addTopicToGoal()` creates a `GoalTopic` with:
- `kind = "progression"`
- `userProgressionId` set to the custom progression's id
- `defaultKey` = currently selected tonic

### Display in goal/routine UI

`formatTopicName()` already switches on `kind === "progression"`. It is extended to check `topic.userProgression` first, returning `displayName` if present.

### Session runner

No changes required. The session runner resolves topics to display names and key sequences — custom progressions have the same `kind`, `defaultKey`, keys, and practice modes as built-in ones.

### Session snapshots (`SnapshotSectionTopic`)

`displayName` is copied at snapshot time (immutable). `subtype` stores the `userProgressionId` as a string. History is preserved even if the user later renames or deletes the progression.

### Deletion cascade

`GoalTopic.userProgressionId` is set to `null` on `UserProgression` deletion (`onDelete: SetNull`). `formatTopicName()` returns `"(progression removed)"` in that case — same behaviour as deleted user lessons.

---

## Files Affected

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `UserProgression` model; add `userProgressionId` FK to `GoalTopic` |
| `lib/goals.ts` | Extend `computeRefKey`, `formatTopicName` |
| `lib/theory/user-progressions.ts` | New: `getUserProgressionChords()` helper |
| `app/(app)/reference/_components/progressions-tab.tsx` | Accept user progressions prop, dispatch to new resolver, extend selector and info popover |
| `app/(app)/reference/page.tsx` | Fetch `UserProgression[]` server-side, pass through `HarmonyStudy` to `ProgressionsTab` |
| `app/(app)/reference/_components/harmony-study.tsx` | Thread `userProgressions` prop from page to `ProgressionsTab` |
| `app/(app)/library/progressions/page.tsx` | New: list page |
| `app/(app)/library/progressions/new/page.tsx` | New: create page |
| `app/(app)/library/progressions/[id]/edit/page.tsx` | New: edit page |
| `app/(app)/library/progressions/actions.ts` | New: CRUD + reorder server actions |
| `app/(app)/library/progressions/_components/` | New: `UserProgressionList`, `UserProgressionCard`, `ProgressionForm` |
| `components/add-to-goal-button.tsx` | Accept optional `userProgressionId` prop |
| `app/(app)/goals/actions.ts` | Extend `addTopicToGoal` to handle `userProgressionId` |

---

## Out of Scope

- Importing / copying from built-in progressions
- Sharing custom progressions between users
- Live markdown preview in the description field
