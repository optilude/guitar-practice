# User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add role-based user management (admin vs. normal), force-change-password flow, self-service password reset via email, an admin UI to promote/demote users, and a seeded default admin — with Mailpit for local email and Resend for production.

**Architecture:** Extend the existing credentials auth (NextAuth v5 + Prisma) with `isAdmin` and `mustChangePassword` fields on the User model. The edge proxy already forwards the user ID as a request header; it will also forward `x-is-admin` so server components can gate admin access without DB calls. Password reset uses a short-lived token stored in a new `PasswordResetToken` table, with email delivery via nodemailer (Mailpit locally, Resend SMTP in production).

**Tech Stack:** Next.js 16, NextAuth v5 beta.30, Prisma 7, PostgreSQL, nodemailer, bcryptjs, Tailwind CSS v4, Vitest

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `prisma/schema.prisma` | Modify | Add `isAdmin`, `mustChangePassword` to User; add `PasswordResetToken` model |
| `types/next-auth.d.ts` | Create | Extend NextAuth `User`, `JWT`, `Session` interfaces with new fields |
| `auth.config.ts` | Modify | JWT/session callbacks persist and expose `isAdmin` and `mustChangePassword` |
| `lib/auth.ts` | Modify | `authorizeUser` returns `isAdmin` and `mustChangePassword` from DB |
| `proxy.ts` | Modify | Forward `x-is-admin` header; redirect `mustChangePassword` users to `/change-password`; add forgot/reset to public paths |
| `lib/get-user-id.ts` | Modify | Add `getIsAdmin()` helper |
| `lib/email.ts` | Create | nodemailer SMTP client (env-configured) |
| `lib/require-admin.ts` | Create | Guard helper: reads `getIsAdmin()`, redirects to `/` if false |
| `app/(auth)/change-password/actions.ts` | Create | Verify current password, hash new one, clear `mustChangePassword` flag |
| `app/(auth)/change-password/page.tsx` | Create | Force-change-password form (client component) |
| `app/(auth)/forgot-password/actions.ts` | Create | Generate reset token, persist, send email |
| `app/(auth)/forgot-password/page.tsx` | Create | "Enter your email" form (client component) |
| `app/(auth)/reset-password/actions.ts` | Create | Validate token, update password, delete token |
| `app/(auth)/reset-password/page.tsx` | Create | "Enter new password" form (client component, reads token from URL) |
| `app/(auth)/login/page.tsx` | Modify | Add "Forgot password?" link; show "Password changed" flash on `?passwordChanged=1` |
| `app/(app)/admin/users/page.tsx` | Create | Server component: list all users with promote/demote buttons |
| `app/(app)/admin/users/actions.ts` | Create | `setAdmin` server action (guards against self-demotion) |
| `components/layout/navbar.tsx` | Modify | Async server component; reads `getIsAdmin()` and passes to client |
| `components/layout/navbar-client.tsx` | Modify | Accept `isAdmin` prop; add Admin link to nav items when true |
| `prisma/seed.ts` | Modify | Idempotently create a default admin user before seeding topics |
| `.env.example` | Modify | Document SMTP, app URL, and admin seed variables |
| `README.md` | Modify | Document SMTP setup, admin seed, first-time setup steps |
| `__tests__/auth.test.ts` | Modify | Update `mockUser` and result assertions for new fields |
| `__tests__/change-password.test.ts` | Create | Tests for `changePassword` action |
| `__tests__/forgot-password.test.ts` | Create | Tests for `requestPasswordReset` action |
| `__tests__/reset-password.test.ts` | Create | Tests for `validateResetToken` and `resetPassword` actions |
| `__tests__/admin-users.test.ts` | Create | Tests for `setAdmin` action |

---

### Task 1: Prisma schema changes + NextAuth type augmentation

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `types/next-auth.d.ts`

- [ ] **Step 1: Add fields to the User model and add PasswordResetToken**

In `prisma/schema.prisma`, update the `User` model and add the new model. Replace the current `User` model with:

```prisma
model User {
  id                  String               @id @default(cuid())
  name                String?
  email               String               @unique
  passwordHash        String
  isAdmin             Boolean              @default(false)
  mustChangePassword  Boolean              @default(false)
  createdAt           DateTime             @default(now())
  updatedAt           DateTime             @updatedAt
  goals               Goal[]
  userLessons         UserLesson[]
  userProgressions    UserProgression[]
  practiceSessions    PracticeSession[]
  passwordResetTokens PasswordResetToken[]
}
```

Add the new model after `User` (before `Source`):

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

- [ ] **Step 2: Run the migration**

```bash
pnpm db:migrate
```

When prompted for a migration name, enter: `add_admin_and_password_reset`

Expected output ends with: `Your database is now in sync with your schema.`

The Prisma client is regenerated automatically as part of `prisma migrate dev`.

- [ ] **Step 3: Create NextAuth type augmentation**

Create `types/next-auth.d.ts`:

```typescript
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    isAdmin?: boolean
    mustChangePassword?: boolean
  }
  interface Session {
    user: {
      id: string
      isAdmin: boolean
      mustChangePassword: boolean
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    isAdmin?: boolean
    mustChangePassword?: boolean
  }
}
```

TypeScript picks this up automatically via `**/*.ts` in tsconfig.json — no explicit import needed.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | head -30
```

Expected: no errors about `isAdmin` or `mustChangePassword`.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma types/next-auth.d.ts prisma/migrations/
git commit -m "feat: add isAdmin, mustChangePassword to User; add PasswordResetToken model"
```

---

### Task 2: JWT plumbing — propagate isAdmin and mustChangePassword

**Files:**
- Modify: `lib/auth.ts`
- Modify: `auth.config.ts`
- Modify: `proxy.ts`
- Modify: `lib/get-user-id.ts`
- Modify: `__tests__/auth.test.ts`

- [ ] **Step 1: Update the existing auth test to expect the new fields**

In `__tests__/auth.test.ts`, replace the `mockUser` object and the successful-authorize test:

```typescript
const mockUser = {
  id: "cuid_123",
  email: "test@example.com",
  name: "Test User",
  passwordHash: "$2b$12$hashedpassword",
  isAdmin: false,
  mustChangePassword: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  goals: [],
  userLessons: [],
  userProgressions: [],
  practiceSessions: [],
  passwordResetTokens: [],
}
```

Replace the "returns user payload when credentials are valid" test:

```typescript
it("returns user payload when credentials are valid", async () => {
  vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)
  vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

  const result = await authorizeUser("test@example.com", "correct-password")

  expect(result).toEqual({
    id: "cuid_123",
    email: "test@example.com",
    name: "Test User",
    isAdmin: false,
    mustChangePassword: false,
  })
})
```

Replace the "does not include passwordHash" test:

```typescript
it("does not include passwordHash in the returned payload", async () => {
  vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)
  vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

  const result = await authorizeUser("test@example.com", "correct-password")

  expect(result).not.toHaveProperty("passwordHash")
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test:run __tests__/auth.test.ts
```

Expected: FAIL — "returns user payload when credentials are valid" fails because `isAdmin` and `mustChangePassword` are not yet in the return value.

- [ ] **Step 3: Update authorizeUser in lib/auth.ts**

Replace the `authorizeUser` return statement:

```typescript
export async function authorizeUser(
  email: string,
  password: string
): Promise<{ id: string; email: string; name: string | null; isAdmin: boolean; mustChangePassword: boolean } | null> {
  const user = await db.user.findUnique({ where: { email } })
  if (!user) return null

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
    mustChangePassword: user.mustChangePassword,
  }
}
```

- [ ] **Step 4: Update auth.config.ts callbacks**

Replace the entire `callbacks` block in `auth.config.ts`:

```typescript
callbacks: {
  jwt({ token, user }) {
    if (user?.id) token.id = user.id
    // user is only defined on initial sign-in (from authorize callback)
    const u = user as { isAdmin?: boolean; mustChangePassword?: boolean } | undefined
    if (u?.isAdmin !== undefined) token.isAdmin = u.isAdmin
    if (u?.mustChangePassword !== undefined) token.mustChangePassword = u.mustChangePassword
    return token
  },
  session({ session, token }) {
    if (token.id) session.user.id = token.id as string
    session.user.isAdmin = (token.isAdmin as boolean) ?? false
    session.user.mustChangePassword = (token.mustChangePassword as boolean) ?? false
    return session
  },
},
```

- [ ] **Step 5: Update proxy.ts — forward headers and enforce mustChangePassword redirect**

Replace the entire `proxy.ts` file:

```typescript
import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  const isPublicPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")

  if (!isLoggedIn && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }

  if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/", req.nextUrl))
  }

  // Redirect users who must change their password (but not if they're already on that page)
  const mustChange = isLoggedIn && req.auth?.user?.mustChangePassword
  const isChangePwPath = pathname.startsWith("/change-password")
  if (mustChange && !isChangePwPath) {
    return NextResponse.redirect(new URL("/change-password", req.nextUrl))
  }

  // Forward user ID and admin status as request headers so server components
  // can read them via `await headers()`. Strip any client-supplied values first.
  const requestHeaders = new Headers(req.headers)
  requestHeaders.delete("x-user-id")
  requestHeaders.delete("x-is-admin")
  if (isLoggedIn && req.auth?.user?.id) {
    requestHeaders.set("x-user-id", req.auth.user.id)
  }
  if (isLoggedIn && req.auth?.user?.isAdmin) {
    requestHeaders.set("x-is-admin", "true")
  }
  return NextResponse.next({ request: { headers: requestHeaders } })
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/).*)"],
}
```

- [ ] **Step 6: Add getIsAdmin to lib/get-user-id.ts**

Append to the end of `lib/get-user-id.ts`:

```typescript
/**
 * Returns true if the authenticated user is an admin.
 * Reads the x-is-admin header forwarded by the edge proxy.
 */
export async function getIsAdmin(): Promise<boolean> {
  const headersList = await headers()
  return headersList.get("x-is-admin") === "true"
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
pnpm test:run __tests__/auth.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 8: Commit**

```bash
git add lib/auth.ts auth.config.ts proxy.ts lib/get-user-id.ts __tests__/auth.test.ts
git commit -m "feat: propagate isAdmin and mustChangePassword through JWT and proxy headers"
```

---

### Task 3: Force-change-password flow

**Files:**
- Create: `app/(auth)/change-password/actions.ts`
- Create: `app/(auth)/change-password/page.tsx`
- Create: `__tests__/change-password.test.ts`
- Modify: `app/(auth)/login/page.tsx`

- [ ] **Step 1: Write tests for the changePassword action**

Create `__tests__/change-password.test.ts`:

```typescript
import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}))

vi.mock("@/lib/get-user-id", () => ({
  getUserId: vi.fn(),
}))

import { changePassword } from "@/app/(auth)/change-password/actions"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { getUserId } from "@/lib/get-user-id"

const makeFormData = (fields: Record<string, string>) => {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.set(k, v))
  return fd
}

const mockUser = {
  id: "cuid_123",
  email: "test@example.com",
  name: "Test User",
  passwordHash: "$2b$12$oldhash",
  isAdmin: false,
  mustChangePassword: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe("changePassword", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns error when not authenticated", async () => {
    vi.mocked(getUserId).mockResolvedValue(null)

    const result = await changePassword(
      makeFormData({ currentPassword: "old", newPassword: "newpass1", confirmPassword: "newpass1" })
    )

    expect(result).toEqual({ error: "Not authenticated" })
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it("returns error when passwords do not match", async () => {
    vi.mocked(getUserId).mockResolvedValue("cuid_123")
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const result = await changePassword(
      makeFormData({ currentPassword: "old", newPassword: "newpass1", confirmPassword: "different" })
    )

    expect(result).toEqual({ error: "Passwords do not match" })
  })

  it("returns error when new password is too short", async () => {
    vi.mocked(getUserId).mockResolvedValue("cuid_123")
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const result = await changePassword(
      makeFormData({ currentPassword: "old", newPassword: "short", confirmPassword: "short" })
    )

    expect(result).toEqual({ error: "Password must be at least 8 characters" })
  })

  it("returns error when current password is incorrect", async () => {
    vi.mocked(getUserId).mockResolvedValue("cuid_123")
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

    const result = await changePassword(
      makeFormData({ currentPassword: "wrong", newPassword: "newpassword1", confirmPassword: "newpassword1" })
    )

    expect(result).toEqual({ error: "Current password is incorrect" })
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it("updates password hash and clears mustChangePassword on success", async () => {
    vi.mocked(getUserId).mockResolvedValue("cuid_123")
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
    vi.mocked(bcrypt.hash).mockResolvedValue("$2b$12$newhash" as never)
    vi.mocked(db.user.update).mockResolvedValue({ ...mockUser, mustChangePassword: false })

    const result = await changePassword(
      makeFormData({ currentPassword: "old", newPassword: "newpassword1", confirmPassword: "newpassword1" })
    )

    expect(bcrypt.hash).toHaveBeenCalledWith("newpassword1", 12)
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "cuid_123" },
      data: { passwordHash: "$2b$12$newhash", mustChangePassword: false },
    })
    expect(result).toEqual({ success: true })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test:run __tests__/change-password.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the changePassword server action**

Create `app/(auth)/change-password/actions.ts`:

```typescript
"use server"

import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { getUserId } from "@/lib/get-user-id"

export async function changePassword(
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const userId = await getUserId()
  if (!userId) return { error: "Not authenticated" }

  const currentPassword = formData.get("currentPassword") as string
  const newPassword = formData.get("newPassword") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (newPassword !== confirmPassword) return { error: "Passwords do not match" }
  if (newPassword.length < 8) return { error: "Password must be at least 8 characters" }

  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return { error: "User not found" }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) return { error: "Current password is incorrect" }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await db.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false },
  })

  return { success: true }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test:run __tests__/change-password.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Create the change-password page**

Create `app/(auth)/change-password/page.tsx`:

```tsx
"use client"

import { useState, useTransition } from "react"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { changePassword } from "./actions"

export default function ChangePasswordPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await changePassword(formData)
      if ("error" in result) {
        setError(result.error)
      } else {
        // Clear the session so the next sign-in gets a fresh JWT without mustChangePassword
        await signOut({ redirect: false })
        router.push("/login?passwordChanged=1")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-6 text-center space-y-1">
        <h1 className="text-sm font-semibold text-foreground">Set a new password</h1>
        <p className="text-xs text-muted-foreground">You must change your password before continuing.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="currentPassword" className="block text-xs uppercase tracking-widest text-muted-foreground">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-shadow"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="newPassword" className="block text-xs uppercase tracking-widest text-muted-foreground">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-shadow"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="block text-xs uppercase tracking-widest text-muted-foreground">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-shadow"
        />
      </div>

      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {isPending ? "Saving…" : "Set new password"}
      </button>
    </form>
  )
}
```

- [ ] **Step 6: Update the login page to show a flash message**

In `app/(auth)/login/page.tsx`, change it from a plain client component to one that reads the search param. Replace the entire file:

```tsx
"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const passwordChanged = searchParams.get("passwordChanged") === "1"

  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid email or password")
      setPending(false)
    } else {
      router.push("/")
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {passwordChanged && (
        <p className="text-xs text-green-600 dark:text-green-400 text-center">
          Password changed. Please sign in with your new password.
        </p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-xs uppercase tracking-widest text-muted-foreground">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent transition-shadow"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="block text-xs uppercase tracking-widest text-muted-foreground">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-shadow"
        />
      </div>

      {error && (
        <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        No account?{" "}
        <Link
          href="/register"
          className="text-foreground underline underline-offset-2 decoration-border hover:decoration-foreground transition-colors"
        >
          Register
        </Link>
      </p>
    </form>
  )
}
```

- [ ] **Step 7: Run full test suite**

```bash
pnpm test:run
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add app/(auth)/change-password/ __tests__/change-password.test.ts app/(auth)/login/page.tsx
git commit -m "feat: force-change-password flow with sign-out on success"
```

---

### Task 4: Email helper

**Files:**
- Create: `lib/email.ts`
- Modify: `.env.example`

- [ ] **Step 1: Install nodemailer**

```bash
pnpm add nodemailer
pnpm add -D @types/nodemailer
```

Expected: `dependencies` now includes `nodemailer`, `devDependencies` includes `@types/nodemailer`.

- [ ] **Step 2: Create lib/email.ts**

Create `lib/email.ts`:

```typescript
import nodemailer from "nodemailer"

/**
 * Send an email via SMTP.
 *
 * In development, point SMTP_HOST=localhost and SMTP_PORT=1025 (Mailpit).
 * In production, use SMTP_HOST=smtp.resend.com, SMTP_PORT=587,
 * SMTP_USER=resend, SMTP_PASSWORD=<resend_api_key>.
 *
 * SMTP_FROM defaults to noreply@guitarapp.local for local dev.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
    auth:
      process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
  })

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? "noreply@guitarapp.local",
    to,
    subject,
    html,
  })
}
```

- [ ] **Step 3: Update .env.example with the new variables**

Read the current `.env.example` file first, then append the following block at the end:

```
# Email (SMTP)
# Development: start Mailpit with `mailpit` (brew install mailpit)
#   SMTP_HOST=localhost
#   SMTP_PORT=1025
#   SMTP_FROM=noreply@guitarapp.local
# Production (Resend): SMTP_HOST=smtp.resend.com, SMTP_PORT=587,
#   SMTP_USER=resend, SMTP_PASSWORD=re_your_api_key,
#   SMTP_FROM=noreply@yourdomain.com (must be a verified Resend domain)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@guitarapp.local

# Application URL (used in password reset emails)
# Development: http://localhost:3000
# Production: https://your-domain.com
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Admin seed (used by pnpm db:seed to create a default admin if none exists)
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=changeme123
```

Also copy these values to your `.env.local`:

```bash
echo "
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@guitarapp.local
NEXT_PUBLIC_APP_URL=http://localhost:3000
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=changeme123
" >> .env.local
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | head -20
```

Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add lib/email.ts .env.example
git commit -m "feat: add nodemailer email helper with SMTP env configuration"
```

---

### Task 5: Forgot-password flow

**Files:**
- Create: `app/(auth)/forgot-password/actions.ts`
- Create: `app/(auth)/forgot-password/page.tsx`
- Create: `__tests__/forgot-password.test.ts`

- [ ] **Step 1: Write tests for the requestPasswordReset action**

Create `__tests__/forgot-password.test.ts`:

```typescript
import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn() },
    passwordResetToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
}))

vi.mock("crypto", async () => {
  const actual = await vi.importActual<typeof import("crypto")>("crypto")
  return { ...actual, randomBytes: vi.fn(() => Buffer.from("deadbeefdeadbeef", "hex")) }
})

import { requestPasswordReset } from "@/app/(auth)/forgot-password/actions"
import { db } from "@/lib/db"
import { sendEmail } from "@/lib/email"

const makeFormData = (fields: Record<string, string>) => {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.set(k, v))
  return fd
}

const mockUser = {
  id: "cuid_123",
  email: "test@example.com",
  name: "Test",
  passwordHash: "hash",
  isAdmin: false,
  mustChangePassword: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe("requestPasswordReset", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns success without sending email when user does not exist (prevents enumeration)", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null)

    const result = await requestPasswordReset(makeFormData({ email: "nobody@example.com" }))

    expect(result).toEqual({ success: true })
    expect(sendEmail).not.toHaveBeenCalled()
    expect(db.passwordResetToken.create).not.toHaveBeenCalled()
  })

  it("deletes existing tokens, creates a new one, and sends email when user exists", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)
    vi.mocked(db.passwordResetToken.deleteMany).mockResolvedValue({ count: 0 })
    vi.mocked(db.passwordResetToken.create).mockResolvedValue({
      id: "tok1",
      token: "deadbeefdeadbeef",
      userId: "cuid_123",
      expiresAt: new Date(),
      createdAt: new Date(),
    })

    const result = await requestPasswordReset(makeFormData({ email: "test@example.com" }))

    expect(db.passwordResetToken.deleteMany).toHaveBeenCalledWith({ where: { userId: "cuid_123" } })
    expect(db.passwordResetToken.create).toHaveBeenCalled()
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "test@example.com", subject: expect.stringContaining("password") })
    )
    expect(result).toEqual({ success: true })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test:run __tests__/forgot-password.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the requestPasswordReset action**

Create `app/(auth)/forgot-password/actions.ts`:

```typescript
"use server"

import crypto from "crypto"
import { db } from "@/lib/db"
import { sendEmail } from "@/lib/email"

export async function requestPasswordReset(
  formData: FormData,
): Promise<{ success: true }> {
  const email = formData.get("email") as string

  const user = await db.user.findUnique({ where: { email } })
  // Always return success — prevents email enumeration
  if (!user) return { success: true }

  // Delete any existing tokens for this user before creating a new one
  await db.passwordResetToken.deleteMany({ where: { userId: user.id } })

  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await db.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const resetUrl = `${appUrl}/reset-password?token=${token}`

  await sendEmail({
    to: email,
    subject: "Reset your Guitar Practice password",
    html: `
      <p>You requested a password reset for your Guitar Practice account.</p>
      <p>Click the link below to set a new password. This link expires in 1 hour.</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  })

  return { success: true }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test:run __tests__/forgot-password.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 5: Create the forgot-password page**

Create `app/(auth)/forgot-password/page.tsx`:

```tsx
"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { requestPasswordReset } from "./actions"

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await requestPasswordReset(formData)
      setSubmitted(true)
    })
  }

  if (submitted) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-foreground">Check your email</p>
        <p className="text-xs text-muted-foreground">
          If that address is registered, you&apos;ll receive a reset link shortly.
        </p>
        <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-6 text-center">
        <h1 className="text-sm font-semibold text-foreground">Reset your password</h1>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-xs uppercase tracking-widest text-muted-foreground">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-shadow"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {isPending ? "Sending…" : "Send reset link"}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        <Link href="/login" className="text-foreground underline underline-offset-2 decoration-border hover:decoration-foreground transition-colors">
          Back to sign in
        </Link>
      </p>
    </form>
  )
}
```

- [ ] **Step 6: Run full test suite**

```bash
pnpm test:run
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add app/(auth)/forgot-password/ __tests__/forgot-password.test.ts
git commit -m "feat: forgot-password flow — generate token, send reset email"
```

---

### Task 6: Reset-password flow

**Files:**
- Create: `app/(auth)/reset-password/actions.ts`
- Create: `app/(auth)/reset-password/page.tsx`
- Create: `__tests__/reset-password.test.ts`

- [ ] **Step 1: Write tests for the reset-password actions**

Create `__tests__/reset-password.test.ts`:

```typescript
import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    passwordResetToken: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  },
}))

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn() },
}))

import { validateResetToken, resetPassword } from "@/app/(auth)/reset-password/actions"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

const makeFormData = (fields: Record<string, string>) => {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.set(k, v))
  return fd
}

const validToken = {
  id: "tok1",
  token: "abc123",
  userId: "cuid_123",
  expiresAt: new Date(Date.now() + 3600_000), // 1 hour from now
  createdAt: new Date(),
}

const expiredToken = {
  ...validToken,
  expiresAt: new Date(Date.now() - 1000), // 1 second ago
}

describe("validateResetToken", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns valid: false when token does not exist", async () => {
    vi.mocked(db.passwordResetToken.findUnique).mockResolvedValue(null)
    expect(await validateResetToken("bad-token")).toEqual({ valid: false })
  })

  it("returns valid: false when token is expired", async () => {
    vi.mocked(db.passwordResetToken.findUnique).mockResolvedValue(expiredToken)
    expect(await validateResetToken("abc123")).toEqual({ valid: false })
  })

  it("returns valid: true with userId when token is valid", async () => {
    vi.mocked(db.passwordResetToken.findUnique).mockResolvedValue(validToken)
    expect(await validateResetToken("abc123")).toEqual({ valid: true, userId: "cuid_123" })
  })
})

describe("resetPassword", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns error when passwords do not match", async () => {
    const result = await resetPassword(
      makeFormData({ token: "abc123", newPassword: "newpass1", confirmPassword: "different" })
    )
    expect(result).toEqual({ error: "Passwords do not match" })
  })

  it("returns error when password is too short", async () => {
    const result = await resetPassword(
      makeFormData({ token: "abc123", newPassword: "short", confirmPassword: "short" })
    )
    expect(result).toEqual({ error: "Password must be at least 8 characters" })
  })

  it("returns error when token is invalid or expired", async () => {
    vi.mocked(db.passwordResetToken.findUnique).mockResolvedValue(null)
    const result = await resetPassword(
      makeFormData({ token: "bad", newPassword: "newpassword1", confirmPassword: "newpassword1" })
    )
    expect(result).toEqual({ error: "Invalid or expired reset link" })
  })

  it("updates password and deletes token on success", async () => {
    vi.mocked(db.passwordResetToken.findUnique).mockResolvedValue(validToken)
    vi.mocked(bcrypt.hash).mockResolvedValue("$2b$12$newhash" as never)
    vi.mocked(db.user.update).mockResolvedValue({} as never)
    vi.mocked(db.passwordResetToken.delete).mockResolvedValue({} as never)

    const result = await resetPassword(
      makeFormData({ token: "abc123", newPassword: "newpassword1", confirmPassword: "newpassword1" })
    )

    expect(bcrypt.hash).toHaveBeenCalledWith("newpassword1", 12)
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "cuid_123" },
      data: { passwordHash: "$2b$12$newhash" },
    })
    expect(db.passwordResetToken.delete).toHaveBeenCalledWith({ where: { token: "abc123" } })
    expect(result).toEqual({ success: true })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test:run __tests__/reset-password.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the reset-password actions**

Create `app/(auth)/reset-password/actions.ts`:

```typescript
"use server"

import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

export async function validateResetToken(
  token: string,
): Promise<{ valid: true; userId: string } | { valid: false }> {
  const record = await db.passwordResetToken.findUnique({ where: { token } })
  if (!record || record.expiresAt < new Date()) return { valid: false }
  return { valid: true, userId: record.userId }
}

export async function resetPassword(
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const token = formData.get("token") as string
  const newPassword = formData.get("newPassword") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (newPassword !== confirmPassword) return { error: "Passwords do not match" }
  if (newPassword.length < 8) return { error: "Password must be at least 8 characters" }

  const record = await db.passwordResetToken.findUnique({ where: { token } })
  if (!record || record.expiresAt < new Date()) return { error: "Invalid or expired reset link" }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await db.user.update({ where: { id: record.userId }, data: { passwordHash } })
  await db.passwordResetToken.delete({ where: { token } })

  return { success: true }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test:run __tests__/reset-password.test.ts
```

Expected: PASS (7 tests)

- [ ] **Step 5: Create the reset-password page**

Create `app/(auth)/reset-password/page.tsx`:

```tsx
"use client"

import { useState, useTransition, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { validateResetToken, resetPassword } from "./actions"

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token") ?? ""

  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!token) { setTokenValid(false); return }
    validateResetToken(token).then(result => setTokenValid(result.valid))
  }, [token])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set("token", token)

    startTransition(async () => {
      const result = await resetPassword(formData)
      if ("error" in result) {
        setError(result.error)
      } else {
        router.push("/login?passwordChanged=1")
      }
    })
  }

  if (tokenValid === null) {
    return <p className="text-xs text-muted-foreground text-center">Checking reset link…</p>
  }

  if (tokenValid === false) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-foreground">Link expired or invalid</p>
        <p className="text-xs text-muted-foreground">This reset link has expired or already been used.</p>
        <Link href="/forgot-password" className="text-xs text-accent hover:underline">
          Request a new link
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-6 text-center">
        <h1 className="text-sm font-semibold text-foreground">Set a new password</h1>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="newPassword" className="block text-xs uppercase tracking-widest text-muted-foreground">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-shadow"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="block text-xs uppercase tracking-widest text-muted-foreground">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-shadow"
        />
      </div>

      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {isPending ? "Saving…" : "Set new password"}
      </button>
    </form>
  )
}
```

- [ ] **Step 6: Run full test suite**

```bash
pnpm test:run
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add app/(auth)/reset-password/ __tests__/reset-password.test.ts
git commit -m "feat: reset-password flow — validate token, update password"
```

---

### Task 7: Admin UI — user list + promote/demote

**Files:**
- Create: `lib/require-admin.ts`
- Create: `app/(app)/admin/users/page.tsx`
- Create: `app/(app)/admin/users/actions.ts`
- Create: `__tests__/admin-users.test.ts`

- [ ] **Step 1: Write tests for the setAdmin action**

Create `__tests__/admin-users.test.ts`:

```typescript
import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    user: { update: vi.fn() },
  },
}))

vi.mock("@/lib/get-user-id", () => ({
  getIsAdmin: vi.fn(),
  getUserId: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

import { setAdmin } from "@/app/(app)/admin/users/actions"
import { db } from "@/lib/db"
import { getIsAdmin, getUserId } from "@/lib/get-user-id"

describe("setAdmin", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns Forbidden when caller is not an admin", async () => {
    vi.mocked(getIsAdmin).mockResolvedValue(false)

    const fd = new FormData()
    const result = await setAdmin("target-id", true, fd)

    expect(result).toEqual({ error: "Forbidden" })
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it("returns error when admin tries to remove their own admin status", async () => {
    vi.mocked(getIsAdmin).mockResolvedValue(true)
    vi.mocked(getUserId).mockResolvedValue("caller-id")

    const fd = new FormData()
    const result = await setAdmin("caller-id", false, fd)

    expect(result).toEqual({ error: "You cannot remove your own admin status" })
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it("promotes another user to admin", async () => {
    vi.mocked(getIsAdmin).mockResolvedValue(true)
    vi.mocked(getUserId).mockResolvedValue("caller-id")
    vi.mocked(db.user.update).mockResolvedValue({} as never)

    const fd = new FormData()
    const result = await setAdmin("target-id", true, fd)

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "target-id" },
      data: { isAdmin: true },
    })
    expect(result).toEqual({ success: true })
  })

  it("demotes another user from admin", async () => {
    vi.mocked(getIsAdmin).mockResolvedValue(true)
    vi.mocked(getUserId).mockResolvedValue("caller-id")
    vi.mocked(db.user.update).mockResolvedValue({} as never)

    const fd = new FormData()
    const result = await setAdmin("target-id", false, fd)

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "target-id" },
      data: { isAdmin: false },
    })
    expect(result).toEqual({ success: true })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test:run __tests__/admin-users.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create lib/require-admin.ts**

Create `lib/require-admin.ts`:

```typescript
import { redirect } from "next/navigation"
import { getIsAdmin } from "@/lib/get-user-id"

/**
 * Call at the top of any server component or server action that requires admin access.
 * Redirects to the home page if the current user is not an admin.
 */
export async function requireAdmin(): Promise<void> {
  const isAdmin = await getIsAdmin()
  if (!isAdmin) redirect("/")
}
```

- [ ] **Step 4: Create the setAdmin server action**

Create `app/(app)/admin/users/actions.ts`:

```typescript
"use server"

import { db } from "@/lib/db"
import { getIsAdmin, getUserId } from "@/lib/get-user-id"
import { revalidatePath } from "next/cache"

export async function setAdmin(
  userId: string,
  isAdmin: boolean,
  _formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const callerIsAdmin = await getIsAdmin()
  if (!callerIsAdmin) return { error: "Forbidden" }

  const callerId = await getUserId()
  if (callerId === userId && !isAdmin) {
    return { error: "You cannot remove your own admin status" }
  }

  await db.user.update({ where: { id: userId }, data: { isAdmin } })
  revalidatePath("/admin/users")
  return { success: true }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm test:run __tests__/admin-users.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 6: Create the admin users page**

Create `app/(app)/admin/users/page.tsx`:

```tsx
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/require-admin"
import { getUserId } from "@/lib/get-user-id"
import { setAdmin } from "./actions"

export default async function AdminUsersPage() {
  await requireAdmin()

  const [users, currentUserId] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, isAdmin: true, mustChangePassword: true, createdAt: true },
    }),
    getUserId(),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">User Management</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Name</th>
              <th className="pb-2 pr-4 font-medium">Email</th>
              <th className="pb-2 pr-4 font-medium">Role</th>
              <th className="pb-2 pr-4 font-medium">Joined</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-border/50">
                <td className="py-2 pr-4">{user.name ?? "—"}</td>
                <td className="py-2 pr-4 text-muted-foreground">{user.email}</td>
                <td className="py-2 pr-4">
                  {user.isAdmin ? "Admin" : "User"}
                  {user.mustChangePassword && (
                    <span className="ml-2 text-xs text-amber-500">(must change pw)</span>
                  )}
                </td>
                <td className="py-2 pr-4 text-muted-foreground">
                  {user.createdAt.toLocaleDateString()}
                </td>
                <td className="py-2">
                  {user.id !== currentUserId && (
                    <form action={setAdmin.bind(null, user.id, !user.isAdmin)}>
                      <button
                        type="submit"
                        className="text-xs text-accent hover:underline"
                      >
                        {user.isAdmin ? "Remove admin" : "Make admin"}
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Run full test suite**

```bash
pnpm test:run
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add lib/require-admin.ts app/(app)/admin/ __tests__/admin-users.test.ts
git commit -m "feat: admin users page with promote/demote actions"
```

---

### Task 8: Navbar admin link + login "Forgot password?" link cleanup

**Files:**
- Modify: `components/layout/navbar.tsx`
- Modify: `components/layout/navbar-client.tsx`

Note: The login page "Forgot password?" link was already added in Task 3, Step 6.

- [ ] **Step 1: Update Navbar to read isAdmin and pass it down**

Replace `components/layout/navbar.tsx` entirely:

```typescript
import { NavbarClient } from "./navbar-client"
import { getIsAdmin } from "@/lib/get-user-id"

export async function Navbar() {
  const isAdmin = await getIsAdmin()
  return <NavbarClient isAdmin={isAdmin} />
}
```

- [ ] **Step 2: Update NavbarClient to accept isAdmin and show Admin link**

In `components/layout/navbar-client.tsx`, add the `isAdmin` prop and compute nav items dynamically. Replace the entire file:

```tsx
"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
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

export function NavbarClient({ isAdmin = false }: { isAdmin?: boolean }) {
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
          <button
            onClick={handleSignOut}
            className="hidden md:block text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: Run full test suite**

```bash
pnpm test:run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/layout/navbar.tsx components/layout/navbar-client.tsx
git commit -m "feat: show Admin nav link for admin users"
```

---

### Task 9: Default admin seed + README update

**Files:**
- Modify: `prisma/seed.ts`
- Modify: `README.md`

- [ ] **Step 1: Add admin seed to prisma/seed.ts**

At the top of `prisma/seed.ts`, add the bcrypt import after the existing imports:

```typescript
import bcrypt from "bcryptjs"
```

In the `main()` function, add the following block immediately after `const prisma = new PrismaClient({ adapter })` and before the XML reading code:

```typescript
  // Idempotently create a default admin user
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com"
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(
      process.env.SEED_ADMIN_PASSWORD ?? "changeme123",
      12,
    )
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Admin",
        passwordHash,
        isAdmin: true,
        mustChangePassword: true,
      },
    })
    console.log(`Created default admin: ${adminEmail} (must change password on first login)`)
  } else {
    console.log(`Admin user already exists: ${adminEmail}`)
  }
```

- [ ] **Step 2: Verify the seed compiles**

```bash
pnpm build 2>&1 | grep -i error | head -10
```

Expected: no errors.

- [ ] **Step 3: Update README.md**

Replace the entire `README.md` with the following:

```markdown
# Guitar Practice

A personal guitar practice app. Features include:

- **Library** — curated lessons from Hub Guitar, organised by category (technique, music theory, fretboard knowledge, improvisation, sight reading, songs)
- **Reference** — interactive chord diagrams, scale/arpeggio fretboard views, triad voicings, and shell chord shapes
- **Goals & Routines** — define practice goals, build routines, and track sessions
- **Progression Analyser** — analyse chord progressions with substitutions and scale recommendations
- **Practice tracker** — track sessions and progress

Built with Next.js 16, Tailwind CSS v4, Prisma 7, and PostgreSQL.

---

## Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL database
- Mailpit (for local email): `brew install mailpit`

---

## First-time setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy the example env file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and configure:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/guitarapp` |
| `AUTH_SECRET` | Secret for NextAuth JWT signing. Generate with: `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Base URL of the app. Use `http://localhost:3000` for local dev |
| `SMTP_HOST` | SMTP host. Use `localhost` for Mailpit in dev |
| `SMTP_PORT` | SMTP port. Use `1025` for Mailpit in dev |
| `SMTP_USER` | SMTP username. Leave blank for Mailpit |
| `SMTP_PASSWORD` | SMTP password. Leave blank for Mailpit |
| `SMTP_FROM` | From address for outgoing email |
| `SEED_ADMIN_EMAIL` | Email for the default admin account (created on first `db:seed`) |
| `SEED_ADMIN_PASSWORD` | Temporary password for the default admin (must be changed on first login) |

### 3. Run database migrations

```bash
pnpm db:migrate
```

### 4. Seed the database

This imports Hub Guitar lessons **and** creates the default admin account:

```bash
pnpm db:seed
```

The default admin is created using `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from `.env.local`. The account is flagged as `mustChangePassword=true` — the admin must set a new password on their first login.

> **Note:** The seed is idempotent. If the admin account already exists, it is left unchanged. Re-running the seed only updates lesson data.

### 5. Start the dev server

```bash
pnpm dev
```

In a separate terminal, start Mailpit (for password reset emails):

```bash
mailpit
```

Open [http://localhost:3000](http://localhost:3000).  
View emails at [http://localhost:8025](http://localhost:8025).

---

## Email in production (Resend)

Sign up at [resend.com](https://resend.com) (free tier: 3,000 emails/month). Verify your sending domain, then set these Vercel environment variables:

| Variable | Value |
|----------|-------|
| `SMTP_HOST` | `smtp.resend.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `resend` |
| `SMTP_PASSWORD` | your Resend API key |
| `SMTP_FROM` | `noreply@yourdomain.com` (must be your verified domain) |

---

## User management

- Log in as admin and navigate to **Admin → Users** to promote or demote users.
- Admins cannot remove their own admin status.
- New users registered via `/register` are normal users by default.
- To create additional admins, promote them via the admin UI.

---

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm test` | Run tests in watch mode |
| `pnpm test:run` | Run tests once |
| `pnpm lint` | Run ESLint |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm db:seed` | Import lessons and create default admin |
| `pnpm db:fetch-content` | Re-download sitemap + topic order from Hub Guitar, then re-seed |

---

## Vendored data files

Static music theory datasets are committed to the repo under `data/` rather than fetched at runtime.

| File | Source | Notes |
|------|--------|-------|
| `data/chords-db.json` | [`tombatossals/chords-db`](https://github.com/tombatossals/chords-db) `lib/guitar.json` | Guitar chord voicing database. Vendored from GitHub master (Oct 2024) rather than the stale npm release (v0.5.1, Nov 2019). To update: download `https://raw.githubusercontent.com/tombatossals/chords-db/master/lib/guitar.json` and replace this file, then re-apply any local custom voicings. |
| `data/triads.json` | Custom | Triad voicings across all string sets and inversions, generated for this project. |

---

## Refreshing lesson content

Hub Guitar lessons are seeded from a local snapshot of their sitemap. To pull in new or reordered lessons:

```bash
pnpm db:fetch-content
pnpm db:seed
```

`db:fetch-content` re-downloads the sitemap from `https://hubguitar.com/sitemap.xml` and regenerates `prisma/tmp/topic-order.json` by scraping Hub Guitar's category pages for their curated lesson order.
```

- [ ] **Step 4: Run full test suite one final time**

```bash
pnpm test:run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts README.md .env.example
git commit -m "feat: seed default admin on db:seed; document full setup in README"
```

---

## Verification

1. **First-time setup:** run `pnpm db:seed` — confirm console shows "Created default admin: admin@example.com"
2. **Force-change-password:** sign in as the admin with the seed password — you should be redirected to `/change-password` immediately. After changing it, you're sent to login with a green success message.
3. **Forgot password:** visit `/forgot-password`, enter admin email, check Mailpit at `http://localhost:8025` — confirm email arrives with a reset link. Open the link, set a new password, confirm redirect to login.
4. **Admin nav:** sign in as admin — confirm "Admin" appears in the navbar. Sign in as a normal user — confirm it does not appear.
5. **Admin UI:** visit `/admin/users` as admin — confirm user list renders. Click "Make admin" on another user. Confirm the role changes. Confirm you cannot remove your own admin status.
6. **Access control:** visit `/admin/users` as a normal user — confirm redirect to home page.
7. **Full test suite:** `pnpm test:run` — all tests pass.
