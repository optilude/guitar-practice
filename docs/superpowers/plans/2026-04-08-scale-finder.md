# Scale Finder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive scale finder tool where the user clicks notes on a 15-fret guitar fretboard and sees in real time all scales that contain those notes, with the option to overlay any scale on the fretboard.

**Architecture:** Fretboard.js renders a 15-fret interactive fretboard via a new `InteractiveFretboard` component; all 90 positions (6 strings × 15 frets) are populated as dots so any position can be clicked. Detection and ranking live in a pure `lib/theory/scale-finder.ts` module. `ScaleFinderClient` orchestrates state and wires the fretboard to the results list.

**Tech Stack:** Next.js app router, React hooks, `@moonwave99/fretboard.js@^0.2.13`, `tonal` (Scale, Note), Tailwind CSS, Vitest

**Branch:** `git checkout -b feat/scale-finder` before starting.

---

## Files

| Action | Path | Role |
|--------|------|------|
| Create | `lib/theory/scale-finder.ts` | Detection + ranking logic (pure, no UI deps) |
| Create | `lib/theory/scale-finder.test.ts` | Vitest unit tests for detection logic |
| Create | `app/(app)/tools/scale-finder/_components/` | New directory for components |
| Create | `app/(app)/tools/scale-finder/_components/interactive-fretboard.tsx` | Fretboard.js wrapper |
| Create | `app/(app)/tools/scale-finder/_components/scale-finder-client.tsx` | Orchestrator component |
| Modify | `app/(app)/tools/scale-finder/page.tsx` | Replace "Coming soon" with client component |

---

## Task 1: Detection logic (`lib/theory/scale-finder.ts`)

**Files:**
- Create: `lib/theory/scale-finder.ts`
- Create: `lib/theory/scale-finder.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/theory/scale-finder.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { detectScales } from "./scale-finder"
import type { ScaleMatch } from "./scale-finder"

describe("detectScales", () => {
  it("returns [] when fewer than 3 chromas are selected", () => {
    expect(detectScales(new Set([]))).toEqual([])
    expect(detectScales(new Set([0]))).toEqual([])
    expect(detectScales(new Set([0, 4]))).toEqual([])
  })

  it("returns matches for C E G (chromas 0 4 7)", () => {
    const results = detectScales(new Set([0, 4, 7]))
    expect(results.length).toBeGreaterThan(0)
    const names = results.map((r) => r.displayName)
    expect(names).toContain("C Major")
    expect(names).toContain("C Pentatonic Major")
    expect(names).toContain("G Major")
  })

  it("with key 'C', only returns C-rooted scales", () => {
    const results = detectScales(new Set([0, 4, 7]), { key: "C" })
    expect(results.every((r) => r.root === "C")).toBe(true)
    expect(results.map((r) => r.displayName)).toContain("C Major")
  })

  it("sorts by extraNotes first (fewer extra = ranked higher)", () => {
    // C D E G A = chromas 0 2 4 7 9 — exact fit for C Pentatonic Major (5 notes, 0 extra)
    // C Major has 7 notes (2 extra: F and B)
    const results = detectScales(new Set([0, 2, 4, 7, 9]), { key: "C" })
    const pentatonicIdx = results.findIndex((r) => r.type === "Pentatonic Major")
    const majorIdx = results.findIndex((r) => r.type === "Major")
    expect(pentatonicIdx).toBeGreaterThanOrEqual(0)
    expect(majorIdx).toBeGreaterThanOrEqual(0)
    expect(pentatonicIdx).toBeLessThan(majorIdx)
  })

  it("at equal extraNotes, Major (tier 1) ranks before Dorian (tier 2)", () => {
    // C D E F G A B = 0 2 4 5 7 9 11 = C Major AND D Dorian (same notes, 0 extra each)
    const results = detectScales(new Set([0, 2, 4, 5, 7, 9, 11]))
    const cMajorIdx = results.findIndex((r) => r.root === "C" && r.type === "Major")
    const dDorianIdx = results.findIndex((r) => r.root === "D" && r.type === "Dorian")
    expect(cMajorIdx).toBeGreaterThanOrEqual(0)
    expect(dDorianIdx).toBeGreaterThanOrEqual(0)
    expect(cMajorIdx).toBeLessThan(dDorianIdx)
  })

  it("returns correct notes and intervals for C Major", () => {
    const results = detectScales(new Set([0, 2, 4, 5, 7, 9, 11]), { key: "C" })
    const cMajor = results.find((r) => r.root === "C" && r.type === "Major")
    expect(cMajor).toBeDefined()
    expect(cMajor!.notes).toEqual(["C", "D", "E", "F", "G", "A", "B"])
    expect(cMajor!.intervals).toEqual(["1", "2", "3", "4", "5", "6", "7"])
    expect(cMajor!.extraNotes).toBe(0)
    expect(cMajor!.commonalityTier).toBe(1)
  })

  it("populates displayName correctly", () => {
    const results = detectScales(new Set([0, 4, 7]), { key: "C" })
    const cMajor = results.find((r) => r.root === "C" && r.type === "Major")
    expect(cMajor!.displayName).toBe("C Major")
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/maraspeli/Build/Claude/GuitarPractice
npm test -- --reporter=verbose lib/theory/scale-finder.test.ts
```

Expected: FAIL — `Cannot find module './scale-finder'`

- [ ] **Step 3: Write the implementation**

Create `lib/theory/scale-finder.ts`:

```typescript
import { Scale, Note } from "tonal"

// ---------------------------------------------------------------------------
// Interval conversion (mirrors chord-finder-client.tsx — kept local to avoid
// coupling two independent modules)
// ---------------------------------------------------------------------------
const TONAL_TO_DEGREE: Record<string, string> = {
  "1P": "1", "2m": "b2", "2M": "2", "2A": "#2",
  "3m": "b3", "3M": "3", "4P": "4", "4A": "#4",
  "5d": "b5", "5P": "5", "5A": "#5",
  "6m": "b6", "6M": "6", "7m": "b7", "7M": "7",
}

// ---------------------------------------------------------------------------
// Scale type name mapping (mirrors scales.ts PATTERN_TO_TONAL — kept local
// so this module has no dependency on lib/theory/scales.ts)
// ---------------------------------------------------------------------------
const DISPLAY_TO_TONAL: Record<string, string> = {
  "Major":                   "major",
  "Dorian":                  "dorian",
  "Phrygian":                "phrygian",
  "Lydian":                  "lydian",
  "Mixolydian":              "mixolydian",
  "Aeolian":                 "aeolian",
  "Locrian":                 "locrian",
  "Harmonic Minor":          "harmonic minor",
  "Melodic Minor":           "melodic minor",
  "Dorian b2":               "dorian b2",
  "Ionian #5":               "ionian augmented",
  "Dorian #4":               "dorian #4",
  "Mixolydian b6":           "mixolydian b6",
  "Locrian #6":              "locrian 6",
  "Altered Diminished":      "ultralocrian",
  "Lydian #2":               "lydian #9",
  "Altered":                 "altered",
  "Lydian Dominant":         "lydian dominant",
  "Lydian Augmented":        "lydian augmented",
  "Phrygian Dominant":       "phrygian dominant",
  "Bebop Dominant":          "bebop",
  "Pentatonic Major":        "major pentatonic",
  "Pentatonic Minor":        "minor pentatonic",
  "Blues":                   "blues",
  "Locrian #2":              "locrian #2",
  "Whole Tone":              "whole tone",
  "Diminished Whole-Half":   "diminished",
  "Diminished Half-Whole":   "half-whole diminished",
  "Chromatic":               "chromatic",
}

// ---------------------------------------------------------------------------
// Commonality tiers (1 = most common in blues/rock/pop/jazz, 5 = most exotic)
// Anything not listed defaults to tier 5.
// ---------------------------------------------------------------------------
const COMMONALITY_TIER: Record<string, number> = {
  // Tier 1 — ubiquitous
  "Major": 1, "Aeolian": 1, "Pentatonic Major": 1, "Pentatonic Minor": 1, "Blues": 1,
  // Tier 2 — very common in rock/jazz
  "Dorian": 2, "Mixolydian": 2,
  // Tier 3 — common in jazz/classical
  "Phrygian": 3, "Lydian": 3, "Locrian": 3, "Melodic Minor": 3, "Harmonic Minor": 3,
  // Tier 4 — jazz/fusion (Melodic Minor modes)
  "Dorian b2": 4, "Lydian Augmented": 4, "Lydian Dominant": 4,
  "Mixolydian b6": 4, "Locrian #2": 4, "Altered": 4,
  // Everything else is tier 5 (default)
}

const ALL_ROOTS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------
export type ScaleMatch = {
  root: string          // e.g. "C"
  type: string          // e.g. "Dorian"
  displayName: string   // e.g. "C Dorian"
  notes: string[]       // e.g. ["C", "D", "Eb", "F", "G", "A", "Bb"]
  intervals: string[]   // e.g. ["1", "2", "b3", "4", "5", "6", "b7"]
  extraNotes: number    // scale size − selectedChromas.size
  commonalityTier: number  // 1–5
}

// ---------------------------------------------------------------------------
// detectScales
// ---------------------------------------------------------------------------
export function detectScales(
  selectedChromas: Set<number>,
  options?: { key?: string },
): ScaleMatch[] {
  if (selectedChromas.size < 3) return []

  const roots: readonly string[] = options?.key ? [options.key] : ALL_ROOTS
  const scaleTypes = Object.keys(DISPLAY_TO_TONAL)
  const results: Array<{ match: ScaleMatch; sortKey: [number, number, string] }> = []

  for (const root of roots) {
    for (const type of scaleTypes) {
      const tonalName = DISPLAY_TO_TONAL[type]
      const scaleData = Scale.get(`${root} ${tonalName}`)
      if (scaleData.empty || scaleData.notes.length === 0) continue

      // Build chroma set for this scale
      const scaleChromas = new Set(
        scaleData.notes
          .map((n) => Note.chroma(n))
          .filter((c): c is number => typeof c === "number" && Number.isFinite(c)),
      )

      // Skip if scale doesn't contain ALL selected chromas
      const isSuperset = [...selectedChromas].every((c) => scaleChromas.has(c))
      if (!isSuperset) continue

      const extraNotes = scaleChromas.size - selectedChromas.size
      const commonalityTier = COMMONALITY_TIER[type] ?? 5
      const displayName = `${root} ${type}`
      const intervals = scaleData.intervals.map((iv) => TONAL_TO_DEGREE[iv] ?? iv)

      results.push({
        match: { root, type, displayName, notes: scaleData.notes, intervals, extraNotes, commonalityTier },
        sortKey: [extraNotes, commonalityTier, displayName],
      })
    }
  }

  results.sort((a, b) => {
    if (a.sortKey[0] !== b.sortKey[0]) return a.sortKey[0] - b.sortKey[0]
    if (a.sortKey[1] !== b.sortKey[1]) return a.sortKey[1] - b.sortKey[1]
    return a.sortKey[2].localeCompare(b.sortKey[2])
  })

  return results.map((r) => r.match)
}
```

- [ ] **Step 4: Run tests — all must pass**

```bash
npm test -- --reporter=verbose lib/theory/scale-finder.test.ts
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/theory/scale-finder.ts lib/theory/scale-finder.test.ts
git commit -m "feat: add scale detection logic with commonality-ranked results"
```

---

## Task 2: Interactive Fretboard component

**Files:**
- Create: `app/(app)/tools/scale-finder/_components/interactive-fretboard.tsx`

No unit tests for this component (DOM/canvas rendering). Validate visually in Task 4.

- [ ] **Step 1: Create the component file**

Create `app/(app)/tools/scale-finder/_components/interactive-fretboard.tsx`:

```typescript
"use client"

import { useEffect, useRef, useState } from "react"
import { Note } from "tonal"
import { Fretboard } from "@moonwave99/fretboard.js"
import { INTERVAL_DEGREE_COLORS } from "@/lib/rendering/tab"
import type { ScaleMatch } from "@/lib/theory/scale-finder"

// Open-string chroma: index 0 = string 6 (low E), index 5 = string 1 (high e)
// Matches lib/rendering/fretboard.ts and lib/theory/scales.ts
const OPEN_CHROMA = [4, 9, 2, 7, 11, 4] as const

// Semitone distance from root → interval degree label
const SEMITONE_TO_DEGREE: Record<number, string> = {
  0: "1", 1: "b2", 2: "2", 3: "b3", 4: "3",
  5: "4", 6: "#4", 7: "5", 8: "b6", 9: "6", 10: "b7", 11: "7",
}

// Semitone distance from root → fill colour (root uses theme accent, resolved at render)
const SEMITONE_TO_COLOR: Record<number, string> = {
  0: "",  // root — use accentColor
  1: INTERVAL_DEGREE_COLORS.second,
  2: INTERVAL_DEGREE_COLORS.second,
  3: INTERVAL_DEGREE_COLORS.third,
  4: INTERVAL_DEGREE_COLORS.third,
  5: INTERVAL_DEGREE_COLORS.fourth,
  6: INTERVAL_DEGREE_COLORS.fourth,
  7: INTERVAL_DEGREE_COLORS.fifth,
  8: INTERVAL_DEGREE_COLORS.fifth,
  9: INTERVAL_DEGREE_COLORS.sixth,
  10: INTERVAL_DEGREE_COLORS.seventh,
  11: INTERVAL_DEGREE_COLORS.seventh,
}

// Precomputed: all 90 positions (6 strings × 15 frets, frets 0–14).
// Fretboard.js string numbers: 1 = high e, 6 = low E.
const ALL_POSITIONS: Array<{ string: number; fret: number; chroma: number }> = (() => {
  const out: Array<{ string: number; fret: number; chroma: number }> = []
  for (let s = 1; s <= 6; s++) {
    for (let f = 0; f <= 14; f++) {
      // OPEN_CHROMA index: 6 - s  (s=6 → idx 0 = low E, s=1 → idx 5 = high e)
      out.push({ string: s, fret: f, chroma: (OPEN_CHROMA[6 - s] + f) % 12 })
    }
  }
  return out
})()

export interface InteractiveFretboardProps {
  selectedChromas: Set<number>
  previewedScale: ScaleMatch | null
  keyChroma: number | null
  labelMode: "notes" | "intervals"
  chromaToNote: string[]  // 12-element chroma→note name map
  onChromaToggle: (chroma: number) => void
}

export function InteractiveFretboard({
  selectedChromas,
  previewedScale,
  keyChroma,
  labelMode,
  chromaToNote,
  onChromaToggle,
}: InteractiveFretboardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDark, setIsDark] = useState(false)

  // Track dark mode changes
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"))
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark"))
    )
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.innerHTML = ""

    // Theme-aware colours (matches lib/rendering/fretboard.ts convention)
    const accentColor = isDark ? "#d97706" : "#b45309"
    // Card background for hollow (preview) dot fill
    const cardBg = isDark ? "#111827" : "#ffffff"

    // Build preview chroma set from the previewed scale's notes
    const previewChromas = new Set<number>()
    if (previewedScale) {
      for (const noteName of previewedScale.notes) {
        const c = Note.chroma(noteName)
        if (typeof c === "number" && Number.isFinite(c)) {
          previewChromas.add(c)
        }
      }
    }

    // Build the full dot array: one dot per position.
    // dotType drives styling; dotChroma is used by the click handler.
    // Ghost dots (invisible) ensure clicks register anywhere on the neck.
    // SVG elements with opacity:0 still capture pointer events.
    const dots = ALL_POSITIONS.map(({ string, fret, chroma }) => {
      const isSelected = selectedChromas.has(chroma)
      const isPreview = previewChromas.has(chroma) && !isSelected
      const dotType: "selected" | "preview" | "ghost" =
        isSelected ? "selected" : isPreview ? "preview" : "ghost"

      let label = ""
      if (dotType !== "ghost") {
        if (labelMode === "intervals" && keyChroma !== null) {
          const semitones = (chroma - keyChroma + 12) % 12
          label = SEMITONE_TO_DEGREE[semitones] ?? ""
        } else {
          label = chromaToNote[chroma] ?? ""
        }
      }

      return { string, fret, dotChroma: chroma, dotType, note: label }
    })

    const fretboard = new (Fretboard as any)({
      el: container,
      fretCount: 15,
      showFretNumbers: true,
      dotText: (d: any) => (d.note as string) ?? "",
    })

    fretboard.setDots(dots)
    fretboard.render()

    // Ghost dots: invisible but clickable (opacity:0 does not disable pointer events in SVG)
    fretboard.style({
      filter: (d: any) => d.dotType === "ghost",
      fill: "transparent",
      stroke: "transparent",
      fontFill: "transparent",
      opacity: 0,
    })

    // Selected dots: filled, coloured by interval degree (or accent if no key)
    if (keyChroma !== null) {
      for (let semitones = 0; semitones <= 11; semitones++) {
        const fillColor = semitones === 0 ? accentColor : (SEMITONE_TO_COLOR[semitones] ?? accentColor)
        fretboard.style({
          filter: (d: any) =>
            d.dotType === "selected" && (d.dotChroma - keyChroma + 12) % 12 === semitones,
          fill: fillColor,
          stroke: fillColor,
          text: (d: any) => d.note,
          fontFill: "#ffffff",
        })
      }
    } else {
      fretboard.style({
        filter: (d: any) => d.dotType === "selected",
        fill: accentColor,
        stroke: accentColor,
        text: (d: any) => d.note,
        fontFill: "#ffffff",
      })
    }

    // Preview dots: hollow (outline style — filled with card background, coloured stroke)
    if (keyChroma !== null) {
      for (let semitones = 0; semitones <= 11; semitones++) {
        const strokeColor = semitones === 0 ? accentColor : (SEMITONE_TO_COLOR[semitones] ?? accentColor)
        fretboard.style({
          filter: (d: any) =>
            d.dotType === "preview" && (d.dotChroma - keyChroma + 12) % 12 === semitones,
          fill: cardBg,
          stroke: strokeColor,
          text: (d: any) => d.note,
          fontFill: strokeColor,
        })
      }
    } else {
      fretboard.style({
        filter: (d: any) => d.dotType === "preview",
        fill: cardBg,
        stroke: accentColor,
        text: (d: any) => d.note,
        fontFill: accentColor,
      })
    }

    // Dark mode: colour structural SVG elements (strings, fret lines, fret numbers)
    // Matches the pattern in lib/rendering/fretboard.ts
    if (isDark) {
      const svgEl = container.querySelector<SVGSVGElement>("svg")
      if (svgEl) {
        svgEl.querySelectorAll("line").forEach((el) => el.setAttribute("stroke", "#888"))
        svgEl.querySelectorAll("text").forEach((el) => {
          if (!el.getAttribute("fill")) el.setAttribute("fill", "#888")
        })
      }
    }

    // Click handler: fires for all dots (ghost, selected, preview)
    // Fretboard.js passes the dot's data object as the first argument
    fretboard.on("click", (position: any) => {
      const chroma = position.dotChroma as number
      if (typeof chroma === "number") {
        onChromaToggle(chroma)
      }
    })

    return () => {
      container.innerHTML = ""
    }
  }, [selectedChromas, previewedScale, keyChroma, labelMode, chromaToNote, isDark, onChromaToggle])

  return (
    <div
      ref={containerRef}
      className="w-full overflow-x-auto rounded border border-border bg-card p-2"
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(app)/tools/scale-finder/_components/interactive-fretboard.tsx
git commit -m "feat: add InteractiveFretboard component with Fretboard.js"
```

---

## Task 3: Scale Finder Client orchestrator

**Files:**
- Create: `app/(app)/tools/scale-finder/_components/scale-finder-client.tsx`

- [ ] **Step 1: Create the client component**

Create `app/(app)/tools/scale-finder/_components/scale-finder-client.tsx`:

```typescript
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Note } from "tonal"
import { buildChromaMap } from "@/lib/theory/chord-finder"
import { getScale } from "@/lib/theory/scales"
import { detectScales } from "@/lib/theory/scale-finder"
import type { ScaleMatch } from "@/lib/theory/scale-finder"
import { InteractiveFretboard } from "./interactive-fretboard"
import { btn } from "@/lib/button-styles"

const ROOT_NOTES = ["Ab", "A", "Bb", "B", "C", "Db", "D", "Eb", "E", "F", "Gb", "G"] as const

export function ScaleFinderClient() {
  const [selectedChromas, setSelectedChromas] = useState<Set<number>>(new Set())
  const [filterKey, setFilterKey] = useState("")
  const [labelMode, setLabelMode] = useState<"notes" | "intervals">("notes")
  const [previewedScale, setPreviewedScale] = useState<ScaleMatch | null>(null)

  // Enharmonic-aware note names for the selected key (uses Major scale convention for spelling)
  const scaleNotes = useMemo(() => {
    if (!filterKey) return null
    try {
      return getScale(filterKey, "Major").notes
    } catch {
      return null
    }
  }, [filterKey])

  const chromaToNote = useMemo(() => buildChromaMap(scaleNotes), [scaleNotes])

  const keyChroma = useMemo(
    () => (filterKey ? (Note.chroma(filterKey) ?? null) : null),
    [filterKey],
  )

  const results = useMemo(
    () => detectScales(selectedChromas, { key: filterKey || undefined }),
    [selectedChromas, filterKey],
  )

  const handleChromaToggle = useCallback((chroma: number) => {
    setSelectedChromas((prev) => {
      const next = new Set(prev)
      if (next.has(chroma)) {
        next.delete(chroma)
      } else {
        next.add(chroma)
      }
      return next
    })
  }, [])

  // Clear preview when selection drops below 3 notes (no valid results to preview)
  useEffect(() => {
    if (selectedChromas.size < 3) setPreviewedScale(null)
  }, [selectedChromas.size])

  function handleScaleRowClick(scale: ScaleMatch) {
    setPreviewedScale((prev) =>
      prev?.displayName === scale.displayName ? null : scale,
    )
  }

  function handleClear() {
    setSelectedChromas(new Set())
    setPreviewedScale(null)
  }

  function handleKeyChange(key: string) {
    setFilterKey(key)
    setPreviewedScale(null)
    if (!key) setLabelMode("notes")
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Controls row: key centre + notes/intervals toggle */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="sf-key-select">
            Key centre
          </label>
          <select
            id="sf-key-select"
            value={filterKey}
            onChange={(e) => handleKeyChange(e.target.value)}
            className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
          >
            <option value="">Any</option>
            {ROOT_NOTES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {filterKey && (
          <div className="flex rounded border border-border overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setLabelMode("notes")}
              className={`px-3 py-1.5 transition-colors ${
                labelMode === "notes"
                  ? "bg-accent text-accent-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              Notes
            </button>
            <button
              type="button"
              onClick={() => setLabelMode("intervals")}
              className={`px-3 py-1.5 transition-colors border-l border-border ${
                labelMode === "intervals"
                  ? "bg-accent text-accent-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              Intervals
            </button>
          </div>
        )}
      </div>

      {/* Fretboard */}
      <InteractiveFretboard
        selectedChromas={selectedChromas}
        previewedScale={previewedScale}
        keyChroma={keyChroma}
        labelMode={labelMode}
        chromaToNote={chromaToNote}
        onChromaToggle={handleChromaToggle}
      />

      {/* Clear button */}
      <div>
        <button type="button" onClick={handleClear} className={btn("destructive", "sm")}>
          Clear
        </button>
      </div>

      {/* Results */}
      <div aria-live="polite">
        {selectedChromas.size < 3 ? (
          <p className="text-sm text-muted-foreground">
            Select at least 3 notes to identify scales.
          </p>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matching scales found.</p>
        ) : (
          <div className="divide-y divide-border">
            {results.map((scale) => {
              const isActive = previewedScale?.displayName === scale.displayName
              return (
                <button
                  key={scale.displayName}
                  type="button"
                  onClick={() => handleScaleRowClick(scale)}
                  className={`w-full text-left px-3 py-2 transition-colors rounded ${
                    isActive
                      ? "bg-accent/10 border border-accent/20"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="text-sm font-medium text-foreground">{scale.displayName}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {scale.notes.join("  ")}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {scale.intervals.join("  ")}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(app)/tools/scale-finder/_components/scale-finder-client.tsx
git commit -m "feat: add ScaleFinderClient with results, key filter, and preview toggle"
```

---

## Task 4: Wire up the page route

**Files:**
- Modify: `app/(app)/tools/scale-finder/page.tsx`

- [ ] **Step 1: Replace the stub page**

Replace the entire contents of `app/(app)/tools/scale-finder/page.tsx` with:

```typescript
import Link from "next/link"
import { ScaleFinderClient } from "./_components/scale-finder-client"

export default function ScaleFinderPage() {
  return (
    <div className="pt-6">
      <Link
        href="/tools"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
      >
        ← Tools
      </Link>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Scale Finder</h1>
      <ScaleFinderClient />
    </div>
  )
}
```

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

Expected: all tests pass (scale-finder.test.ts + sessions.test.ts + any others).

- [ ] **Step 3: Commit**

```bash
git add app/(app)/tools/scale-finder/page.tsx
git commit -m "feat: wire up scale finder page"
```

---

## Troubleshooting notes

**Ghost dots not capturing clicks:**
If clicking on empty fret positions does nothing, `opacity: 0` may be suppressing events in Fretboard.js's D3-based rendering. Replace the ghost dot style call with `fill: "rgba(0,0,0,0.005)"` and `stroke: "rgba(0,0,0,0.005)"` instead of `transparent` and remove the `opacity: 0` line. This keeps dots nearly invisible while ensuring pointer events fire.

**Fretboard.js click handler signature:**
The `.on("click", handler)` method matches `FretboardHandler = (position: Position, event: MouseEvent) => void` (see `node_modules/@moonwave99/fretboard.js/dist/fretboard/Fretboard.d.ts`). The `position` object contains all properties set on the dot, including the custom `dotChroma` field. If the handler receives `(event, datum)` in reverse order (D3 v6+ convention), swap the arguments: `fretboard.on("click", (_event: MouseEvent, position: any) => { ... })`.

**Styles not applying to ghost dots:**
Fretboard.js calls `style()` in sequence. If ghost dot styling is applied after selected/preview styling, it might override visible dots. Keep the ghost style call first (immediately after `render()`), before selected and preview styles.
