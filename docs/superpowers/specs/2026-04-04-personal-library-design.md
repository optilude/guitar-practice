# Personal Library Design

## Goal

Allow users to maintain a personal supplementary set of lesson links in the Library, organised under the existing categories. Personal lessons appear alongside standard lessons in the library and work in the practice routine builder identically to standard lessons.

## Architecture

Eight files change. No new routes except `app/(app)/library/manage/`. No new libraries except `@dnd-kit` (already installed for the routine builder).

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `UserLesson` model; `description` on `Topic`; `userLessonId` on `GoalTopic` |
| `app/(app)/library/page.tsx` | Add "Manage my library" link |
| `app/(app)/library/[category]/page.tsx` | Standard/Personal tabs; expandable description rows |
| `app/(app)/library/manage/page.tsx` | New manage page (server component) |
| `app/(app)/library/manage/_components/` | Lesson list (DnD), lesson card (inline edit), add form |
| `app/(app)/library/actions.ts` | CRUD + reorder for `UserLesson`; source autocomplete query |
| `app/(app)/goals/actions.ts` | Update `addTopicToGoal` to handle personal lessons |
| `app/(app)/goals/[goalId]/routines/[routineId]/_components/section-card.tsx` | Resolve `userLessonId` alongside `lessonId` |

---

## Data Model

### New model: `UserLesson`

```prisma
model UserLesson {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  categoryId  String
  category    Category  @relation(fields: [categoryId], references: [id])
  title       String
  url         String?
  description String    @default("")
  source      String    @default("")
  order       Int
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  goalTopics  GoalTopic[]

  @@index([userId, categoryId])
}
```

- `url` is optional — a personal lesson can be a pure text note.
- `source` is free text (e.g. "YouTube", "Rick Beato", "My notes"). No foreign key to the `Source` table.
- `order` is scoped per user per category. New lessons are appended (highest existing `order + 1`).

The `Category` model gains a back-relation: `userLessons UserLesson[]`.

### Changes to `Topic` (standard lessons)

Add `description String @default("")`. All existing rows default to `""`. The UI shows a collapse chevron only when `description` is non-empty, so existing standard lessons are unaffected visually until a description is added via a future admin tool or migration.

### Changes to `GoalTopic`

Add `userLessonId String?` and the corresponding relation:

```prisma
userLessonId  String?
userLesson    UserLesson? @relation(fields: [userLessonId], references: [id], onDelete: SetNull)
```

Constraints:
- When `kind = "lesson"`, exactly one of `lessonId` or `userLessonId` is non-null. This is enforced at the application layer (in server actions), not at the database level.
- `refKey` for personal lessons: `"user_lesson:{userLessonId}"` — consistent with the existing `"lesson:{lessonId}"` pattern.
- The existing `@@unique([goalId, refKey])` constraint ensures idempotent adds.

### Changes to `User`

Add `userLessons UserLesson[]`.

---

## Library Overview Page (`/library`)

Add a "Manage my library" link near the top of the page, linking to `/library/manage`. Style to match the existing page's visual language (small accent-coloured text link).

---

## Library Category Page (`/library/[category]`)

### Tabs

When the current user has at least one personal lesson in this category, render Standard and Personal tabs (same pill style as other tab groups in the app). The Standard tab is active by default.

When the user has no personal lessons in this category, render only the standard lesson list with no tabs.

### Lesson row — unified structure

Both standard and personal lessons use the same row structure:

```
[title as link if URL, plain text if none] | [source badge] | [spacer 20px] | [+ Add to Goal]
                                                                OR
                                                               [chevron ▸/▾] | [+ Add to Goal]
```

- The 20px spacer replaces the chevron slot for rows with no description, keeping "Add to Goal" right-aligned across all rows.
- The chevron appears only when `description` is non-empty. Clicking it expands a description block below the row (Markdown rendered via `react-markdown`), and the chevron rotates to ▾.
- Standard lesson titles link to the lesson's external URL. Personal lesson titles link to `url` if non-null; otherwise plain text.
- Source badge: standard lessons show their `Source.name`; personal lessons show their free-text `source` field (hidden if empty).

### "Manage my library" link

Shown on the category page (top-right, small, consistent with the overview page). Links to `/library/manage#[category-slug]` — deep-linking to the category's anchor on the manage page.

### "Add to Goal" for personal lessons

Calls `addTopicToGoal` with `{ kind: "lesson", userLessonId }`. See GoalTopic Integration below.

---

## Manage Page (`/library/manage`)

### Structure

Server component page. Lists all categories (same set as the standard library — every category appears, not just ones with personal lessons, so users can always add to any category).

For each category:

```
[Category name]                              [Browse standard ↗]
┌──────────────────────────────────────────────────────────────┐
│ ⠿  Lesson title           [Source]   [Edit]  [Delete]        │
│ ⠿  Another lesson         [Source]   [Edit]  [Delete]        │
└──────────────────────────────────────────────────────────────┘
[+ Add a lesson to {Category}]   (dashed button, collapsed)
```

Each category section has an `id` attribute matching the category slug for anchor deep-linking.

### Lesson card — default state

Drag handle (⠿), title (link if URL), source badge, Edit button, Delete button. Same row structure as the library browse rows minus the chevron/Add-to-Goal column.

### Lesson card — editing state

Clicking Edit expands the card inline (same pattern as section cards in the routine builder). The drag handle greys out while editing. Fields:

- **Title** — text input (required)
- **URL** — text input, placeholder `https://...` (optional)
- **Source** — text input with `<datalist>` autocomplete populated from the user's existing source strings. Native `<datalist>` — no extra library.
- **Description** — `<textarea>`, Markdown supported, resizable

"Done" saves and collapses. "Delete" shows a confirmation modal before removing.

### Add form

Collapsed by default — a dashed "+ Add a lesson to {Category}" button. Expanding reveals the same four fields as the edit form. Submitting creates the lesson at the bottom of the category's list and collapses the form.

### Drag-and-drop reordering

Uses `@dnd-kit` with `verticalListSortingStrategy` (already installed). Reorder is per-category. Local state updates immediately; server persists via `reorderUserLessons` action. Same pattern as `section-list.tsx`.

---

## Server Actions (`app/(app)/library/actions.ts`)

All actions follow the existing pattern: `requireUserId()`, ownership check, mutation, `revalidatePath()`, return `{ success: true } | { error: string }`.

| Action | Description | `revalidatePath` |
|---|---|---|
| `createUserLesson(categoryId, data)` | Creates lesson, appends to end of category order | `/library`, `/library/[category]`, `/library/manage` |
| `updateUserLesson(id, data)` | Updates title/url/description/source | `/library`, `/library/[category]`, `/library/manage` |
| `deleteUserLesson(id)` | Deletes; re-sequences `order` within the category | `/library`, `/library/[category]`, `/library/manage` |
| `reorderUserLessons(categoryId, orderedIds)` | Batch-updates `order` via `$transaction` | `/library/manage` |
| `getUserLessonSources()` | Returns `string[]` of distinct non-empty `source` values for the current user (for `<datalist>`) | — (read-only) |

---

## GoalTopic Integration

### `addTopicToGoal` (in `app/(app)/goals/actions.ts`)

Add an overload path. When called with `userLessonId`:

```ts
await db.goalTopic.upsert({
  where: { goalId_refKey: { goalId, refKey: `user_lesson:${userLessonId}` } },
  create: { goalId, kind: "lesson", userLessonId, refKey: `user_lesson:${userLessonId}` },
  update: {},
})
```

Same idempotent `upsert` pattern as standard lessons.

### Section card (`section-card.tsx`)

Currently resolves `kind: "lesson"` topics by reading `goalTopic.lesson` (the `Topic` relation). Add a parallel branch: if `goalTopic.userLessonId` is set, read `goalTopic.userLesson` instead. The rendered output is identical — lesson title as a link (if URL present), plain text otherwise.

The Prisma query that loads routine sections must include `userLesson: true` in its include block alongside the existing `lesson: true`.

---

## Edge Cases

- **Source autocomplete with no prior sources:** `<datalist>` with zero options — the input field is still usable as plain text.
- **Personal lesson deleted while in a GoalTopic:** Prisma's default is `SetNull` on the `userLessonId` FK — the `GoalTopic` row remains but `userLessonId` becomes null. The section card should gracefully show a "(lesson removed)" placeholder when `kind = "lesson"` but both `lessonId` and `userLessonId` are null.
- **Empty source field:** No badge is rendered (same as if `source = ""`). Do not render an empty badge.
- **Category with no standard lessons, only personal:** The Standard tab is always shown. If there are no standard lessons, the Standard tab shows a "No lessons yet" empty state.

## What Is Not In Scope

- Creating or renaming categories (use existing categories only)
- Sharing personal lessons between users
- Importing links in bulk
- Adding descriptions to standard lessons via the UI (the `description` field is added to the schema for future use, but no admin edit UI is built here)
- Reordering categories on the manage page
