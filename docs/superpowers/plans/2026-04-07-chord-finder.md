# Chord Finder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive chord identification tool — the user places dots on a 6-fret SVGuitar diagram, and the app detects chords in real time with optional key/scale filtering.

**Architecture:** Detection logic lives in `lib/theory/chord-finder.ts` (pure functions, testable in isolation). The interactive grid component wraps SVGuitar with a transparent SVG click-zone overlay. The client component owns all state and wires the pieces together.

**Tech Stack:** tonal v6 (`Chord.detect`, `Chord.get`, `Note.chroma`), svguitar v2 (`SVGuitarChord`, `OPEN`, `SILENT`), React 19, Tailwind v4, Vitest.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `lib/theory/chord-finder.ts` | Pure detection + ranking logic |
| Create | `lib/theory/__tests__/chord-finder.test.ts` | Unit tests for detection logic |
| Create | `app/(app)/tools/chord-finder/_components/interactive-chord-grid.tsx` | SVGuitar render + transparent click overlay |
| Create | `app/(app)/tools/chord-finder/_components/chord-finder-client.tsx` | State, filter dropdowns, results panel |
| Modify | `app/(app)/tools/chord-finder/page.tsx` | Remove placeholder, render client component |

---

## Task 1: Detection Logic

**Files:**
- Create: `lib/theory/__tests__/chord-finder.test.ts`
- Create: `lib/theory/chord-finder.ts`

- [ ] **Step 1.1: Write the failing tests**

Create `lib/theory/__tests__/chord-finder.test.ts`:

```ts
import { detectChords } from "@/lib/theory/chord-finder"

// Open-string chroma reference: [4,9,2,7,11,4] = low-E, A, D, G, B, high-e
// Index 0=low-E(str6), 5=high-e(str1)

describe("detectChords", () => {
  it("returns empty array when all strings are muted", () => {
    expect(detectChords([null, null, null, null, null, null])).toEqual([])
  })

  it("detects C major from x-3-2-0-1-0 shape", () => {
    // str5(A):3→C, str4(D):2→E, str3(G):0→G, str2(B):1→C, str1(e):0→E
    const frets = [null, 3, 2, 0, 1, 0]
    const results = detectChords(frets)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].root).toBe("C")
    expect(results[0].isRootPosition).toBe(true)
  })

  it("detects Am from x-0-2-2-1-0 shape", () => {
    // str5(A):0→A, str4(D):2→E, str3(G):2→A, str2(B):1→C, str1(e):0→E
    const frets = [null, 0, 2, 2, 1, 0]
    const results = detectChords(frets)
    expect(results.length).toBeGreaterThan(0)
    const am = results.find(r => r.root === "A" && r.quality === "m")
    expect(am).toBeDefined()
    expect(am!.isRootPosition).toBe(true)
  })

  it("uses flat-preferred note names (Bb not A#)", () => {
    // str3(G): fret 3 → chroma (7+3)%12=10 → should be "Bb" not "A#"
    const frets = [null, null, null, 3, null, null]
    const results = detectChords(frets)
    const allSymbols = results.map(r => r.symbol).join(" ")
    expect(allSymbols).not.toMatch(/A#/)
  })

  it("places root-position chords before inversions", () => {
    // G major open: 3-2-0-0-3-3
    // str6(E):3→G, str5(A):2→B, str4(D):0→D, str3(G):0→G, str2(B):3→D, str1(e):3→G
    const frets = [3, 2, 0, 0, 3, 3]
    const results = detectChords(frets)
    expect(results.length).toBeGreaterThan(0)
    // First result should be root position
    expect(results[0].isRootPosition).toBe(true)
    // All root-position results should come before any inversions
    const firstInversionIdx = results.findIndex(r => !r.isRootPosition)
    const lastRootPositionIdx = results.map(r => r.isRootPosition).lastIndexOf(true)
    if (firstInversionIdx !== -1 && lastRootPositionIdx !== -1) {
      expect(lastRootPositionIdx).toBeLessThan(firstInversionIdx)
    }
  })

  it("places triads before seventh chords among same inversion type", () => {
    // A major: x-0-2-2-2-0
    // str5(A):0→A, str4(D):2→E, str3(G):2→A, str2(B):2→Db(C#), str1(e):0→E
    const frets = [null, 0, 2, 2, 2, 0]
    const results = detectChords(frets)
    const aTriadIdx = results.findIndex(r => r.root === "A" && (r.quality === "M" || r.quality === "" || r.quality === "maj"))
    const aSeventhIdx = results.findIndex(r => r.root === "A" && /7/.test(r.quality))
    if (aTriadIdx !== -1 && aSeventhIdx !== -1) {
      expect(aTriadIdx).toBeLessThan(aSeventhIdx)
    }
  })

  it("adds degreeLabel when both key and scaleType are provided", () => {
    // Em open: 0-2-2-0-0-0 — diatonic to C major (vi chord)
    const frets = [0, 2, 2, 0, 0, 0]
    const results = detectChords(frets, { key: "C", scaleType: "Major" })
    expect(results.length).toBeGreaterThan(0)
    const em = results.find(r => r.root === "E" && r.quality === "m")
    expect(em?.degreeLabel).toBe("vi")
  })

  it("filters out non-diatonic chords when key+scale active", () => {
    // Em open: 0-2-2-0-0-0 — notes E, B, G
    // In C major (E G B = vi). But if we set key=F# major, E minor is not diatonic.
    const frets = [0, 2, 2, 0, 0, 0]
    const inCMajor = detectChords(frets, { key: "C", scaleType: "Major" })
    const inFSharpMajor = detectChords(frets, { key: "F#", scaleType: "Major" })
    // F# major notes: F#, G#, A#, B, C#, D#, E# — E natural is not in F# major
    expect(inFSharpMajor.length).toBeLessThan(inCMajor.length)
  })

  it("does not filter when only key is provided (no scaleType)", () => {
    const frets = [null, 0, 2, 2, 1, 0]
    const unfiltered = detectChords(frets)
    const withKeyOnly = detectChords(frets, { key: "C" })
    expect(withKeyOnly.length).toBe(unfiltered.length)
  })

  it("does not filter when only scaleType is provided (no key)", () => {
    const frets = [null, 0, 2, 2, 1, 0]
    const unfiltered = detectChords(frets)
    const withScaleOnly = detectChords(frets, { scaleType: "Major" })
    expect(withScaleOnly.length).toBe(unfiltered.length)
  })
})
```

- [ ] **Step 1.2: Run tests to verify they fail**

```bash
pnpm test:run lib/theory/__tests__/chord-finder.test.ts
```

Expected: `FAIL` — `Cannot find module '@/lib/theory/chord-finder'`

- [ ] **Step 1.3: Implement `lib/theory/chord-finder.ts`**

```ts
import { Chord, Note } from "tonal"
import { getScale } from "@/lib/theory/scales"

// Open-string chroma: index 0 = string 6 (low E), index 5 = string 1 (high e)
const OPEN_CHROMA = [4, 9, 2, 7, 11, 4] as const

// Flat-preferred chroma → note name mapping
const CHROMA_TO_NOTE = [
  "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B",
] as const

export type DetectedChord = {
  symbol: string       // e.g. "Cm7", "Eb/G"
  root: string         // e.g. "C"
  quality: string      // tonal alias[0], e.g. "m7", "M", "" (empty = major)
  bass: string         // lowest sounding note name
  isRootPosition: boolean
  degreeLabel?: string // e.g. "vi" — only when key+scale filter active
}

// Chord type complexity tier: lower = shown earlier (triad → 7th → 6th → sus → extended → other)
function complexityTier(chordType: string): number {
  const t = chordType.toLowerCase()
  if (t === "major" || t === "minor" || t === "diminished" || t === "augmented" || t === "fifth") return 0
  if (/seventh/.test(t) && !/ninth|eleventh|thirteenth/.test(t)) return 1
  if (/sixth/.test(t) && !/seventh/.test(t)) return 2
  if (/suspended/.test(t)) return 3
  if (/ninth|eleventh|thirteenth/.test(t)) return 4
  return 5
}

function chordScore(isRootPosition: boolean, chordType: string, symbolLength: number): number {
  return (isRootPosition ? 0 : 10) + complexityTier(chordType) + symbolLength
}

const DEGREE_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"] as const

function computeDegreeLabel(root: string, scaleNotes: string[], isMinorish: boolean): string | undefined {
  const rootChroma = Note.chroma(root)
  if (rootChroma === undefined || rootChroma === null) return undefined
  const idx = scaleNotes.findIndex((n) => Note.chroma(n) === rootChroma)
  if (idx === -1 || idx >= DEGREE_NUMERALS.length) return undefined
  const numeral = DEGREE_NUMERALS[idx]
  return isMinorish ? numeral.toLowerCase() : numeral
}

export function detectChords(
  frets: (number | null)[],
  options?: { key?: string; scaleType?: string },
): DetectedChord[] {
  // 1. Compute sounding note for each non-muted string (low E first = index 0)
  const soundingStrings: Array<{ note: string }> = []
  for (let i = 0; i < 6; i++) {
    const fret = frets[i]
    if (fret === null) continue
    const chroma = (OPEN_CHROMA[i] + fret) % 12
    soundingStrings.push({ note: CHROMA_TO_NOTE[chroma] })
  }
  if (soundingStrings.length === 0) return []

  // 2. Unique pitch classes (preserve encounter order for Chord.detect)
  const seenChromas = new Set<number>()
  const uniqueNotes: string[] = []
  for (const { note } of soundingStrings) {
    const chroma = Note.chroma(note)
    if (chroma !== undefined && chroma !== null && !seenChromas.has(chroma)) {
      seenChromas.add(chroma)
      uniqueNotes.push(note)
    }
  }

  // 3. Bass = lowest non-muted string note
  const bass = soundingStrings[0].note

  // 4. Detect all matching chords
  const detected = Chord.detect(uniqueNotes)
  if (detected.length === 0) return []

  // 5. Resolve scale notes for optional filter + degree labelling
  let scaleNotes: string[] | null = null
  if (options?.key && options?.scaleType) {
    try {
      scaleNotes = getScale(options.key, options.scaleType).notes
    } catch {
      // unknown combination — skip filter
    }
  }

  // 6. Build result entries
  const scaleChromas = scaleNotes
    ? new Set(scaleNotes.map((n) => Note.chroma(n)))
    : null

  const entries: Array<{ chord: DetectedChord; score: number }> = []
  for (const symbol of detected) {
    const slashIdx = symbol.indexOf("/")
    const baseSymbol = slashIdx >= 0 ? symbol.slice(0, slashIdx) : symbol
    const slashBass = slashIdx >= 0 ? symbol.slice(slashIdx + 1) : null

    const info = Chord.get(baseSymbol)
    const root = info.tonic
    if (!root) continue

    const quality = info.aliases[0] ?? ""
    const effectiveBass = slashBass ?? root
    const isRootPosition = Note.chroma(effectiveBass) === Note.chroma(bass)

    // Scale filter: skip chords with any tone outside the scale
    if (scaleChromas) {
      const allInScale = info.notes.every((n) => {
        const c = Note.chroma(n)
        return c !== undefined && c !== null && scaleChromas.has(c)
      })
      if (!allInScale) continue
    }

    const chord: DetectedChord = { symbol, root, quality, bass, isRootPosition }
    if (scaleNotes) {
      const isMinorish = info.quality === "Minor" || info.quality === "Diminished"
      chord.degreeLabel = computeDegreeLabel(root, scaleNotes, isMinorish)
    }

    entries.push({ chord, score: chordScore(isRootPosition, info.type, symbol.length) })
  }

  // 7. Sort by score (ascending = simpler/more obvious first)
  return entries.sort((a, b) => a.score - b.score).map((e) => e.chord)
}
```

- [ ] **Step 1.4: Run tests to verify they pass**

```bash
pnpm test:run lib/theory/__tests__/chord-finder.test.ts
```

Expected: all tests pass. If the "Am quality" test fails because tonal returns a different alias, check `Chord.get("Am").aliases[0]` in a test and adjust the test assertion to match the actual alias.

- [ ] **Step 1.5: Commit**

```bash
git add lib/theory/chord-finder.ts lib/theory/__tests__/chord-finder.test.ts
git commit -m "feat: add chord detection and ranking logic"
```

---

## Task 2: Interactive Chord Grid

**Files:**
- Create: `app/(app)/tools/chord-finder/_components/interactive-chord-grid.tsx`

SVGuitar renders the visual diagram. An absolutely-positioned transparent SVG overlay (same viewBox) captures clicks. The start fret number input sits to the right of the diagram, vertically aligned with the first fret row.

- [ ] **Step 2.1: Create `_components/` directory and `interactive-chord-grid.tsx`**

```tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { SVGuitarChord, OPEN, SILENT, type Chord, BarreChordStyle } from "svguitar"

// Open-string chroma: index 0 = string 6 (low E), index 5 = string 1 (high e)
const OPEN_CHROMA = [4, 9, 2, 7, 11, 4] as const

interface InteractiveChordGridProps {
  frets: (number | null)[]       // null=muted, 0=open, N=absolute fret
  startFret: number              // first visible fret (default 1)
  numFrets?: number              // visible fret rows (default 6)
  onFretsChange: (frets: (number | null)[]) => void
  onStartFretChange: (fret: number) => void
}

// Convert our absolute-fret state to a SVGuitar Chord object.
// SVGuitar strings: 6=low E (index 0), 1=high e (index 5).
// SVGuitar fret numbers are 1-based relative to startFret.
function toSVGuitarChord(
  frets: (number | null)[],
  startFret: number,
  numFrets: number,
): Chord {
  const fingers = frets.flatMap((f, i) => {
    const stringNum = 6 - i // SVGuitar string number
    if (f === null) return [[stringNum, SILENT] as const]
    if (f === 0) return [[stringNum, OPEN] as const]
    const relativeFret = f - startFret + 1
    if (relativeFret < 1 || relativeFret > numFrets) return [[stringNum, SILENT] as const]
    return [[stringNum, relativeFret] as const]
  })
  return {
    fingers,
    barres: [],
    position: startFret > 1 ? startFret : undefined,
  }
}

type HitZone = {
  stringIndex: number           // 0=low E, 5=high e
  fret: number | "header"       // absolute fret or "header" for open/muted toggle
  svgX: number
  svgY: number
  svgW: number
  svgH: number
}

// Query SVGuitar's rendered SVG to find string x-positions and fret line y-positions.
// Vertical lines (x1≈x2) → string positions. Horizontal lines (y1≈y2) → fret lines.
function computeHitZones(svgEl: SVGElement, startFret: number): HitZone[] {
  const lines = Array.from(svgEl.querySelectorAll<SVGLineElement>("line"))

  const verticalXs = lines
    .filter((l) => Math.abs(parseFloat(l.getAttribute("x1") ?? "0") - parseFloat(l.getAttribute("x2") ?? "1")) < 0.01)
    .map((l) => parseFloat(l.getAttribute("x1") ?? "0"))

  const horizontalYs = lines
    .filter((l) => Math.abs(parseFloat(l.getAttribute("y1") ?? "0") - parseFloat(l.getAttribute("y2") ?? "1")) < 0.01)
    .map((l) => parseFloat(l.getAttribute("y1") ?? "0"))

  if (verticalXs.length < 6 || horizontalYs.length < 2) return []

  const stringXs = [...new Set(verticalXs)].sort((a, b) => a - b).slice(0, 6)
  const allFretYs = [...new Set(horizontalYs)].sort((a, b) => a - b)

  const nutY = allFretYs[0]           // topmost horizontal line = nut
  const fretLineYs = allFretYs.slice(1) // remaining = fret lines (numFrets entries)

  if (fretLineYs.length === 0) return []

  const halfSpacing = (stringXs[1] - stringXs[0]) / 2
  const zones: HitZone[] = []

  // Header zone per string: y from 0 to nutY (tap to toggle open ↔ muted)
  for (let si = 0; si < 6; si++) {
    zones.push({
      stringIndex: si,
      fret: "header",
      svgX: stringXs[si] - halfSpacing,
      svgY: 0,
      svgW: halfSpacing * 2,
      svgH: nutY,
    })
  }

  // Fret cell zones: one rect per (fret row, string)
  for (let fi = 0; fi < fretLineYs.length; fi++) {
    const topY = fi === 0 ? nutY : fretLineYs[fi - 1]
    const botY = fretLineYs[fi]
    const absoluteFret = startFret + fi
    for (let si = 0; si < 6; si++) {
      zones.push({
        stringIndex: si,
        fret: absoluteFret,
        svgX: stringXs[si] - halfSpacing,
        svgY: topY,
        svgW: halfSpacing * 2,
        svgH: botY - topY,
      })
    }
  }

  return zones
}

export function InteractiveChordGrid({
  frets,
  startFret,
  numFrets = 6,
  onFretsChange,
  onStartFretChange,
}: InteractiveChordGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDark, setIsDark] = useState(false)
  const [hitZones, setHitZones] = useState<HitZone[]>([])
  const [overlayViewBox, setOverlayViewBox] = useState("0 0 400 500")
  const [inputTopPx, setInputTopPx] = useState(0)

  // Track dark mode
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"))
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark"))
    )
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])

  // Render SVGuitar and compute overlay hit zones
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const structureColor = isDark ? "#e5e7eb" : "#374151"
    const chord = toSVGuitarChord(frets, startFret, numFrets)

    const chart = new SVGuitarChord(container)
    const { width, height } = chart
      .configure({
        strings: 6,
        frets: numFrets,
        tuning: [],
        color: structureColor,
        fretLabelFontSize: 36,
        fingerSize: 0.85,
        strokeWidth: 1.5,
        barreChordStyle: BarreChordStyle.ARC,
        fixedDiagramPosition: true,
        noPosition: true,
      })
      .chord(chord)
      .draw()

    const svgEl = container.querySelector("svg")
    if (svgEl) {
      svgEl.setAttribute("viewBox", `0 0 ${width} ${height}`)
      svgEl.removeAttribute("width")
      svgEl.removeAttribute("height")
      svgEl.style.width = "100%"
      svgEl.style.maxWidth = "180px"
      svgEl.style.display = "block"

      const zones = computeHitZones(svgEl as SVGElement, startFret)
      setHitZones(zones)
      setOverlayViewBox(`0 0 ${width} ${height}`)

      // Position start fret input at the level of the first fret row center
      const nutZone = zones.find((z) => z.fret === "header")
      const firstFretZone = zones.find((z) => z.fret === startFret)
      if (nutZone && firstFretZone) {
        const firstFretCenterY = nutZone.svgH + firstFretZone.svgH / 2
        const svgRendered = svgEl.getBoundingClientRect()
        const svgViewBoxH = height
        setInputTopPx((firstFretCenterY / svgViewBoxH) * svgRendered.height)
      }
    }

    return () => chart.remove()
  }, [frets, startFret, numFrets, isDark])

  function handleZoneClick(zone: HitZone) {
    const newFrets = [...frets]
    const si = zone.stringIndex
    if (zone.fret === "header") {
      // Toggle open ↔ muted (clears any fretted position)
      newFrets[si] = frets[si] === 0 ? null : 0
    } else {
      const absoluteFret = zone.fret as number
      // Click active fret → mute; click elsewhere → set fret
      newFrets[si] = frets[si] === absoluteFret ? null : absoluteFret
    }
    onFretsChange(newFrets)
  }

  return (
    <div className="flex gap-2 items-start">
      {/* Diagram + click overlay */}
      <div style={{ position: "relative", display: "inline-block" }}>
        <div ref={containerRef} />
        {hitZones.length > 0 && (
          <svg
            viewBox={overlayViewBox}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              overflow: "visible",
            }}
          >
            {hitZones.map((zone, i) => (
              <rect
                key={i}
                x={zone.svgX}
                y={zone.svgY}
                width={zone.svgW}
                height={zone.svgH}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onClick={() => handleZoneClick(zone)}
              />
            ))}
          </svg>
        )}
      </div>

      {/* Start fret input — aligned with first fret row */}
      <input
        type="number"
        min={1}
        max={22}
        value={startFret}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10)
          if (!isNaN(v) && v >= 1 && v <= 22) onStartFretChange(v)
        }}
        style={{ marginTop: `${inputTopPx}px` }}
        className="w-10 rounded border border-border bg-card text-foreground text-sm text-center px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        aria-label="Start fret"
      />
    </div>
  )
}
```

- [ ] **Step 2.2: Commit**

```bash
git add app/(app)/tools/chord-finder/_components/interactive-chord-grid.tsx
git commit -m "feat: add interactive chord grid with SVGuitar + click overlay"
```

---

## Task 3: Client Component + Page

**Files:**
- Create: `app/(app)/tools/chord-finder/_components/chord-finder-client.tsx`
- Modify: `app/(app)/tools/chord-finder/page.tsx`

- [ ] **Step 3.1: Create `chord-finder-client.tsx`**

```tsx
"use client"

import { useState, useMemo } from "react"
import { detectChords, type DetectedChord } from "@/lib/theory/chord-finder"
import { listScaleTypes } from "@/lib/theory/scales"
import { InteractiveChordGrid } from "./interactive-chord-grid"
import { btn } from "@/lib/button-styles"

const ROOT_NOTES = ["Ab", "A", "Bb", "B", "C", "Db", "D", "Eb", "E", "F", "Gb", "G"] as const

const MAJOR_SCALE_MODES = ["Major", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Aeolian", "Locrian"]
const MELODIC_MINOR_MODES = ["Melodic Minor", "Dorian b2", "Lydian Augmented", "Lydian Dominant", "Mixolydian b6", "Locrian #2", "Altered"]
const HARMONIC_MINOR_MODES = ["Harmonic Minor", "Locrian #6", "Ionian #5", "Dorian #4", "Phrygian Dominant", "Lydian #2", "Altered Diminished"]
const PENTATONICS = ["Pentatonic Major", "Pentatonic Minor", "Blues"]
const ALL_GROUPED = new Set([...MAJOR_SCALE_MODES, ...MELODIC_MINOR_MODES, ...HARMONIC_MINOR_MODES, ...PENTATONICS])

const SCALE_LABEL: Record<string, string> = {
  "Major": "Ionian (major)",
  "Aeolian": "Aeolian (natural minor)",
  "Pentatonic Major": "Major Pentatonic",
  "Pentatonic Minor": "Minor Pentatonic",
}

const INITIAL_FRETS: (number | null)[] = [null, null, null, null, null, null]

function qualityDescription(chord: DetectedChord): string {
  const q = chord.quality
  if (!q || q === "M") return "major"
  if (q === "m" || q === "min" || q === "-") return "minor"
  if (q === "dim" || q === "o" || q === "°") return "diminished"
  if (q === "aug" || q === "+") return "augmented"
  if (q === "maj7" || q === "M7" || q === "Δ7") return "major 7th"
  if (q === "m7" || q === "min7" || q === "-7") return "minor 7th"
  if (q === "7" || q === "dom") return "dominant 7th"
  if (q === "dim7" || q === "o7") return "diminished 7th"
  if (q === "m7b5" || q === "ø" || q === "ø7") return "half diminished"
  return q
}

function positionLabel(chord: DetectedChord): string {
  return chord.isRootPosition ? "root position" : "inversion"
}

export function ChordFinderClient() {
  const [frets, setFrets] = useState<(number | null)[]>(INITIAL_FRETS)
  const [startFret, setStartFret] = useState(1)
  const [filterKey, setFilterKey] = useState("")
  const [filterScale, setFilterScale] = useState("")

  const scaleTypes = useMemo(() => listScaleTypes(), [])
  const majorModes = useMemo(() => MAJOR_SCALE_MODES.filter((t) => scaleTypes.includes(t)), [scaleTypes])
  const melodicMinorModes = useMemo(() => MELODIC_MINOR_MODES.filter((t) => scaleTypes.includes(t)), [scaleTypes])
  const harmonicMinorModes = useMemo(() => HARMONIC_MINOR_MODES.filter((t) => scaleTypes.includes(t)), [scaleTypes])
  const pentatonics = useMemo(() => PENTATONICS.filter((t) => scaleTypes.includes(t)), [scaleTypes])
  const otherTypes = useMemo(() => scaleTypes.filter((t) => !ALL_GROUPED.has(t)), [scaleTypes])

  const chords = useMemo(
    () =>
      detectChords(frets, {
        key: filterKey || undefined,
        scaleType: filterScale || undefined,
      }),
    [frets, filterKey, filterScale],
  )

  const allMuted = frets.every((f) => f === null)

  return (
    <div className="space-y-4">
      {/* Key/scale filter — always visible */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="cf-root-select">
            Root
          </label>
          <select
            id="cf-root-select"
            value={filterKey}
            onChange={(e) => setFilterKey(e.target.value)}
            className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
          >
            <option value="">Any</option>
            {ROOT_NOTES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="cf-scale-select">
            Scale
          </label>
          <select
            id="cf-scale-select"
            value={filterScale}
            onChange={(e) => setFilterScale(e.target.value)}
            className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
          >
            <option value="">Any</option>
            <optgroup label="Modes of the Major scale">
              {majorModes.map((t) => <option key={t} value={t}>{SCALE_LABEL[t] ?? t}</option>)}
            </optgroup>
            <optgroup label="Modes of the Melodic Minor scale">
              {melodicMinorModes.map((t) => <option key={t} value={t}>{SCALE_LABEL[t] ?? t}</option>)}
            </optgroup>
            <optgroup label="Modes of the Harmonic Minor scale">
              {harmonicMinorModes.map((t) => <option key={t} value={t}>{SCALE_LABEL[t] ?? t}</option>)}
            </optgroup>
            <optgroup label="Pentatonics">
              {pentatonics.map((t) => <option key={t} value={t}>{SCALE_LABEL[t] ?? t}</option>)}
            </optgroup>
            {otherTypes.length > 0 && (
              <optgroup label="Other">
                {otherTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </optgroup>
            )}
          </select>
        </div>

        {(filterKey || filterScale) && (
          <button
            onClick={() => { setFilterKey(""); setFilterScale("") }}
            className={btn("standalone", "sm")}
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Main: grid left, results right */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left: chord diagram + clear button */}
        <div className="flex-shrink-0 flex flex-col gap-3">
          <InteractiveChordGrid
            frets={frets}
            startFret={startFret}
            onFretsChange={setFrets}
            onStartFretChange={setStartFret}
          />
          <button onClick={() => setFrets(INITIAL_FRETS)} className={btn("standalone", "sm")}>
            Clear
          </button>
        </div>

        {/* Right: results */}
        <div className="flex-1 min-w-0 pt-1">
          {allMuted ? (
            <p className="text-sm text-muted-foreground">Place dots on the diagram to identify chords.</p>
          ) : chords.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No chords found{filterKey && filterScale ? ` in ${filterKey} ${filterScale}` : ""}.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {chords.map((chord, i) => (
                <div key={i} className="flex items-baseline gap-2 py-2">
                  <span className="font-medium text-foreground text-sm w-16 shrink-0">{chord.symbol}</span>
                  <span className="text-xs text-muted-foreground">{qualityDescription(chord)}</span>
                  <span className="text-xs text-muted-foreground ml-auto shrink-0">
                    {positionLabel(chord)}
                    {chord.degreeLabel && (
                      <span className="ml-2 font-mono text-accent">{chord.degreeLabel}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3.2: Update `app/(app)/tools/chord-finder/page.tsx`**

Replace the entire file with:

```tsx
import Link from "next/link"
import { ChordFinderClient } from "./_components/chord-finder-client"

export default function ChordFinderPage() {
  return (
    <div className="pt-6">
      <Link
        href="/tools"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
      >
        ← Tools
      </Link>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Chord Finder</h1>
      <ChordFinderClient />
    </div>
  )
}
```

- [ ] **Step 3.3: Commit**

```bash
git add app/(app)/tools/chord-finder/_components/chord-finder-client.tsx app/(app)/tools/chord-finder/page.tsx
git commit -m "feat: chord finder UI — interactive grid, filter bar, results panel"
```

---

## Task 4: TypeScript Check

**Files:** none (verification only)

- [ ] **Step 4.1: Run TypeScript compiler**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors. Common errors and fixes:

- **`Chord.detect` types**: if tonal types aren't matching, add `as string[]` assertion on the return value
- **`Note.chroma` returning `undefined`**: the guard `c !== undefined && c !== null` handles this — if TS still complains, cast: `(Note.chroma(n) as number | undefined)`
- **SVGuitar `Chord` type**: `fingers` expects `Finger[]`; the `as const` tuple cast in `toSVGuitarChord` should satisfy it — if not, cast with `as Finger[]` after the map
- **`noPosition` not in SVGuitar types**: check svguitar type definitions. If the property isn't typed, add `// @ts-expect-error — noPosition exists at runtime` above the property

- [ ] **Step 4.2: Fix any TypeScript errors, then commit if changes were needed**

```bash
git add -A
git commit -m "fix: TypeScript errors in chord finder"
```

---

## Manual Verification Checklist

After implementation, verify in the browser:

- [ ] Clicking a fret places a dot; clicking again removes it
- [ ] Clicking the header row toggles ○ / ×
- [ ] The start fret input at position 1 (nut) shows no number (SVGuitar default); changing it to 5 shows "5fr" equivalent and the grid shifts
- [ ] C shape (x-3-2-0-1-0): first result is "C" / "CM", root position
- [ ] Am shape (x-0-2-2-1-0): first result is "Am", root position  
- [ ] Enabling C Major filter narrows results to diatonic chords with Roman numeral degree labels
- [ ] "Any" in either filter dropdown disables filtering
- [ ] "Clear" button resets all dots
- [ ] "Clear filter" button resets both dropdowns to "Any"
- [ ] Works in dark mode (diagram colors update, grid click zones still work)
