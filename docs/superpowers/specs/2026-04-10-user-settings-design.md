# User Settings Design

**Date:** 2026-04-10
**Status:** Approved

## Overview

Replace the "Sign out" text link in the navbar with a user icon that opens a popover menu. Add a `/settings` page where users can update their display name, change their password, and delete their account.

---

## 1. Navbar

### Server component (`components/layout/navbar.tsx`)

Extend the existing DB call to fetch both `name` and `isAdmin` in a single `findUnique`:

```ts
const user = await db.user.findUnique({
  where: { id: userId },
  select: { name: true, isAdmin: true },
})
```

Pass `userName: string | null` alongside `isAdmin` to `NavbarClient`.

### Client component (`components/layout/navbar-client.tsx`)

Replace the "Sign out" `<button>` with a `UserCircle` icon (Lucide, already available). Clicking opens a `@base-ui/react` Popover anchored to the icon, inline in `NavbarClient` — no separate component file.

Popover content:
```
[Full name — muted, non-interactive]
────────────────
Settings          → Link to /settings
Sign out          → existing handleSignOut()
```

The popover appears below/right of the icon (standard top-right navbar anchor). Focus management and click-outside dismissal are handled by `@base-ui/react`.

---

## 2. Settings Page

### Route

`app/(app)/settings/page.tsx` — async server component, protected by the existing proxy middleware (unauthenticated users are redirected to `/login` automatically).

Fetches `{ name, email }` for the current user:

```ts
const userId = await getUserId()
const user = await db.user.findUnique({
  where: { id: userId! },
  select: { name: true, email: true },
})
```

Renders `<SettingsForm name={user.name} email={user.email} />`.

### Client component (`app/(app)/settings/settings-form.tsx`)

Three visually separated sections:

#### 2a. Display name

- Text input pre-filled with current name
- Save button
- On success: inline "Name updated" confirmation
- On error: inline error message
- Calls `updateName` server action

#### 2b. Password

- Three fields: current password, new password, confirm new password
- Save button
- On success: inline "Password updated" confirmation; calls `session.update({ mustChangePassword: false })` to keep the JWT in sync (same pattern as the change-password page)
- On error: inline error message
- Calls the existing `changePassword` action from `app/(auth)/change-password/actions.ts`

#### 2c. Danger zone

- "Delete account" button (destructive style)
- Two-step confirmation modal managed by a `step` state: `"idle" | "confirm1" | "confirm2"`
- Single `@base-ui/react` Dialog, content swaps based on step

**Step 1 content:**
> Are you sure you want to delete your account? All your data — goals, practice history, and progressions — will be permanently deleted.

Actions: Cancel (close) / Continue

**Step 2 content:**
> This cannot be undone. Your account will be deleted immediately.

Actions: Cancel (back to idle) / Yes, delete my account

On final confirmation:
1. Call `deleteAccount()` server action
2. If `{ success: true }`: call `signOut({ redirect: false })` then `router.push("/login")`
3. If `{ error }`: show inline error, close modal

---

## 3. Server Actions (`app/(app)/settings/actions.ts`)

### `updateName(name: string, _fd: FormData)`

```
1. getUserId() — return { error: "Not authenticated" } if null
2. Trim name; return { error: "Name is required" } if empty
3. db.user.update({ where: { id }, data: { name } })
4. revalidatePath("/", "layout")  — invalidates all routes so the navbar reflects the new name
5. Return { success: true }
6. On DB error: return { error: "Failed to update name. Please try again." }
```

### `deleteAccount(_fd: FormData)`

```
1. getUserId() — return { error: "Not authenticated" } if null
2. db.user.delete({ where: { id } })
   — cascade-deletes: goals, userLessons, userProgressions, practiceSessions, passwordResetTokens
3. Return { success: true }
4. On DB error: return { error: "Failed to delete account. Please try again." }
```

`changePassword` is imported from `@/app/(auth)/change-password/actions` — no duplication.

---

## 4. Tests (`__tests__/settings.test.ts`)

### `updateName`
- Returns error when unauthenticated
- Returns error for empty name (after trim)
- Calls `db.user.update` with trimmed name and returns `{ success: true }`
- Returns error when DB throws

### `deleteAccount`
- Returns error when unauthenticated
- Calls `db.user.delete({ where: { id } })` and returns `{ success: true }`
- Returns error when DB throws

Client-side behaviour (two-step modal, `signOut`) is not unit-tested.

---

## 5. File Summary

| File | Action |
|------|--------|
| `components/layout/navbar.tsx` | Fetch `name` + `isAdmin` together; pass `userName` to client |
| `components/layout/navbar-client.tsx` | Replace Sign out button with user icon + Popover |
| `app/(app)/settings/page.tsx` | New server component; fetch user name + email |
| `app/(app)/settings/settings-form.tsx` | New client component; three sections + two-step delete modal |
| `app/(app)/settings/actions.ts` | `updateName`, `deleteAccount` server actions |
| `__tests__/settings.test.ts` | Unit tests for the two new actions |
