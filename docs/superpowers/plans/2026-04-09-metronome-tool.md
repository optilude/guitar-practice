# Metronome Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone metronome tool at `/tools/metronome` with time signature selection and per-beat muting, and add time signature selection to the practice session runner's metronome panel.

**Architecture:** Extend the existing `useMetronome` hook with `enabledBeats` tracking and conditional audio scheduling. Build a `MetronomeClient` component for the tool page. Add a time signature selector to the session runner's `MetronomePanel`. A new `time-signatures.ts` constant file is the single source of truth for the supported signatures list.

**Tech Stack:** Web Audio API (already in use), React hooks, `@testing-library/react` (renderHook, already installed), Vitest, Tailwind CSS, Next.js App Router.

---

## File map

| Action | Path |
|--------|------|
| Create | `lib/theory/time-signatures.ts` |
| Create | `lib/theory/time-signatures.test.ts` |
| Modify | `lib/hooks/use-metronome.ts` |
| Create | `lib/hooks/use-metronome.test.ts` |
| Create | `app/(app)/tools/metronome/_components/metronome-client.tsx` |
| Modify | `app/(app)/tools/metronome/page.tsx` |
| Modify | `app/(app)/sessions/run/_components/metronome-panel.tsx` |
| Modify | `app/(app)/sessions/run/_components/session-runner-client.tsx` |

---

### Task 1: Time signatures constant

**Files:**
- Create: `lib/theory/time-signatures.ts`
- Create: `lib/theory/time-signatures.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/theory/time-signatures.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { TIME_SIGNATURES, DEFAULT_BEATS_PER_BAR } from "./time-signatures"

describe("TIME_SIGNATURES", () => {
  it("has 8 entries", () => {
    expect(TIME_SIGNATURES).toHaveLength(8)
  })

  it("includes 4/4 with 4 beats", () => {
    const fourFour = TIME_SIGNATURES.find(s => s.label === "4/4")
    expect(fourFour).toBeDefined()
    expect(fourFour!.beats).toBe(4)
  })

  it("includes 6/8 with 6 beats", () => {
    const sixEight = TIME_SIGNATURES.find(s => s.label === "6/8")
    expect(sixEight).toBeDefined()
    expect(sixEight!.beats).toBe(6)
  })

  it("includes 12/8 with 12 beats", () => {
    const twelveEight = TIME_SIGNATURES.find(s => s.label === "12/8")
    expect(twelveEight).toBeDefined()
    expect(twelveEight!.beats).toBe(12)
  })
})

describe("DEFAULT_BEATS_PER_BAR", () => {
  it("is 4", () => {
    expect(DEFAULT_BEATS_PER_BAR).toBe(4)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/theory/time-signatures.test.ts`
Expected: FAIL with "Cannot find module './time-signatures'"

- [ ] **Step 3: Create the constant file**

Create `lib/theory/time-signatures.ts`:

```ts
export const TIME_SIGNATURES = [
  { label: "2/4", beats: 2 },
  { label: "3/4", beats: 3 },
  { label: "4/4", beats: 4 },
  { label: "5/4", beats: 5 },
  { label: "6/8", beats: 6 },
  { label: "7/8", beats: 7 },
  { label: "9/8", beats: 9 },
  { label: "12/8", beats: 12 },
] as const

export type TimeSig = typeof TIME_SIGNATURES[number]
export const DEFAULT_BEATS_PER_BAR = 4
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/theory/time-signatures.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/theory/time-signatures.ts lib/theory/time-signatures.test.ts
git commit -m "feat: add TIME_SIGNATURES constant"
```

---

### Task 2: Extend useMetronome hook

**Files:**
- Modify: `lib/hooks/use-metronome.ts`
- Create: `lib/hooks/use-metronome.test.ts`

The hook gains three additions:
1. `enabledBeats: Set<number>` — tracks which beats produce audio (all enabled by default)
2. `setEnabledBeats(beats: Set<number>)` — lets callers toggle individual beats
3. Updated `setBeatsPerBar` — now also resets `enabledBeats` to all beats for the new count

The scheduler skips the oscillator for muted beats but still advances the clock, so timing is never affected.

- [ ] **Step 1: Write failing tests**

Create `lib/hooks/use-metronome.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useMetronome } from "./use-metronome"

describe("useMetronome — enabledBeats", () => {
  it("starts with all beats enabled for 4 beats per bar", () => {
    const { result } = renderHook(() => useMetronome())
    expect(result.current.beatsPerBar).toBe(4)
    expect(result.current.enabledBeats).toEqual(new Set([0, 1, 2, 3]))
  })

  it("setBeatsPerBar(3) resets enabledBeats to {0,1,2}", () => {
    const { result } = renderHook(() => useMetronome())
    act(() => { result.current.setBeatsPerBar(3) })
    expect(result.current.beatsPerBar).toBe(3)
    expect(result.current.enabledBeats).toEqual(new Set([0, 1, 2]))
  })

  it("setBeatsPerBar(6) resets enabledBeats to {0,1,2,3,4,5}", () => {
    const { result } = renderHook(() => useMetronome())
    act(() => { result.current.setBeatsPerBar(6) })
    expect(result.current.enabledBeats).toEqual(new Set([0, 1, 2, 3, 4, 5]))
  })

  it("setEnabledBeats updates the set", () => {
    const { result } = renderHook(() => useMetronome())
    act(() => { result.current.setEnabledBeats(new Set([1, 3])) })
    expect(result.current.enabledBeats).toEqual(new Set([1, 3]))
  })

  it("setBeatsPerBar overrides a custom enabledBeats", () => {
    const { result } = renderHook(() => useMetronome())
    act(() => { result.current.setEnabledBeats(new Set([1])) })
    act(() => { result.current.setBeatsPerBar(5) })
    expect(result.current.enabledBeats).toEqual(new Set([0, 1, 2, 3, 4]))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/hooks/use-metronome.test.ts`
Expected: FAIL — `enabledBeats` is not in the hook's return value yet.

- [ ] **Step 3: Implement the changes**

Replace the entire contents of `lib/hooks/use-metronome.ts` with:

```ts
import { useState, useRef, useCallback } from "react"
import { DEFAULT_BEATS_PER_BAR } from "@/lib/theory/time-signatures"

function buildEnabledBeats(count: number): Set<number> {
  return new Set(Array.from({ length: count }, (_, i) => i))
}

export function useMetronome() {
  const [bpm, setBpmState] = useState(80)
  const [isRunning, setIsRunning] = useState(false)
  const [beatsPerBar, setBeatsPerBarState] = useState(DEFAULT_BEATS_PER_BAR)
  const [beat, setBeat] = useState(0)
  const [enabledBeats, setEnabledBeatsState] = useState<Set<number>>(
    () => buildEnabledBeats(DEFAULT_BEATS_PER_BAR)
  )

  const ctxRef = useRef<AudioContext | null>(null)
  const nextTickRef = useRef<number>(0)
  const timerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const beatCountRef = useRef<number>(0)
  const beatsPerBarRef = useRef<number>(DEFAULT_BEATS_PER_BAR)
  const enabledBeatsRef = useRef<Set<number>>(buildEnabledBeats(DEFAULT_BEATS_PER_BAR))

  const scheduleTick = useCallback((ctx: AudioContext, when: number, isDownbeat: boolean) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(isDownbeat ? 1760 : 880, when)
    gain.gain.setValueAtTime(0.3, when)
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.05)
    osc.start(when)
    osc.stop(when + 0.05)
  }, [])

  const scheduleAhead = useCallback((ctx: AudioContext, bpmVal: number) => {
    const interval = 60 / bpmVal
    const scheduleWindow = 0.1
    const checkInterval = 50

    while (nextTickRef.current < ctx.currentTime + scheduleWindow) {
      const currentBeat = beatCountRef.current % beatsPerBarRef.current
      if (enabledBeatsRef.current.has(currentBeat)) {
        scheduleTick(ctx, nextTickRef.current, currentBeat === 0)
      }
      setBeat(currentBeat)
      beatCountRef.current += 1
      nextTickRef.current += interval
    }
    timerIdRef.current = setTimeout(() => scheduleAhead(ctx, bpmVal), checkInterval)
  }, [scheduleTick])

  const start = useCallback(() => {
    if (isRunning) return
    const ctx = new AudioContext()
    ctxRef.current = ctx
    nextTickRef.current = ctx.currentTime
    beatCountRef.current = 0
    scheduleAhead(ctx, bpm)
    setIsRunning(true)
  }, [isRunning, bpm, scheduleAhead])

  const stop = useCallback(() => {
    if (timerIdRef.current) clearTimeout(timerIdRef.current)
    ctxRef.current?.close()
    ctxRef.current = null
    setIsRunning(false)
    setBeat(0)
    beatCountRef.current = 0
  }, [])

  const setBpm = useCallback((val: number) => {
    setBpmState(val)
    if (isRunning) {
      stop()
    }
  }, [isRunning, stop])

  const setBeatsPerBar = useCallback((val: number) => {
    beatsPerBarRef.current = val
    setBeatsPerBarState(val)
    const all = buildEnabledBeats(val)
    enabledBeatsRef.current = all
    setEnabledBeatsState(all)
  }, [])

  const setEnabledBeats = useCallback((beats: Set<number>) => {
    enabledBeatsRef.current = beats
    setEnabledBeatsState(beats)
  }, [])

  const isPlaying = isRunning

  return {
    bpm, setBpm,
    isPlaying, beat,
    beatsPerBar, setBeatsPerBar,
    enabledBeats, setEnabledBeats,
    start, stop,
  }
}
```

- [ ] **Step 4: Run hook tests**

Run: `npx vitest run lib/hooks/use-metronome.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: all existing tests still pass

- [ ] **Step 6: Commit**

```bash
git add lib/hooks/use-metronome.ts lib/hooks/use-metronome.test.ts
git commit -m "feat: extend useMetronome with enabledBeats and per-beat muting"
```

---

### Task 3: MetronomeClient component

**Files:**
- Create: `app/(app)/tools/metronome/_components/metronome-client.tsx`

No unit tests — this is a UI component.

The component has three sections stacked vertically:
1. **Time signature selector** — button group, one button per `TIME_SIGNATURES` entry, active one highlighted
2. **Beat grid** — N circular buttons (one per beat), each is both a toggle and a live indicator. Beat 1 (index 0) is rendered 40px, others 32px. A disabled beat shows gray; an enabled beat shows accent color. The current beat (while playing) shows a scale-up/brighter highlight regardless of enabled state so you can see position even on silent beats.
3. **BPM control + Start/Stop** — identical pattern to the existing session MetronomePanel

- [ ] **Step 1: Create the component**

Create `app/(app)/tools/metronome/_components/metronome-client.tsx`:

```tsx
"use client"

import { useState } from "react"
import { useMetronome } from "@/lib/hooks/use-metronome"
import { TIME_SIGNATURES } from "@/lib/theory/time-signatures"
import { cn } from "@/lib/utils"
import { btn } from "@/lib/button-styles"

export function MetronomeClient() {
  const [inputValue, setInputValue] = useState<string | null>(null)
  const {
    bpm, setBpm,
    isPlaying, beat,
    beatsPerBar, setBeatsPerBar,
    enabledBeats, setEnabledBeats,
    start, stop,
  } = useMetronome()

  function commitInput() {
    if (inputValue === null) return
    const parsed = parseInt(inputValue, 10)
    if (!isNaN(parsed)) setBpm(Math.min(300, Math.max(20, parsed)))
    setInputValue(null)
  }

  function toggleBeat(index: number) {
    const next = new Set(enabledBeats)
    if (next.has(index)) {
      next.delete(index)
    } else {
      next.add(index)
    }
    setEnabledBeats(next)
  }

  return (
    <div className="flex flex-col gap-6 max-w-sm">
      {/* Time signature selector */}
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Time Signature</span>
        <div className="flex flex-wrap gap-2">
          {TIME_SIGNATURES.map((sig) => (
            <button
              key={sig.label}
              type="button"
              onClick={() => setBeatsPerBar(sig.beats)}
              className={cn(
                "px-3 py-1.5 text-sm rounded border transition-colors",
                sig.beats === beatsPerBar
                  ? "border-accent bg-accent/10 text-accent font-medium"
                  : "border-border bg-muted hover:bg-muted/80 text-foreground"
              )}
            >
              {sig.label}
            </button>
          ))}
        </div>
      </div>

      {/* Beat grid */}
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Beats</span>
        <div className="flex flex-wrap gap-2 items-center">
          {Array.from({ length: beatsPerBar }, (_, i) => {
            const isEnabled = enabledBeats.has(i)
            const isCurrent = isPlaying && beat === i
            const isDownbeat = i === 0
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleBeat(i)}
                className={cn(
                  "rounded-full border-2 transition-all flex items-center justify-center text-xs font-medium",
                  isDownbeat ? "w-10 h-10" : "w-8 h-8",
                  isEnabled
                    ? isCurrent
                      ? "border-accent bg-accent text-accent-foreground scale-110"
                      : "border-accent bg-accent/20 text-accent"
                    : isCurrent
                      ? "border-muted-foreground bg-muted text-muted-foreground scale-105"
                      : "border-border bg-muted/50 text-muted-foreground"
                )}
              >
                {i + 1}
              </button>
            )
          })}
        </div>
      </div>

      {/* BPM control + Start/Stop */}
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-widest text-muted-foreground shrink-0">BPM</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setBpm(Math.max(20, bpm - 1))}
            className="w-7 h-7 rounded border border-border bg-muted hover:bg-muted/80 text-sm font-medium transition-colors flex items-center justify-center"
          >
            −
          </button>
          {inputValue !== null ? (
            <input
              autoFocus
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={commitInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitInput()
                if (e.key === "Escape") setInputValue(null)
              }}
              className="w-12 text-center font-medium tabular-nums text-sm bg-transparent border-b border-accent focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setInputValue(String(bpm))}
              className="w-12 text-center font-medium tabular-nums text-sm hover:text-accent transition-colors"
              title="Click to type a BPM"
            >
              {bpm}
            </button>
          )}
          <button
            type="button"
            onClick={() => setBpm(Math.min(300, bpm + 1))}
            className="w-7 h-7 rounded border border-border bg-muted hover:bg-muted/80 text-sm font-medium transition-colors flex items-center justify-center"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={isPlaying ? stop : start}
          className={cn(btn("standalone", "sm"), "ml-auto")}
        >
          {isPlaying ? "■ Stop" : "▶ Start"}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/tools/metronome/_components/metronome-client.tsx"
git commit -m "feat: add MetronomeClient component for standalone tool"
```

---

### Task 4: Wire up the metronome tool page

**Files:**
- Modify: `app/(app)/tools/metronome/page.tsx`

- [ ] **Step 1: Replace the placeholder**

Replace the entire contents of `app/(app)/tools/metronome/page.tsx` with:

```tsx
import Link from "next/link"
import { MetronomeClient } from "./_components/metronome-client"

export default function MetronomePage() {
  return (
    <div className="pt-6">
      <Link
        href="/tools"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
      >
        ← Tools
      </Link>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Metronome</h1>
      <MetronomeClient />
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/tools/metronome/page.tsx"
git commit -m "feat: wire up standalone metronome tool page"
```

---

### Task 5: Add time signature selector to MetronomePanel

**Files:**
- Modify: `app/(app)/sessions/run/_components/metronome-panel.tsx`

Two new optional props: `beatsPerBar?: number` and `onBeatsPerBarChange?: (beats: number) => void`. When both are provided, a `<select>` dropdown is rendered between the "BPM" label and the BPM control. When omitted, the panel is unchanged.

- [ ] **Step 1: Update MetronomePanel**

Replace the entire contents of `app/(app)/sessions/run/_components/metronome-panel.tsx` with:

```tsx
"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { btn } from "@/lib/button-styles"
import { TIME_SIGNATURES } from "@/lib/theory/time-signatures"

interface MetronomePanelProps {
  bpm: number
  isRunning: boolean
  onBpmChange: (bpm: number) => void
  onStart: () => void
  onStop: () => void
  beatsPerBar?: number
  onBeatsPerBarChange?: (beats: number) => void
}

export function MetronomePanel({
  bpm,
  isRunning,
  onBpmChange,
  onStart,
  onStop,
  beatsPerBar,
  onBeatsPerBarChange,
}: MetronomePanelProps) {
  const [inputValue, setInputValue] = useState<string | null>(null)

  function commitInput() {
    if (inputValue === null) return
    const parsed = parseInt(inputValue, 10)
    if (!isNaN(parsed)) onBpmChange(Math.min(300, Math.max(20, parsed)))
    setInputValue(null)
  }

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg border border-border bg-card">
      <span className="text-xs uppercase tracking-widest text-muted-foreground shrink-0">BPM</span>
      {beatsPerBar !== undefined && onBeatsPerBarChange && (
        <select
          value={beatsPerBar}
          onChange={e => onBeatsPerBarChange(Number(e.target.value))}
          aria-label="Time signature"
          className="bg-card border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {TIME_SIGNATURES.map(sig => (
            <option key={sig.label} value={sig.beats}>{sig.label}</option>
          ))}
        </select>
      )}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onBpmChange(Math.max(20, bpm - 1))}
          className="w-7 h-7 rounded border border-border bg-muted hover:bg-muted/80 text-sm font-medium transition-colors flex items-center justify-center"
        >
          −
        </button>
        {inputValue !== null ? (
          <input
            autoFocus
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={commitInput}
            onKeyDown={(e) => { if (e.key === "Enter") commitInput(); if (e.key === "Escape") setInputValue(null) }}
            className="w-12 text-center font-medium tabular-nums text-sm bg-transparent border-b border-accent focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        ) : (
          <button
            onClick={() => setInputValue(String(bpm))}
            className="w-12 text-center font-medium tabular-nums text-sm hover:text-accent transition-colors"
            title="Click to type a BPM"
          >
            {bpm}
          </button>
        )}
        <button
          onClick={() => onBpmChange(Math.min(300, bpm + 1))}
          className="w-7 h-7 rounded border border-border bg-muted hover:bg-muted/80 text-sm font-medium transition-colors flex items-center justify-center"
        >
          +
        </button>
      </div>
      <button
        onClick={isRunning ? onStop : onStart}
        className={cn(btn("standalone", "sm"), "ml-auto flex items-center gap-1")}
      >
        {isRunning ? "■ Stop" : "▶ Start"}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/sessions/run/_components/metronome-panel.tsx"
git commit -m "feat: add time signature selector to MetronomePanel"
```

---

### Task 6: Pass beatsPerBar to MetronomePanel in session runner

**Files:**
- Modify: `app/(app)/sessions/run/_components/session-runner-client.tsx`

The session runner calls `useMetronome()` and stores the result as `metronome`. It renders `<MetronomePanel>` in two places — one for mobile layout and one for desktop layout (both identical props). Add `beatsPerBar` and `onBeatsPerBarChange` to both.

- [ ] **Step 1: Update both MetronomePanel usages**

In `app/(app)/sessions/run/_components/session-runner-client.tsx`, find both occurrences of:

```tsx
<MetronomePanel
  bpm={metronome.bpm}
  isRunning={metronome.isPlaying}
  onBpmChange={handleMetronomeBpmChange}
  onStart={metronome.start}
  onStop={metronome.stop}
/>
```

Replace each with:

```tsx
<MetronomePanel
  bpm={metronome.bpm}
  isRunning={metronome.isPlaying}
  onBpmChange={handleMetronomeBpmChange}
  onStart={metronome.start}
  onStop={metronome.stop}
  beatsPerBar={metronome.beatsPerBar}
  onBeatsPerBarChange={metronome.setBeatsPerBar}
/>
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/sessions/run/_components/session-runner-client.tsx"
git commit -m "feat: wire beatsPerBar into session runner MetronomePanel"
```
