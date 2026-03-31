# Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a working Next.js 15 PWA with email/password auth, a warm-amber design system, responsive nav (top bar on ≥768px, hamburger on mobile), dark/light mode, protected routes, and Docker deployment.

**Architecture:** Single Next.js 15 App Router app with API Route Handlers. Auth.js v5 with Credentials provider and JWT sessions (no database session tables). Prisma + PostgreSQL for the User table. Tailwind CSS with shadcn/ui Sheet component for mobile nav.

**Tech Stack:** Next.js 15, TypeScript (strict), Tailwind CSS, shadcn/ui, Prisma, PostgreSQL, Auth.js v5 (`next-auth@beta`), `bcryptjs`, `next-themes`, Vitest, `@testing-library/react`

---

## File Map

Files created in this plan, grouped by task:

**Scaffold (Task 1)**
- `package.json`, `tsconfig.json`, `next.config.ts`, `.gitignore`, `.env.example`

**Test infrastructure (Task 2)**
- `vitest.config.ts`, `vitest.setup.ts`

**Design system (Task 3)**
- `tailwind.config.ts`, `app/globals.css`

**Database (Task 4)**
- `prisma/schema.prisma`, `lib/db.ts`

**Auth logic (Task 5)**
- `lib/auth.ts` — exports `authorizeUser` (testable) + NextAuth config
- `app/api/auth/[...nextauth]/route.ts`

**Auth tests (Task 6)**
- `__tests__/auth.test.ts`

**Register action (Task 7)**
- `app/(auth)/register/actions.ts`

**Register action tests (Task 8)**
- `__tests__/register.test.ts`

**Root layout (Task 9)**
- `app/layout.tsx`

**Auth pages (Task 10)**
- `app/(auth)/layout.tsx`
- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`

**Middleware (Task 11)**
- `middleware.ts`

**Navigation (Task 12)**
- `components/layout/theme-toggle.tsx`
- `components/layout/mobile-menu.tsx`
- `components/layout/navbar.tsx`

**Fullscreen context (Task 13)**
- `lib/fullscreen-context.tsx`

**Protected layout + pages (Task 14)**
- `app/(app)/layout.tsx`
- `app/(app)/page.tsx`
- `app/(app)/goals/page.tsx`
- `app/(app)/library/page.tsx`
- `app/(app)/history/page.tsx`

**PWA manifest (Task 15)**
- `app/manifest.ts`
- `public/icons/` (placeholder PNGs)

**Docker (Task 16)**
- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `scripts/docker-entrypoint.sh`

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `.gitignore`, `.env.example`

- [ ] **Step 1: Bootstrap the Next.js app**

Run in `/Users/maraspeli/Build/Claude/GuitarPractice`:

```bash
pnpm dlx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --use-pnpm
```

When prompted for Turbopack, select **Yes**.

Expected output: `Success! Created guitar-practice at .`

- [ ] **Step 2: Install runtime dependencies**

```bash
pnpm add next-auth@beta bcryptjs next-themes @prisma/client prisma lucide-react
pnpm add -D @types/bcryptjs
```

- [ ] **Step 3: Install shadcn/ui**

```bash
pnpm dlx shadcn@latest init
```

When prompted:
- Style: **Default**
- Base colour: choose any — we override all tokens in globals.css
- CSS variables: **Yes**

Then add the components needed in Phase 1:

```bash
pnpm dlx shadcn@latest add sheet button
```

- [ ] **Step 4: Set `output: 'standalone'` in next.config.ts**

Replace the generated `next.config.ts` with:

```typescript
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
}

export default nextConfig
```

- [ ] **Step 5: Update tsconfig.json for strict mode**

Replace `tsconfig.json` with:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 6: Write .env.example**

Create `.env.example`:

```bash
# Database
# Local dev: postgresql://localhost/guitarpractice
# Docker: set via docker-compose.yml
DATABASE_URL="postgresql://localhost/guitarpractice"

# Auth.js v5 uses AUTH_SECRET and AUTH_URL (not NEXTAUTH_* — that was v4)
# Generate AUTH_SECRET with: openssl rand -base64 32
AUTH_SECRET="replace-with-random-string"

# Public URL of the app (no trailing slash)
AUTH_URL="http://localhost:3000"

# Docker deployment only
# DB_PASSWORD="change-me-in-production"
# AUTH_SECRET="generate-separately-for-production"
# AUTH_URL="https://your-domain.com"
```

- [ ] **Step 7: Update .gitignore**

Append to the generated `.gitignore`:

```
.env.local
.env.production
.env.*.local
.superpowers/
```

- [ ] **Step 8: Copy env file and set up local database**

```bash
cp .env.example .env.local
# Edit .env.local — set AUTH_SECRET to any random string for dev
# DATABASE_URL can stay as-is: postgresql://localhost/guitarpractice
```

Ensure Homebrew Postgres is running:

```bash
brew services list | grep postgresql
# Should show: postgresql@16  started
```

If not:
```bash
brew services start postgresql@16
createdb guitarpractice
```

- [ ] **Step 9: Commit scaffold**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 project with pnpm, shadcn/ui, Auth.js, Prisma"
```

---

## Task 2: Test Infrastructure

**Files:**
- Create: `vitest.config.ts`, `vitest.setup.ts`
- Modify: `package.json` (add test script)

- [ ] **Step 1: Install test dependencies**

```bash
pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
```

- [ ] **Step 3: Create vitest.setup.ts**

```typescript
import "@testing-library/jest-dom"
```

- [ ] **Step 4: Add test script to package.json**

In `package.json`, add to the `"scripts"` block:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 5: Write a smoke test to verify the setup works**

Create `__tests__/smoke.test.ts`:

```typescript
import { describe, it, expect } from "vitest"

describe("test infrastructure", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 6: Run the smoke test**

```bash
pnpm test:run
```

Expected output:
```
✓ __tests__/smoke.test.ts > test infrastructure > runs
Test Files  1 passed (1)
```

- [ ] **Step 7: Delete smoke test and commit**

```bash
rm __tests__/smoke.test.ts
git add -A
git commit -m "chore: add Vitest test infrastructure"
```

---

## Task 3: Design System

**Files:**
- Modify: `tailwind.config.ts`, `app/globals.css`

The design system uses CSS custom properties for all theme tokens. Tailwind consumes them via `hsl(var(--token))` references. shadcn/ui follows this same convention so its components automatically pick up our tokens.

- [ ] **Step 1: Replace tailwind.config.ts**

```typescript
import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
```

- [ ] **Step 2: Install tailwindcss-animate (shadcn/ui uses it)**

```bash
pnpm add -D tailwindcss-animate
```

- [ ] **Step 3: Replace app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Light mode — warm off-white base, amber-700 accent */
    --background: 40 33% 97%;        /* #faf8f4 */
    --foreground: 0 0% 10%;          /* #1a1a1a */
    --card: 0 0% 100%;               /* #ffffff */
    --card-foreground: 0 0% 10%;
    --muted: 35 20% 92%;
    --muted-foreground: 0 0% 73%;    /* #bbb */
    --border: 35 25% 88%;            /* #ede8df */
    --input: 35 25% 88%;
    --ring: 32 95% 44%;
    --accent: 32 95% 44%;            /* #b45309 amber-700 */
    --accent-foreground: 0 0% 100%;
    --radius: 0.375rem;
  }

  .dark {
    /* Dark mode — near-black base, amber-600 accent */
    --background: 0 0% 7%;           /* #0c0c0c */
    --foreground: 0 0% 90%;          /* #e5e5e5 */
    --card: 0 0% 7%;
    --card-foreground: 0 0% 90%;
    --muted: 0 0% 10%;
    --muted-foreground: 0 0% 33%;    /* #555 */
    --border: 0 0% 11%;              /* #1c1c1c */
    --input: 0 0% 11%;
    --ring: 38 92% 50%;
    --accent: 38 92% 50%;            /* #d97706 amber-600 */
    --accent-foreground: 0 0% 7%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 4: Verify Tailwind builds**

```bash
pnpm build 2>&1 | tail -5
```

Expected: build succeeds (will fail on missing pages — that's fine at this stage; just ensure no Tailwind config errors).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add amber design system tokens to Tailwind and globals.css"
```

---

## Task 4: Database

**Files:**
- Create: `prisma/schema.prisma`, `lib/db.ts`

- [ ] **Step 1: Initialise Prisma**

```bash
pnpm prisma init --datasource-provider postgresql
```

This creates `prisma/schema.prisma` and adds `DATABASE_URL` to `.env` (which we don't use — our env is in `.env.local`).

Delete the generated `.env` file Prisma created (we use `.env.local`):

```bash
rm .env
```

- [ ] **Step 2: Write prisma/schema.prisma**

Replace the generated content:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  name         String?
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

- [ ] **Step 3: Create lib/db.ts**

```typescript
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
```

The singleton pattern prevents Prisma from opening hundreds of connections during Next.js hot-reload in development.

- [ ] **Step 4: Generate Prisma client and run migration**

```bash
pnpm prisma migrate dev --name init
```

Expected output:
```
Your database is now in sync with your schema.
✔ Generated Prisma Client
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Prisma schema (User model) and db client singleton"
```

---

## Task 5: Auth Configuration

**Files:**
- Create: `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`

The `authorizeUser` function is extracted and exported separately from the NextAuth config so it can be unit tested in Task 6 without needing to invoke the full Auth.js internals.

Auth.js v5 uses `AUTH_SECRET` and `AUTH_URL` (not `NEXTAUTH_SECRET`/`NEXTAUTH_URL`). Update `.env.example` already reflects this.

- [ ] **Step 1: Create lib/auth.ts**

```typescript
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

/**
 * Verify email + password against the database.
 * Extracted so it can be unit-tested independently of NextAuth.
 * Returns the user payload for the session, or null if invalid.
 */
export async function authorizeUser(
  email: string,
  password: string
): Promise<{ id: string; email: string; name: string | null } | null> {
  const user = await db.user.findUnique({ where: { email } })
  if (!user) return null

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return null

  return { id: user.id, email: user.email, name: user.name }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined
        if (!email || !password) return null
        return authorizeUser(email, password)
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
})
```

- [ ] **Step 2: Create app/api/auth/[...nextauth]/route.ts**

```typescript
import { handlers } from "@/lib/auth"

export const { GET, POST } = handlers
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit 2>&1 | head -20
```

Expected: no errors (or only errors about missing pages — those come in later tasks).

- [ ] **Step 4: Commit**

```bash
git add lib/auth.ts app/api/auth/[...nextauth]/route.ts
git commit -m "feat: add Auth.js v5 config with Credentials provider and extracted authorizeUser"
```

---

## Task 6: Auth Tests

**Files:**
- Create: `__tests__/auth.test.ts`

- [ ] **Step 1: Write failing tests for authorizeUser**

Create `__tests__/auth.test.ts`:

```typescript
import { vi, describe, it, expect, beforeEach } from "vitest"

// Mock the db module before importing auth
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}))

import { authorizeUser } from "@/lib/auth"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

const mockUser = {
  id: "cuid_123",
  email: "test@example.com",
  name: "Test User",
  passwordHash: "$2b$12$hashedpassword",
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe("authorizeUser", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns null when user does not exist", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null)

    const result = await authorizeUser("nobody@example.com", "password")

    expect(result).toBeNull()
    expect(db.user.findUnique).toHaveBeenCalledWith({
      where: { email: "nobody@example.com" },
    })
  })

  it("returns null when password is incorrect", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

    const result = await authorizeUser("test@example.com", "wrong-password")

    expect(result).toBeNull()
  })

  it("returns user payload when credentials are valid", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const result = await authorizeUser("test@example.com", "correct-password")

    expect(result).toEqual({
      id: "cuid_123",
      email: "test@example.com",
      name: "Test User",
    })
  })

  it("does not include passwordHash in the returned payload", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const result = await authorizeUser("test@example.com", "correct-password")

    expect(result).not.toHaveProperty("passwordHash")
  })
})
```

- [ ] **Step 2: Run tests — expect them to pass**

```bash
pnpm test:run __tests__/auth.test.ts
```

Expected:
```
✓ __tests__/auth.test.ts > authorizeUser > returns null when user does not exist
✓ __tests__/auth.test.ts > authorizeUser > returns null when password is incorrect
✓ __tests__/auth.test.ts > authorizeUser > returns user payload when credentials are valid
✓ __tests__/auth.test.ts > authorizeUser > does not include passwordHash in the returned payload
Test Files  1 passed (1)
```

If any test fails, read the error message carefully — it will be a mock setup issue, not an implementation issue.

- [ ] **Step 3: Commit**

```bash
git add __tests__/auth.test.ts
git commit -m "test: add unit tests for authorizeUser"
```

---

## Task 7: Register Server Action

**Files:**
- Create: `app/(auth)/register/actions.ts`

The register flow is split: a server action creates the user and returns `{ success: true }` or `{ error: string }`. The page (Task 10) then calls `signIn` from `next-auth/react` client-side. This avoids the complexity of Next.js redirect errors thrown by Auth.js's server-side `signIn`.

- [ ] **Step 1: Write the failing test first**

Create `__tests__/register.test.ts`:

```typescript
import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(),
  },
}))

import { createUser } from "@/app/(auth)/register/actions"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

const makeFormData = (fields: Record<string, string>) => {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.set(k, v))
  return fd
}

describe("createUser", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns error when email is already registered", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "existing",
      email: "taken@example.com",
      name: "Existing",
      passwordHash: "hash",
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await createUser(
      makeFormData({ name: "New", email: "taken@example.com", password: "pass" })
    )

    expect(result).toEqual({ error: "An account with this email already exists" })
    expect(db.user.create).not.toHaveBeenCalled()
  })

  it("hashes password with bcrypt cost 12 and creates user", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null)
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed_pw" as never)
    vi.mocked(db.user.create).mockResolvedValue({
      id: "new-cuid",
      email: "new@example.com",
      name: "New User",
      passwordHash: "hashed_pw",
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await createUser(
      makeFormData({ name: "New User", email: "new@example.com", password: "my-password" })
    )

    expect(bcrypt.hash).toHaveBeenCalledWith("my-password", 12)
    expect(db.user.create).toHaveBeenCalledWith({
      data: {
        name: "New User",
        email: "new@example.com",
        passwordHash: "hashed_pw",
      },
    })
    expect(result).toEqual({ success: true })
  })
})
```

- [ ] **Step 2: Run — expect FAIL (module not found)**

```bash
pnpm test:run __tests__/register.test.ts
```

Expected: `Error: Cannot find module '@/app/(auth)/register/actions'`

- [ ] **Step 3: Create the server action**

Create `app/(auth)/register/actions.ts`:

```typescript
"use server"

import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

export async function createUser(formData: FormData): Promise<
  { success: true } | { error: string }
> {
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return { error: "An account with this email already exists" }
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await db.user.create({
    data: { name, email, passwordHash },
  })

  return { success: true }
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
pnpm test:run __tests__/register.test.ts
```

Expected:
```
✓ __tests__/register.test.ts > createUser > returns error when email is already registered
✓ __tests__/register.test.ts > createUser > hashes password with bcrypt cost 12 and creates user
Test Files  1 passed (1)
```

- [ ] **Step 5: Commit**

```bash
git add app/\(auth\)/register/actions.ts __tests__/register.test.ts
git commit -m "feat: add createUser server action with tests"
```

---

## Task 8: Run All Tests

- [ ] **Step 1: Run the full test suite**

```bash
pnpm test:run
```

Expected:
```
✓ __tests__/auth.test.ts (4 tests)
✓ __tests__/register.test.ts (2 tests)
Test Files  2 passed (2)
Tests       6 passed (6)
```

If anything fails, fix before proceeding.

---

## Task 9: Root Layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace app/layout.tsx**

```tsx
import type { Metadata, Viewport } from "next"
import { ThemeProvider } from "next-themes"
import "./globals.css"

export const metadata: Metadata = {
  title: "Guitar Practice",
  description: "Organised guitar practice routines",
  manifest: "/manifest.webmanifest",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#d97706" },
    { media: "(prefers-color-scheme: light)", color: "#b45309" },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

The `suppressHydrationWarning` on `<html>` is required — `next-themes` adds the `class` attribute server-side vs client-side, which would otherwise trigger a React hydration warning.

- [ ] **Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: add root layout with ThemeProvider (next-themes, system default)"
```

---

## Task 10: Auth Pages

**Files:**
- Create: `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`

- [ ] **Step 1: Create app/(auth)/layout.tsx**

```tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-sm font-medium text-foreground/80">
            Guitar Practice
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create app/(auth)/login/page.tsx**

```tsx
"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
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
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-[10px] uppercase tracking-widest text-muted-foreground"
        >
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
        <label
          htmlFor="password"
          className="block text-[10px] uppercase tracking-widest text-muted-foreground"
        >
          Password
        </label>
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

      <p className="text-center text-[11px] text-muted-foreground">
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

- [ ] **Step 3: Create app/(auth)/register/page.tsx**

```tsx
"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createUser } from "@/app/(auth)/register/actions"

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    // Client-side validation: passwords match
    if (formData.get("password") !== formData.get("confirmPassword")) {
      setError("Passwords do not match")
      setPending(false)
      return
    }

    const result = await createUser(formData)

    if ("error" in result) {
      setError(result.error)
      setPending(false)
      return
    }

    // User created — sign in automatically
    const signInResult = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    })

    if (signInResult?.error) {
      setError("Account created but sign-in failed. Please log in.")
      router.push("/login")
    } else {
      router.push("/")
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="name"
          className="block text-[10px] uppercase tracking-widest text-muted-foreground"
        >
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="name"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-shadow"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-[10px] uppercase tracking-widest text-muted-foreground"
        >
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

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-[10px] uppercase tracking-widest text-muted-foreground"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-shadow"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="confirmPassword"
          className="block text-[10px] uppercase tracking-widest text-muted-foreground"
        >
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
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
        {pending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-[11px] text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-foreground underline underline-offset-2 decoration-border hover:decoration-foreground transition-colors"
        >
          Sign in
        </Link>
      </p>
    </form>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(auth\)/
git commit -m "feat: add auth layout, login page, and register page"
```

---

## Task 11: Middleware

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Create middleware.ts**

```typescript
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // Always allow these paths
  const isPublicPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/api/auth")

  if (!isLoggedIn && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }

  if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/", req.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  // Run on all paths except static files, images, and favicon
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/).*)"],
}
```

- [ ] **Step 2: Verify the dev server starts without errors**

```bash
pnpm dev &
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
# Expected: 307 (redirect to /login) or 200 (if somehow authed)
kill %1
```

Expected: `307` — the middleware redirected to `/login`.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: add route protection middleware (redirects unauthenticated users to /login)"
```

---

## Task 12: Navigation Components

**Files:**
- Create: `components/layout/theme-toggle.tsx`, `components/layout/mobile-menu.tsx`, `components/layout/navbar.tsx`

- [ ] **Step 1: Create components/layout/theme-toggle.tsx**

```tsx
"use client"

import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Toggle theme"
    >
      <Sun size={14} className="hidden dark:block" />
      <Moon size={14} className="block dark:hidden" />
    </button>
  )
}
```

- [ ] **Step 2: Create components/layout/mobile-menu.tsx**

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  label: string
}

interface MobileMenuProps {
  items: NavItem[]
}

export function MobileMenu({ items }: MobileMenuProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    setOpen(false)
    await signOut({ redirect: false })
    router.push("/login")
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-60 bg-background border-border">
        <div className="mt-8 flex flex-col gap-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors",
                pathname === item.href
                  ? "text-accent font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-4 border-t border-border pt-4">
            <button
              onClick={handleSignOut}
              className="w-full text-left rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 3: Create components/layout/navbar.tsx**

```tsx
"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { MobileMenu } from "@/components/layout/mobile-menu"

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/goals", label: "Goals" },
  { href: "/library", label: "Library" },
  { href: "/history", label: "History" },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await signOut({ redirect: false })
    router.push("/login")
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-50 h-11 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="flex h-full items-center gap-5 px-5">
        {/* Mobile: hamburger (hidden on md+) */}
        <div className="md:hidden">
          <MobileMenu items={NAV_ITEMS} />
        </div>

        {/* App name */}
        <span className="text-[12px] font-medium text-foreground/85 md:mr-3">
          Guitar Practice
        </span>

        {/* Desktop nav links (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-[11px] transition-colors pb-px",
                pathname === item.href
                  ? "text-accent border-b-[1.5px] border-accent"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />

          {/* Desktop: sign out link (hidden on mobile — accessible via drawer) */}
          <button
            onClick={handleSignOut}
            className="hidden md:block text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>

          {/* Start Practice CTA — links to / until Phase 4 wires it up */}
          <Link
            href="/"
            className="bg-accent text-accent-foreground text-[10px] font-semibold px-3 py-[5px] rounded-md hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            <span className="hidden md:inline">Start Practice</span>
            <span className="md:hidden">▶</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/layout/
git commit -m "feat: add ThemeToggle, MobileMenu (Sheet drawer), and Navbar components"
```

---

## Task 13: Fullscreen Context

**Files:**
- Create: `lib/fullscreen-context.tsx`

This React context is infrastructure for Phase 4's distraction-free mode. The nav bar reads it to hide itself.

- [ ] **Step 1: Create lib/fullscreen-context.tsx**

```tsx
"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface FullscreenContextValue {
  isFullscreen: boolean
  enter: () => void
  exit: () => void
}

const FullscreenContext = createContext<FullscreenContextValue>({
  isFullscreen: false,
  enter: () => {},
  exit: () => {},
})

export function FullscreenProvider({ children }: { children: ReactNode }) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Escape key exits fullscreen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isFullscreen])

  return (
    <FullscreenContext.Provider
      value={{
        isFullscreen,
        enter: () => setIsFullscreen(true),
        exit: () => setIsFullscreen(false),
      }}
    >
      {children}
    </FullscreenContext.Provider>
  )
}

export const useFullscreen = () => useContext(FullscreenContext)
```

- [ ] **Step 2: Commit**

```bash
git add lib/fullscreen-context.tsx
git commit -m "feat: add FullscreenContext (infrastructure for Phase 4 distraction-free mode)"
```

---

## Task 14: Protected Layout and App Pages

**Files:**
- Create: `app/(app)/layout.tsx`, `app/(app)/page.tsx`, `app/(app)/goals/page.tsx`, `app/(app)/library/page.tsx`, `app/(app)/history/page.tsx`

- [ ] **Step 1: Create app/(app)/layout.tsx**

```tsx
import { Navbar } from "@/components/layout/navbar"
import { FullscreenProvider } from "@/lib/fullscreen-context"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FullscreenProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 px-5 py-8 max-w-2xl mx-auto w-full">
          {children}
        </main>
      </div>
    </FullscreenProvider>
  )
}
```

- [ ] **Step 2: Create app/(app)/page.tsx**

```tsx
import Link from "next/link"

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export default function HomePage() {
  return (
    <div className="pt-6">
      {/* Header row: greeting + placeholder streak area */}
      <div className="flex justify-between items-baseline mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            {greeting()}
          </p>
          <h1 className="text-xl font-normal text-foreground">Get started</h1>
        </div>
        {/* Streak display — wired up in Phase 5 */}
        <div className="text-right opacity-0 select-none" aria-hidden>
          <div className="text-[13px] font-medium text-accent">— day streak</div>
          <div className="text-[10px] text-muted-foreground">— days on this goal</div>
        </div>
      </div>

      {/* Goal section */}
      <div className="mb-1">
        <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground mb-2">
          Goal
        </p>
        <p className="text-sm text-muted-foreground">
          <Link
            href="/goals"
            className="text-foreground underline underline-offset-2 decoration-border hover:decoration-foreground transition-colors"
          >
            Set your first goal to get started →
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create placeholder pages**

Create `app/(app)/goals/page.tsx`:

```tsx
export default function GoalsPage() {
  return (
    <div className="pt-6">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
        Coming soon
      </p>
      <h1 className="text-xl font-normal text-foreground mb-4">Goals</h1>
      <p className="text-sm text-muted-foreground">
        Goal management is built in Phase 4.
      </p>
    </div>
  )
}
```

Create `app/(app)/library/page.tsx`:

```tsx
export default function LibraryPage() {
  return (
    <div className="pt-6">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
        Coming soon
      </p>
      <h1 className="text-xl font-normal text-foreground mb-4">Library</h1>
      <p className="text-sm text-muted-foreground">
        The topic library is built in Phase 2.
      </p>
    </div>
  )
}
```

Create `app/(app)/history/page.tsx`:

```tsx
export default function HistoryPage() {
  return (
    <div className="pt-6">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
        Coming soon
      </p>
      <h1 className="text-xl font-normal text-foreground mb-4">History</h1>
      <p className="text-sm text-muted-foreground">
        Session history is built in Phase 5.
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/
git commit -m "feat: add protected app layout (Navbar, FullscreenProvider) and placeholder pages"
```

---

## Task 15: PWA Manifest

**Files:**
- Create: `app/manifest.ts`, placeholder PNGs in `public/icons/`

- [ ] **Step 1: Create app/manifest.ts**

```typescript
import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Guitar Practice",
    short_name: "Practice",
    description: "Organised guitar practice routines",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0c0c",
    theme_color: "#d97706",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
```

- [ ] **Step 2: Create placeholder icons**

For now, generate simple placeholder PNGs using ImageMagick (if available) or create a `public/icons/README.md` noting that real icons are needed before production:

```bash
mkdir -p public/icons
# If ImageMagick is installed:
if command -v convert &> /dev/null; then
  convert -size 192x192 xc:"#d97706" public/icons/icon-192.png
  convert -size 512x512 xc:"#d97706" public/icons/icon-512.png
  convert -size 512x512 xc:"#d97706" public/icons/icon-512-maskable.png
else
  echo "Replace these with real icons before production deployment." > public/icons/README.md
  # Also create empty placeholder files so Next.js doesn't 404
  touch public/icons/icon-192.png public/icons/icon-512.png public/icons/icon-512-maskable.png
fi
```

- [ ] **Step 3: Verify manifest is served**

```bash
pnpm dev &
sleep 5
curl -s http://localhost:3000/manifest.webmanifest | python3 -m json.tool | head -20
kill %1
```

Expected output shows the manifest JSON with name, icons, etc.

- [ ] **Step 4: Commit**

```bash
git add app/manifest.ts public/icons/
git commit -m "feat: add PWA web manifest via native Next.js 15 app/manifest.ts"
```

---

## Task 16: Docker

**Files:**
- Create: `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `scripts/docker-entrypoint.sh`

- [ ] **Step 1: Create .dockerignore**

```
node_modules
.next
.git
.env.local
.env.*.local
*.md
.superpowers
__tests__
```

- [ ] **Step 2: Create scripts/docker-entrypoint.sh**

```bash
#!/bin/sh
set -e

echo "Running database migrations..."
node node_modules/prisma/build/index.js migrate deploy

echo "Starting application..."
exec node server.js
```

```bash
mkdir -p scripts
chmod +x scripts/docker-entrypoint.sh
```

- [ ] **Step 3: Create Dockerfile**

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable pnpm

# ---- deps: install all dependencies ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- builder: generate Prisma client and build Next.js ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ---- runner: minimal production image ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Standalone Next.js output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma: schema for migrations + generated client + CLI
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Entrypoint script
COPY --from=builder /app/scripts/docker-entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./entrypoint.sh"]
```

- [ ] **Step 4: Create docker-compose.yml**

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: guitarpractice
      POSTGRES_USER: guitarpractice
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U guitarpractice"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build: .
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://guitarpractice:${DB_PASSWORD}@db:5432/guitarpractice
      AUTH_SECRET: ${AUTH_SECRET}
      AUTH_URL: ${AUTH_URL}
      NODE_ENV: production
    ports:
      - "3000:3000"
    depends_on:
      db:
        condition: service_healthy

volumes:
  postgres_data:
```

Note: Auth.js v5 uses `AUTH_SECRET` and `AUTH_URL` (not `NEXTAUTH_*`). Update `.env.example` to reflect this if not already done.

- [ ] **Step 5: Verify the Docker build (if Docker is available)**

If Docker is available in the environment:

```bash
docker compose build 2>&1 | tail -10
```

Expected: `✓ Built`

If Docker is not available (corporate environment), skip this step — the Dockerfile can be validated on a deployment machine.

- [ ] **Step 6: Commit**

```bash
git add Dockerfile docker-compose.yml .dockerignore scripts/
git commit -m "feat: add multi-stage Dockerfile and docker-compose with postgres healthcheck"
```

---

## Task 17: Final Verification

Run all success criteria from the spec.

- [ ] **Step 1: Run the full test suite one final time**

```bash
pnpm test:run
```

Expected: all 6 tests pass.

- [ ] **Step 2: Start the dev server and manually verify auth flow**

```bash
pnpm dev
```

Open `http://localhost:3000` in a browser.

Verify:
1. Redirects to `/login` ✓
2. Register a new account at `/register` — should sign in and redirect to `/` ✓
3. The home page shows: nav bar, "Get started" heading, empty-state link ✓
4. Nav shows Home/Goals/Library/History links; active page (Home) is underlined in amber ✓
5. Theme toggle works — switches dark/light; reload preserves preference ✓

- [ ] **Step 3: Check PWA manifest in Chrome**

Open Chrome DevTools → Application tab → Manifest.

Verify: name, icons, display: standalone are all present. No "Installable" errors.

- [ ] **Step 4: Verify mobile breakpoint**

Open Chrome DevTools → Device toolbar → Set width to 767px.

Verify: hamburger menu appears; "Start Practice" collapses to ▶ icon; drawer slides open with nav links.

Set width to 768px.

Verify: full desktop nav appears.

- [ ] **Step 5: Check TypeScript has no errors**

```bash
pnpm tsc --noEmit
```

Expected: no output (no errors).

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: Phase 1 complete — foundation, auth, nav, design system, PWA, Docker"
```

---

## Spec Coverage Check

| Spec requirement | Covered by |
|---|---|
| Next.js 15 App Router, TypeScript strict | Task 1 |
| Tailwind + shadcn/ui | Tasks 1, 3 |
| Prisma + PostgreSQL | Task 4 |
| Auth.js v5 Credentials provider | Task 5 |
| `authorizeUser` unit-tested | Task 6 |
| `createUser` server action unit-tested | Tasks 7–8 |
| Root layout + ThemeProvider | Task 9 |
| Login page with inline error | Task 10 |
| Register page with auto sign-in | Task 10 |
| Route protection middleware | Task 11 |
| Navbar: top bar ≥768px, hamburger <768px | Task 12 |
| Dark/light mode with system default, no flash | Tasks 3, 9 |
| Theme toggle in navbar | Task 12 |
| FullscreenContext (Phase 4 infrastructure) | Task 13 |
| Protected layout wrapping app pages | Task 14 |
| Home page with empty state | Task 14 |
| Goals/Library/History placeholder pages | Task 14 |
| PWA manifest via `app/manifest.ts` | Task 15 |
| `output: 'standalone'` for Docker | Task 1 |
| Multi-stage Dockerfile | Task 16 |
| docker-compose with postgres healthcheck | Task 16 |
| Local dev via Homebrew Postgres (no Docker) | Task 1 |
