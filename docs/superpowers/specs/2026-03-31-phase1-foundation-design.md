# Guitar Practice App — Phase 1: Foundation

**Date:** 2026-03-31  
**Scope:** Tech stack, authentication, UI shell, navigation, visual design system, PWA, Docker deployment  
**Status:** Approved

---

## Overview

A PWA (Progressive Web App) for organising and tracking guitar practice routines. Phase 1 establishes the full-stack foundation that all subsequent phases build on: project scaffolding, authentication, the core UI shell, and deployment infrastructure. No practice-specific features are built in this phase — the output is a working, deployable app skeleton with login, protected routes, and the correct visual design system in place.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) | Full-stack React, API Route Handlers, SSR |
| Language | TypeScript | Strict mode |
| Styling | Tailwind CSS + shadcn/ui | Component library for accessible primitives |
| ORM | Prisma | Type-safe schema, migrations |
| Database | PostgreSQL | Homebrew locally; containerised in production |
| Auth | Auth.js v5 (NextAuth) | Credentials provider (email + password) |
| Theming | next-themes | System dark/light preference, no flash |
| PWA | @ducanh2912/next-pwa | Manifest + service worker (maintained Next.js 15 fork) |
| Package manager | pnpm | Faster installs, good monorepo support if needed later |

---

## Project Structure

```
/app
  /(auth)
    /login/page.tsx          — Login form
    /register/page.tsx       — Registration form
  /(app)
    layout.tsx               — Protected shell: nav bar + content area
    /page.tsx                — Home/dashboard (placeholder in Phase 1)
    /goals/page.tsx          — Goals list (placeholder)
    /library/page.tsx        — Topic library (placeholder)
    /history/page.tsx        — Session history (placeholder)
  /api
    /auth/[...nextauth]/route.ts  — Auth.js handler
  layout.tsx                 — Root layout: ThemeProvider, fonts
  globals.css                — Tailwind base + CSS variables for theme

/components
  /ui/                       — shadcn/ui primitives (button, dialog, etc.)
  /layout
    navbar.tsx               — Top nav bar (desktop + mobile hamburger)
    mobile-menu.tsx          — Slide-out drawer for mobile nav

/lib
  auth.ts                    — Auth.js config (providers, callbacks)
  db.ts                      — Prisma client singleton
  utils.ts                   — shadcn/ui cn() helper + misc utilities

/prisma
  schema.prisma              — Data model
  /migrations/               — Migration history

/public
  manifest.json              — PWA manifest
  /icons/                    — App icons (192px, 512px, maskable)

middleware.ts                — Route protection (redirect unauthenticated users)
.env.example                 — All required env vars documented
docker-compose.yml           — app + postgres containers
Dockerfile
next.config.ts               — PWA config, output: 'standalone', image domains
tailwind.config.ts           — Amber colour tokens, dark mode class strategy
```

---

## Visual Design System

### Colour palette

The app uses a warm amber accent on neutral dark/light bases. All tokens are defined as CSS custom properties in `globals.css` and consumed via Tailwind config.

**Dark mode (default when system prefers dark):**
- Background: `#0c0c0c` (page), `#111` (cards/surface)
- Border: `#1c1c1c`
- Text primary: `#e5e5e5`
- Text secondary: `#555`
- Accent: `#d97706` (amber-600)

**Light mode:**
- Background: `#faf8f4` (page), `#fff` (cards/surface)
- Border: `#ede8df`
- Text primary: `#1a1a1a`
- Text secondary: `#bbb`
- Accent: `#b45309` (amber-700, slightly darker for contrast on white)

### Typography

- Font: system font stack (`-apple-system, BlinkMacSystemFont, 'Inter', sans-serif`)
- Weights: 400 (body), 500 (headings, labels), 600 (buttons)
- No decorative fonts — clean and readable at all sizes

### Design principles

- Amber accent used sparingly: active nav indicator, primary CTA button, streak count, active routine bar
- No emoji in data display — streaks and counts shown as clean text/numbers
- Uppercase labels (`font-size: 9px`, `letter-spacing: 0.1em`) for section headers like "Goal" and "Routine"
- Subtle dividers (1px border) instead of cards with backgrounds where possible
- "Change" links styled as plain underlined text, not buttons, to reduce visual noise

### Dark/light mode

- Controlled by `next-themes` with `attribute="class"` strategy on `<html>`
- Defaults to system preference (`defaultTheme="system"`)
- Toggle available in the nav bar (moon/sun icon)
- No flash of unstyled content — next-themes handles this via a blocking script

---

## Navigation

### Desktop (≥768px)

Horizontal top nav bar, full width, sticky:

```
[Guitar Practice]   [Home]  [Goals]  [Library]  [History]   [◑]  [Start Practice ▶]
```

- App name: left, medium weight, no icon/logo in Phase 1
- Nav links: centre-left, current page underlined in amber
- Right side: theme toggle, then "Start Practice" CTA button (amber filled)
- Height: 44px, subtle bottom border

### Mobile (<768px)

```
[☰]   [Guitar Practice]   [▶]
```

- Hamburger (left): opens a slide-out drawer with full nav links
- App name: centred
- Condensed "Start Practice" button (right): icon only or short label at narrow widths
- Drawer closes on navigation or outside tap

### Route protection

`middleware.ts` checks the Auth.js session on every request. It protects all routes except `/login`, `/register`, and `/api/auth/*`. Unauthenticated requests to any other path are redirected to `/login`. Auth pages (`/login`, `/register`) redirect to `/` if a session already exists.

---

## Authentication

### Screens

**Login (`/login`):**
- Email + password fields
- Submit → Auth.js Credentials provider → session cookie
- Link to register
- Error shown inline (invalid credentials)

**Register (`/register`):**
- Name, email, password, confirm password fields
- On submit: hash password with bcrypt (cost factor 12), create User row, sign in automatically
- Link to login

### Implementation

- Auth.js v5 with `CredentialsProvider`
- Passwords hashed with `bcryptjs` (pure JS, no native bindings — avoids build issues in Docker)
- Session stored as a signed JWT in an HTTP-only cookie — no database session table needed
- `@auth/prisma-adapter` is **not** used: Credentials + JWT strategy requires no adapter; the `User` table is managed entirely by our own Prisma code (register server action creates users directly)

### Database schema (Phase 1)

```prisma
model User {
  id           String   @id @default(cuid())
  name         String?
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

No Auth.js adapter tables are required in this phase. If OAuth providers are added in future, the adapter and its tables can be introduced then.

---

## Home Screen (target design, scaffolded in Phase 1)

The home screen is built to its final layout in Phase 1, but populated with placeholder/empty states. Subsequent phases wire in real data.

**Layout (desktop):**
- Greeting + date (top left), streak counts (top right — "7 day streak" / "3 days on this goal")
- "Goal" section label → goal title + "Change" link
- Horizontal rule divider
- "Routine" section label → routine name + duration + "Change" link + segment bar
- Last session note at bottom

**Streak display:** Plain text, no emoji. Amber for the streak count, muted for "on this goal". Both shown inline at the top right of content area.

**Segment bar:** Thin (3px) horizontal bar divided into routine sections, amber fill at varying opacity by section type (warmup/free practice lighter, main topic full opacity).

**Empty states (Phase 1):** When no goal is set, show a single prompt: "Set your first goal to get started →" linking to `/goals`.

---

## PWA Configuration

- `manifest.json`: name "Guitar Practice", short name "Practice", `display: standalone`, `theme_color: #d97706`, `background_color: #0c0c0c`
- Icons: 192×192 and 512×512 (maskable variant for Android home screen)
- Service worker (via `@ducanh2912/next-pwa`): caches the app shell for offline loading; API routes and data are not cached (online-only for now)
- Users can "Add to Home Screen" on iOS Safari and Android Chrome for a near-native experience

---

## Local Development (no Docker required)

```bash
# Install PostgreSQL once via Homebrew
brew install postgresql@16
brew services start postgresql@16   # starts automatically on login

# Create the local database
createdb guitarpractice

# Configure env
cp .env.example .env.local
# Set DATABASE_URL=postgresql://localhost/guitarpractice
# Set NEXTAUTH_SECRET=any-random-string
# Set NEXTAUTH_URL=http://localhost:3000

# Install deps and run
pnpm install
pnpm prisma migrate dev
pnpm dev
```

No Docker required locally. Postgres runs as a macOS launchd service and survives reboots.

---

## Docker Deployment

Two-container Compose setup: `app` + `db`.

```yaml
# docker-compose.yml (outline)
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: guitarpractice
      POSTGRES_USER: guitarpractice
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  app:
    build: .
    environment:
      DATABASE_URL: postgresql://guitarpractice:${DB_PASSWORD}@db/guitarpractice
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
    ports:
      - "3000:3000"
    depends_on:
      - db

volumes:
  postgres_data:
```

**Dockerfile:** Multi-stage build. `deps` stage installs pnpm modules; `builder` stage runs `prisma generate` then `next build`; `runner` stage is minimal Node.js Alpine image copying only the `.next/standalone` output. `next.config.ts` must set `output: 'standalone'` to enable this. Migrations run at container startup via an entrypoint script (`prisma migrate deploy && node server.js`).

---

## Full-Screen / Distraction-Free Mode

Designed in Phase 1 (infrastructure), activated in Phase 4 (practice session UI).

- A boolean in React context (`FullscreenContext`) tracks whether the app is in distraction-free mode
- When active: nav bar hidden, page padding removed, only the practice content and timer are visible
- Toggled by a button within the practice session view (Phase 4) and by pressing `Escape` to exit
- State is not persisted — resets on page reload

---

## Out of Scope for Phase 1

- Goals, routines, topics, sessions (Phases 2–5)
- Music theory engine (Phase 3)
- Metronome (Phase 4)
- Flashcards (Phase 4)
- Progress tracking / streak calculation (Phase 5)
- Forgot password / email verification
- Admin or multi-tenant features

---

## Success Criteria

Phase 1 is complete when:

1. `pnpm dev` runs cleanly on a fresh Mac with only Homebrew Postgres and Node installed
2. A user can register, log in, and log out
3. Unauthenticated routes redirect to `/login`
4. The nav bar renders correctly on desktop and mobile, with working hamburger drawer
5. Dark and light mode follow system preference with no flash, and can be toggled manually
6. Home, Goals, Library, and History pages exist with correct layout and empty-state placeholders
7. `docker compose up` starts the app and database and the app is reachable at port 3000
8. PWA manifest passes Chrome DevTools "Installable" check
