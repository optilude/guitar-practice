# User Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Sign-out button in the navbar with a user-icon popover, and add a `/settings` page where users can update their name, change their password, and delete their account.

**Architecture:** Navbar server component fetches name+isAdmin together and passes both to `NavbarClient`, which renders a `@base-ui/react` Popover. Settings page is a server component that passes user data to a client `SettingsForm` with three independent sections; delete confirmation is a two-step Dialog managed by a `step` state variable. Two new server actions (`updateName`, `deleteAccount`) live in `app/(app)/settings/actions.ts`; password change reuses the existing `changePassword` action.

**Tech Stack:** React, Next.js 16 App Router, Tailwind CSS v4, `@base-ui/react` v1.3 (Popover + Dialog), Prisma 7, Vitest + React Testing Library

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `__tests__/settings.test.ts` | Create | Unit tests for `updateName` and `deleteAccount` |
| `app/(app)/settings/actions.ts` | Create | `updateName` and `deleteAccount` server actions |
| `components/layout/navbar.tsx` | Modify | Fetch `{ name, isAdmin }` together; pass `userName` to client |
| `components/layout/navbar-client.tsx` | Modify | Replace Sign-out button with UserCircle icon + Popover menu |
| `app/(app)/settings/page.tsx` | Create | Server component; fetches `{ name, email }`; renders `SettingsForm` |
| `app/(app)/settings/settings-form.tsx` | Create | Client component; name section, password section, delete-account section |

---

### Task 1: Settings server actions (TDD)

**Files:**
- Create: `__tests__/settings.test.ts`
- Create: `app/(app)/settings/actions.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/settings.test.ts`:

```typescript
import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    user: { update: vi.fn(), delete: vi.fn() },
  },
}))

vi.mock("@/lib/get-user-id", () => ({
  getUserId: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

import { updateName, deleteAccount } from "@/app/(app)/settings/actions"
import { db } from "@/lib/db"
import { getUserId } from "@/lib/get-user-id"
import { revalidatePath } from "next/cache"

describe("updateName", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns error when unauthenticated", async () => {
    vi.mocked(getUserId).mockResolvedValue(null)
    const result = await updateName("Alice", new FormData())
    expect(result).toEqual({ error: "Not authenticated" })
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it("returns error for blank name", async () => {
    vi.mocked(getUserId).mockResolvedValue("user-1")
    const result = await updateName("   ", new FormData())
    expect(result).toEqual({ error: "Name is required" })
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it("updates with trimmed name and revalidates layout", async () => {
    vi.mocked(getUserId).mockResolvedValue("user-1")
    vi.mocked(db.user.update).mockResolvedValue({} as never)

    const result = await updateName("  Alice  ", new FormData())

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { name: "Alice" },
    })
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout")
    expect(result).toEqual({ success: true })
  })

  it("returns error when db throws", async () => {
    vi.mocked(getUserId).mockResolvedValue("user-1")
    vi.mocked(db.user.update).mockRejectedValue(new Error("db error"))

    const result = await updateName("Alice", new FormData())

    expect(result).toEqual({ error: "Failed to update name. Please try again." })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe("deleteAccount", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns error when unauthenticated", async () => {
    vi.mocked(getUserId).mockResolvedValue(null)
    const result = await deleteAccount(new FormData())
    expect(result).toEqual({ error: "Not authenticated" })
    expect(db.user.delete).not.toHaveBeenCalled()
  })

  it("deletes the user and returns success", async () => {
    vi.mocked(getUserId).mockResolvedValue("user-1")
    vi.mocked(db.user.delete).mockResolvedValue({} as never)

    const result = await deleteAccount(new FormData())

    expect(db.user.delete).toHaveBeenCalledWith({ where: { id: "user-1" } })
    expect(result).toEqual({ success: true })
  })

  it("returns error when db throws", async () => {
    vi.mocked(getUserId).mockResolvedValue("user-1")
    vi.mocked(db.user.delete).mockRejectedValue(new Error("constraint"))

    const result = await deleteAccount(new FormData())

    expect(result).toEqual({ error: "Failed to delete account. Please try again." })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/settings.test.ts
```

Expected: FAIL — `updateName` and `deleteAccount` not found.

- [ ] **Step 3: Create the actions file**

Create `app/(app)/settings/actions.ts`:

```typescript
"use server"

import { db } from "@/lib/db"
import { getUserId } from "@/lib/get-user-id"
import { revalidatePath } from "next/cache"

export async function updateName(
  name: string,
  _fd: FormData,
): Promise<{ success: true } | { error: string }> {
  const userId = await getUserId()
  if (!userId) return { error: "Not authenticated" }

  const trimmed = name.trim()
  if (!trimmed) return { error: "Name is required" }

  try {
    await db.user.update({ where: { id: userId }, data: { name: trimmed } })
  } catch (err) {
    console.error("updateName: db.user.update failed", err)
    return { error: "Failed to update name. Please try again." }
  }
  revalidatePath("/", "layout")
  return { success: true }
}

export async function deleteAccount(
  _fd: FormData,
): Promise<{ success: true } | { error: string }> {
  const userId = await getUserId()
  if (!userId) return { error: "Not authenticated" }

  try {
    await db.user.delete({ where: { id: userId } })
  } catch (err) {
    console.error("deleteAccount: db.user.delete failed", err)
    return { error: "Failed to delete account. Please try again." }
  }
  return { success: true }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/settings.test.ts
```

Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add __tests__/settings.test.ts app/(app)/settings/actions.ts
git commit -m "feat: add updateName and deleteAccount server actions"
```

---

### Task 2: Navbar — fetch user name and add popover menu

**Files:**
- Modify: `components/layout/navbar.tsx`
- Modify: `components/layout/navbar-client.tsx`

The navbar server component currently calls `getIsAdmin()` only. Replace it with a single `db.user.findUnique` that fetches both `name` and `isAdmin`. The client component replaces the Sign-out button with a `UserCircle` icon that opens a `@base-ui/react` Popover containing the user's name, a Settings link, and the Sign-out action.

- [ ] **Step 1: Update the server component**

Replace the full content of `components/layout/navbar.tsx`:

```typescript
import { NavbarClient } from "./navbar-client"
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"

export async function Navbar() {
  const userId = await getUserId()
  const user = userId
    ? await db.user.findUnique({
        where: { id: userId },
        select: { name: true, isAdmin: true },
      })
    : null
  return (
    <NavbarClient
      isAdmin={user?.isAdmin ?? false}
      userName={user?.name ?? null}
    />
  )
}
```

- [ ] **Step 2: Update the client component**

Replace the full content of `components/layout/navbar-client.tsx`:

```typescript
"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { UserCircle } from "lucide-react"
import { Popover } from "@base-ui/react/popover"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { MobileMenu } from "@/components/layout/mobile-menu"

const BASE_NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/goals", label: "Goals" },
  { href: "/history", label: "History" },
  { href: "/library", label: "Library" },
  { href: "/reference", label: "Reference" },
  { href: "/tools", label: "Tools" },
]

export function NavbarClient({
  isAdmin = false,
  userName = null,
}: {
  isAdmin?: boolean
  userName?: string | null
}) {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = isAdmin
    ? [...BASE_NAV_ITEMS, { href: "/admin/users", label: "Admin" }]
    : BASE_NAV_ITEMS

  async function handleSignOut() {
    await signOut({ redirect: false })
    router.push("/login")
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-50 h-11 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="flex h-full items-center gap-5 px-5">
        <div className="md:hidden">
          <MobileMenu items={navItems} />
        </div>

        <Link href="/" className="text-sm font-medium text-foreground/85 md:mr-3 hover:text-foreground transition-colors">
          Guitar Practice
        </Link>

        <div className="hidden md:flex items-center gap-5">
          {navItems.map((item) => {
            const isActive = item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-[13px] transition-colors pb-px",
                  isActive
                    ? "text-accent border-b-[1.5px] border-accent"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <Popover.Root>
            <Popover.Trigger className="hidden md:flex items-center text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded">
              <UserCircle className="size-5" />
              <span className="sr-only">User menu</span>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner side="bottom" align="end" sideOffset={8}>
                <Popover.Popup className="z-50 min-w-[160px] rounded-md border border-border bg-background shadow-md py-1 focus:outline-none">
                  {userName && (
                    <>
                      <div className="px-3 py-2 text-xs font-medium text-muted-foreground truncate">
                        {userName}
                      </div>
                      <div className="my-1 border-t border-border" />
                    </>
                  )}
                  <Link
                    href="/settings"
                    className="block px-3 py-1.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-3 py-1.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    Sign out
                  </button>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all existing tests pass (no regressions; navbar has no unit tests, visual QA via dev server).

- [ ] **Step 4: Commit**

```bash
git add components/layout/navbar.tsx components/layout/navbar-client.tsx
git commit -m "feat: replace Sign-out link with user-icon popover menu"
```

---

### Task 3: Settings page and form

**Files:**
- Create: `app/(app)/settings/page.tsx`
- Create: `app/(app)/settings/settings-form.tsx`

The page is a server component that fetches the current user's `name` and `email`, then renders a client `SettingsForm`. The form has three sections: display name (controlled input + `updateName`), password (three fields + existing `changePassword`), and danger zone (delete button + two-step `@base-ui/react` Dialog). The dialog open state is driven by a `step` variable: `"idle" | "confirm1" | "confirm2"`.

- [ ] **Step 1: Create the server page**

Create `app/(app)/settings/page.tsx`:

```typescript
import { redirect } from "next/navigation"
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { SettingsForm } from "./settings-form"

export default async function SettingsPage() {
  const userId = await getUserId()
  if (!userId) redirect("/login")

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  })
  if (!user) redirect("/login")

  return (
    <div className="max-w-lg space-y-8">
      <h1 className="text-lg font-semibold">Settings</h1>
      <SettingsForm name={user.name} email={user.email} />
    </div>
  )
}
```

- [ ] **Step 2: Create the settings form client component**

Create `app/(app)/settings/settings-form.tsx`:

```typescript
"use client"

import { useState, useTransition } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { Dialog } from "@base-ui/react/dialog"
import { cn } from "@/lib/utils"
import { btn } from "@/lib/button-styles"
import { updateName, deleteAccount } from "./actions"
import { changePassword } from "@/app/(auth)/change-password/actions"

type Step = "idle" | "confirm1" | "confirm2"
type Message = { type: "success" | "error"; text: string }

export function SettingsForm({
  name,
  email,
}: {
  name: string | null
  email: string
}) {
  const { update } = useSession()
  const router = useRouter()

  // Name section
  const [nameValue, setNameValue] = useState(name ?? "")
  const [nameMsg, setNameMsg] = useState<Message | null>(null)
  const [isNamePending, startNameTransition] = useTransition()

  // Password section
  const [passwordMsg, setPasswordMsg] = useState<Message | null>(null)
  const [isPasswordPending, startPasswordTransition] = useTransition()

  // Delete section
  const [step, setStep] = useState<Step>("idle")
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeletePending, startDeleteTransition] = useTransition()

  function handleNameSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setNameMsg(null)
    startNameTransition(async () => {
      const result = await updateName(nameValue, new FormData())
      if ("error" in result) {
        setNameMsg({ type: "error", text: result.error })
      } else {
        setNameMsg({ type: "success", text: "Name updated." })
      }
    })
  }

  function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPasswordMsg(null)
    const fd = new FormData(e.currentTarget)
    startPasswordTransition(async () => {
      const result = await changePassword(fd)
      if ("error" in result) {
        setPasswordMsg({ type: "error", text: result.error })
      } else {
        await update({ mustChangePassword: false })
        setPasswordMsg({ type: "success", text: "Password updated." });
        (e.target as HTMLFormElement).reset()
      }
    })
  }

  function handleDelete() {
    setDeleteError(null)
    startDeleteTransition(async () => {
      const result = await deleteAccount(new FormData())
      if ("error" in result) {
        setDeleteError(result.error)
      } else {
        await signOut({ redirect: false })
        router.push("/login")
      }
    })
  }

  return (
    <div className="space-y-10">

      {/* ── Display name ──────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Display name</h2>
        <form onSubmit={handleNameSubmit} className="space-y-3 max-w-sm">
          <input
            type="text"
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-shadow"
          />
          {nameMsg && (
            <p className={cn("text-xs", nameMsg.type === "error" ? "text-destructive" : "text-green-600 dark:text-green-400")}>
              {nameMsg.text}
            </p>
          )}
          <button type="submit" disabled={isNamePending} className={btn("primary", "sm")}>
            {isNamePending ? "Saving…" : "Save"}
          </button>
        </form>
      </section>

      <hr className="border-border" />

      {/* ── Password ──────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Password</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-3 max-w-sm">
          <div className="space-y-1.5">
            <label className="block text-xs text-muted-foreground">Current password</label>
            <input
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-shadow"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs text-muted-foreground">New password</label>
            <input
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-shadow"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs text-muted-foreground">Confirm new password</label>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-shadow"
            />
          </div>
          {passwordMsg && (
            <p className={cn("text-xs", passwordMsg.type === "error" ? "text-destructive" : "text-green-600 dark:text-green-400")}>
              {passwordMsg.text}
            </p>
          )}
          <button type="submit" disabled={isPasswordPending} className={btn("primary", "sm")}>
            {isPasswordPending ? "Saving…" : "Update password"}
          </button>
        </form>
      </section>

      <hr className="border-border" />

      {/* ── Danger zone ───────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
        <p className="text-xs text-muted-foreground">
          Deleting your account is permanent. All your data will be erased immediately.
        </p>
        <button
          type="button"
          onClick={() => setStep("confirm1")}
          className={btn("destructive", "sm")}
        >
          Delete account
        </button>

        <Dialog.Root
          open={step !== "idle"}
          onOpenChange={open => { if (!open) setStep("idle") }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
            <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-xl focus:outline-none">

              {step === "confirm1" && (
                <div className="space-y-4">
                  <Dialog.Title className="text-sm font-semibold">Delete account?</Dialog.Title>
                  <Dialog.Description className="text-sm text-muted-foreground">
                    All your data — goals, practice history, and progressions — will be permanently deleted.
                  </Dialog.Description>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setStep("idle")}
                      className={btn("standalone", "sm")}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep("confirm2")}
                      className={btn("destructive", "sm")}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {step === "confirm2" && (
                <div className="space-y-4">
                  <Dialog.Title className="text-sm font-semibold">Are you really sure?</Dialog.Title>
                  <Dialog.Description className="text-sm text-muted-foreground">
                    This cannot be undone. Your account will be deleted immediately.
                  </Dialog.Description>
                  {deleteError && (
                    <p className="text-xs text-destructive">{deleteError}</p>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setStep("idle")}
                      disabled={isDeletePending}
                      className={btn("standalone", "sm")}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeletePending}
                      className={btn("destructive", "sm")}
                    >
                      {isDeletePending ? "Deleting…" : "Yes, delete my account"}
                    </button>
                  </div>
                </div>
              )}

            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </section>

    </div>
  )
}
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass (636+).

- [ ] **Step 4: Commit**

```bash
git add app/(app)/settings/page.tsx app/(app)/settings/settings-form.tsx
git commit -m "feat: add settings page with name, password, and delete-account sections"
```

---

## Verification

After all tasks are committed, smoke-test in the browser with `npm run dev`:

1. **Navbar:** User icon appears in top-right. Click → popover shows name, Settings link, Sign out.
2. **Settings — name:** `/settings` renders. Change name → "Name updated." confirmation. Navbar popover reflects new name after next page load.
3. **Settings — password:** Change password → "Password updated." Fields clear. Correct password required.
4. **Settings — delete (step 1):** Click Delete account → first dialog appears with Continue/Cancel.
5. **Settings — delete (step 2):** Click Continue → second dialog appears with "cannot be undone" text.
6. **Settings — delete (cancel):** Clicking Cancel at either step closes the dialog cleanly.
7. **Settings — delete (confirm):** Click "Yes, delete my account" → account deleted → redirected to `/login`.
