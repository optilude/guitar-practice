# Chord SVGuitar Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `@tombatossals/react-chords` with SVGuitar in `ChordPanel`, add a Show dropdown (Fingers/Notes/Intervals) that colours and labels chord dots by interval degree, then remove the react-chords package entirely.

**Architecture:** The shared `ChordDiagram` component (already in `chord-diagram.tsx`) is reused — no new components needed. A `toSVGChord()` conversion function translates `ChordPosition` (chords-db format) to SVGuitar's `Chord` type, matching each sounding string's pitch class against the chord's tones to determine colour and label. Shell chord types use their base Tonal chord symbol to derive note/interval data for the Show modes.

**Tech Stack:** SVGuitar 2.5.1 · Tonal 6.4.3 · @tombatossals/chords-db 0.5.1 · Vitest · React Testing Library

---

## File Map

| Action | Path |
|--------|------|
| Modify | `app/(app)/reference/_components/chord-panel.tsx` |
| Modify | `__tests__/reference/chord-panel.test.tsx` |
| Modify | `__tests__/reference/triad-panel.test.tsx` |
| Modify | `package.json` (via pnpm) |
| Delete | `types/react-chords.d.ts` |

---

### Task 1: Update chord-panel tests to expect SVGuitar/ChordDiagram

**Files:**
- Modify: `__tests__/reference/chord-panel.test.tsx`

- [ ] **Step 1: Replace the react-chords mock with a ChordDiagram mock, and add a Show-dropdown test**

Open `__tests__/reference/chord-panel.test.tsx` and replace its entire content with:

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

// Mock ChordDiagram (SVGuitar, imperative DOM — not renderable in jsdom)
vi.mock("@/app/(app)/reference/_components/chord-diagram", () => ({
  ChordDiagram: () => <div data-testid="chord-diagram" />,
}))

// Mock AddToGoalButton to avoid next-auth import chain
vi.mock("@/components/add-to-goal-button", () => ({
  AddToGoalButton: () => null,
}))

// Mock theory engine
vi.mock("@/lib/theory", () => ({
  listChordTypes: () => ["maj", "m", "7", "maj7"],
  listChordDbSuffixes: () => ["major", "minor", "7", "maj7"],
  SHELL_CHORD_TYPES: ["maj7 shell", "m7 shell", "7 shell", "maj6 shell", "dim7/m6 shell"],
  getChord: (tonic: string, type: string) => ({
    tonic,
    type,
    notes: ["C", "E", "G"],
    intervals: ["1P", "3M", "5P"],
    voicings: [],
  }),
  getChordPositions: () => [
    {
      frets: [-1, 3, 2, 0, 1, 0],
      fingers: [0, 3, 2, 0, 1, 0],
      baseFret: 1,
      barres: [],
      capo: false,
      label: "Open",
    },
    {
      frets: [1, 1, 3, 3, 3, 1],
      fingers: [1, 1, 2, 3, 4, 1],
      baseFret: 3,
      barres: [1],
      capo: true,
      label: "Barre – 3fr",
    },
  ],
  getShellChordPositions: () => [
    { frets: [2, 1, 3, -1, -1, -1], fingers: [0, 0, 0, 0, 0, 0], baseFret: 7, barres: [], capo: false, label: "6th string root" },
    { frets: [-1, 2, 1, 3, -1, -1], fingers: [0, 0, 0, 0, 0, 0], baseFret: 2, barres: [], capo: false, label: "5th string root" },
    { frets: [-1, -1, 2, 1, 4, -1], fingers: [0, 0, 0, 0, 0, 0], baseFret: 9, barres: [], capo: false, label: "4th string root" },
  ],
  getChordAsScale: (_tonic: string, _type: string) => ({
    tonic: "C",
    type: "maj",
    notes: ["C", "E", "G"],
    intervals: ["1P", "3M", "5P"],
    positions: [{ label: "Position 1", positions: [{ string: 6, fret: 8, interval: "R" }] }],
  }),
}))

import { ChordPanel } from "@/app/(app)/reference/_components/chord-panel"

describe("ChordPanel", () => {
  it("renders the chord type selector with all types", () => {
    render(<ChordPanel root="C" onRootChange={vi.fn()} />)
    const select = screen.getByLabelText(/chord type/i)
    expect(select).toBeDefined()
    expect(screen.getByRole("option", { name: "major" })).toBeDefined()
    expect(screen.getByRole("option", { name: "minor" })).toBeDefined()
    expect(screen.getByRole("option", { name: "7" })).toBeDefined()
  })

  it("shows the notes string", () => {
    render(<ChordPanel root="C" onRootChange={vi.fn()} />)
    expect(screen.getByText(/Notes: C – E – G/)).toBeDefined()
  })

  it("renders a diagram for each voicing position", () => {
    render(<ChordPanel root="C" onRootChange={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: /fingerings/i }))
    const diagrams = screen.getAllByTestId("chord-diagram")
    expect(diagrams).toHaveLength(2)
  })

  it("changes chord type when selector changes", () => {
    render(<ChordPanel root="C" onRootChange={vi.fn()} />)
    const select = screen.getByLabelText(/chord type/i) as HTMLSelectElement
    fireEvent.change(select, { target: { value: "minor" } })
    expect(select.value).toBe("minor")
  })

  it("does not render a voicing dropdown", () => {
    render(<ChordPanel root="C" onRootChange={vi.fn()} />)
    expect(screen.queryByLabelText(/voicing/i)).toBeNull()
  })

  it("renders shell chord type options in the selector", () => {
    render(<ChordPanel root="C" onRootChange={vi.fn()} />)
    expect(screen.getByRole("option", { name: "maj7 shell" })).toBeDefined()
    expect(screen.getByRole("option", { name: "m7 shell" })).toBeDefined()
    expect(screen.getByRole("option", { name: "7 shell" })).toBeDefined()
    expect(screen.getByRole("option", { name: "maj6 shell" })).toBeDefined()
    expect(screen.getByRole("option", { name: "dim7/m6 shell" })).toBeDefined()
  })

  it("shows formula when a shell chord type is selected", () => {
    render(<ChordPanel root="C" onRootChange={vi.fn()} />)
    const select = screen.getByLabelText(/chord type/i) as HTMLSelectElement
    fireEvent.change(select, { target: { value: "maj7 shell" } })
    expect(screen.getByText(/Formula: 1 – 3 – 7/)).toBeDefined()
  })

  it("renders three diagrams for a shell chord type", () => {
    render(<ChordPanel root="C" onRootChange={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: /fingerings/i }))
    const select = screen.getByLabelText(/chord type/i) as HTMLSelectElement
    fireEvent.change(select, { target: { value: "maj7 shell" } })
    const diagrams = screen.getAllByTestId("chord-diagram")
    expect(diagrams).toHaveLength(3)
  })

  it("renders a fretboard container in default state", () => {
    render(<ChordPanel root="C" onRootChange={vi.fn()} />)
    expect(screen.getByTestId("fretboard-viewer")).toBeDefined()
  })

  it("renders the show-intervals checkbox", () => {
    render(<ChordPanel root="C" onRootChange={vi.fn()} />)
    const checkbox = screen.getByRole("checkbox", { name: /show intervals/i })
    expect(checkbox).toBeDefined()
  })

  it("renders the root selector with alphabetical enharmonic options", () => {
    render(<ChordPanel root="C" onRootChange={vi.fn()} />)
    const select = screen.getByLabelText(/^root$/i) as HTMLSelectElement
    expect(select).toBeDefined()
    expect(screen.getByRole("option", { name: "Ab" })).toBeDefined()
    expect(screen.getByRole("option", { name: "A#" })).toBeDefined()
    expect(screen.getByRole("option", { name: "Bb" })).toBeDefined()
    expect(screen.getByRole("option", { name: "G#" })).toBeDefined()
  })

  it("initialises root to the prop and calls onRootChange when changed", () => {
    const onRootChange = vi.fn()
    render(<ChordPanel root="G" onRootChange={onRootChange} />)
    const select = screen.getByLabelText(/^root$/i) as HTMLSelectElement
    expect(select.value).toBe("G")
    fireEvent.change(select, { target: { value: "D" } })
    expect(onRootChange).toHaveBeenCalledWith("D")
  })

  it("renders a Show dropdown with Fingers/Notes/Intervals options in fingerings view", () => {
    render(<ChordPanel root="C" onRootChange={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: /fingerings/i }))
    const showSelect = screen.getByLabelText(/^show$/i) as HTMLSelectElement
    expect(showSelect).toBeDefined()
    expect(screen.getByRole("option", { name: "Fingers" })).toBeDefined()
    expect(screen.getByRole("option", { name: "Notes" })).toBeDefined()
    expect(screen.getByRole("option", { name: "Intervals" })).toBeDefined()
    expect(showSelect.value).toBe("fingers")
  })
})
```

- [ ] **Step 2: Run the tests — they should fail**

```bash
pnpm test:run __tests__/reference/chord-panel.test.tsx
```

Expected output: several failures because `chord-panel.tsx` still imports from react-chords and does not export the Show dropdown or use ChordDiagram. The test for "renders a diagram for each voicing position" will fail because `vi.mock` for the chord-diagram path has no effect yet on the react-chords import.

---

### Task 2: Migrate chord-panel.tsx to SVGuitar

**Files:**
- Modify: `app/(app)/reference/_components/chord-panel.tsx`

- [ ] **Step 1: Replace the file content with the migrated version**

Replace `app/(app)/reference/_components/chord-panel.tsx` with:

```tsx
"use client"

import { useState, useMemo, useEffect } from "react"
import {
  getChord, listChordDbSuffixes, getChordPositions,
  SHELL_CHORD_TYPES, getShellChordPositions,
  getChordAsScale,
} from "@/lib/theory"
import { Note } from "tonal"
import { type Chord as SVGChord, OPEN, SILENT, type Finger, type FingerOptions, type Barre } from "svguitar"
import { INTERVAL_DEGREE_COLORS } from "@/lib/rendering/tab"
import { ChordDiagram } from "./chord-diagram"
import { FretboardViewer } from "./fretboard-viewer"
import {
  getArpeggioBoxSystems,
  CHORD_TYPE_TO_SCALE,
  CAGED_BOX_LABELS,
} from "@/lib/rendering/fretboard"
import type { BoxSystem } from "@/lib/rendering/fretboard"
import { cn } from "@/lib/utils"
import { AddToGoalButton } from "@/components/add-to-goal-button"
import { defaultModeForChordType, getSoloScales } from "@/lib/theory/solo-scales"
import { SoloScalesPanel } from "./solo-scales-panel"
import type { ChordPosition } from "@/lib/theory/chords"

// ---------------------------------------------------------------------------
// SVGuitar conversion helpers
// ---------------------------------------------------------------------------

// Open-string chroma values (C=0 … B=11), index 0 = str6 (low E), index 5 = str1 (high e)
const OPEN_CHROMA = [4, 9, 2, 7, 11, 4] as const

const ROOT_COLOR = "#d97706" // amber-600

// Maps shell chord display types → base Tonal symbol for note/interval lookup
const SHELL_TONAL_TYPE: Record<string, string> = {
  "maj7 shell": "maj7",
  "m7 shell":   "m7",
  "7 shell":    "7",
  "maj6 shell": "6",
  "dim7/m6 shell": "m6",
}

type ShowMode = "fingers" | "notes" | "intervals"

function degreeToColor(degree: string): string {
  if (degree === "R" || degree === "1") return ROOT_COLOR
  if (degree === "3"  || degree === "b3" || degree === "#3")  return INTERVAL_DEGREE_COLORS.third
  if (degree === "5"  || degree === "b5" || degree === "#5")  return INTERVAL_DEGREE_COLORS.fifth
  if (degree === "7"  || degree === "b7")                     return INTERVAL_DEGREE_COLORS.seventh
  if (degree === "6"  || degree === "b6")                     return INTERVAL_DEGREE_COLORS.sixth
  if (degree === "9"  || degree === "b9" || degree === "#9")  return INTERVAL_DEGREE_COLORS.second
  if (degree === "11" || degree === "#11")                    return INTERVAL_DEGREE_COLORS.fourth
  if (degree === "13" || degree === "b13")                    return INTERVAL_DEGREE_COLORS.sixth
  return ROOT_COLOR
}

function toSVGChord(
  pos: ChordPosition,
  showMode: ShowMode,
  isDark: boolean,
  chordNotes: string[],
  chordIntervals: string[],
): SVGChord {
  const chordChromas = chordNotes.map((n) => Note.get(n).chroma ?? -1)
  const fingers: Finger[] = []

  pos.frets.forEach((relativeFret, idx) => {
    const str = 6 - idx

    if (relativeFret === -1) {
      fingers.push([str, SILENT])
      return
    }

    const absFret = relativeFret === 0 ? 0 : relativeFret + pos.baseFret - 1
    const chroma  = (OPEN_CHROMA[idx] + absFret) % 12
    const matchIdx = chordChromas.indexOf(chroma)

    let options: FingerOptions | undefined
    if (matchIdx >= 0) {
      const iv      = chordIntervals[matchIdx]
      const degree  = INTERVAL_TO_DEGREE[iv] ?? iv
      const color   = degreeToColor(degree)
      const text    = showMode === "notes"     ? chordNotes[matchIdx]
                    : showMode === "intervals" ? degree
                    : undefined
      const textColor = relativeFret === 0 ? (isDark ? "#f9fafb" : "#1f2937") : "#ffffff"
      options = { color, textColor, text }
    }

    if (relativeFret === 0) fingers.push([str, OPEN, options])
    else                    fingers.push([str, relativeFret, options])
  })

  // Barre arcs
  const svgBarres: Barre[] = []
  for (const barreFret of pos.barres) {
    const participatingIdxs = pos.frets
      .map((f, i) => ({ f, i }))
      .filter(({ f }) => f === barreFret)
      .map(({ i }) => i)
    if (participatingIdxs.length > 1) {
      const minIdx = Math.min(...participatingIdxs)
      const maxIdx = Math.max(...participatingIdxs)
      svgBarres.push({ fret: barreFret, fromString: 6 - maxIdx, toString: 6 - minIdx })
    }
  }

  return {
    fingers,
    barres: svgBarres,
    position: pos.baseFret > 1 ? pos.baseFret : undefined,
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COMMON_TYPES = ["major", "maj7", "minor", "m7", "7", "9", "dim", "dim7", "m7b5"]

const INTERVAL_TO_DEGREE: Record<string, string> = {
  "1P": "R",
  "2m": "b9", "2M": "9",  "2A": "#9",
  "3m": "b3", "3M": "3",
  "4P": "4",  "4A": "#4",
  "5d": "b5", "5P": "5",  "5A": "#5",
  "6m": "b6", "6M": "6",
  "7m": "b7", "7M": "7",
  "8P": "8",
  "9m": "b9", "9M": "9",  "9A": "#9",
  "11P": "11", "11A": "#11",
  "13m": "b13", "13M": "13",
}

function intervalsToFormula(intervals: string[]): string {
  return intervals.map((iv) => INTERVAL_TO_DEGREE[iv] ?? iv).join(" – ")
}

const SHELL_FORMULA: Record<string, string> = {
  "maj7 shell":    "1 – 3 – 7",
  "m7 shell":      "1 – b3 – b7",
  "7 shell":       "1 – 3 – b7",
  "maj6 shell":    "1 – 3 – 6",
  "dim7/m6 shell": "1 – b3 – 6",
}

const ROOT_NOTES = [
  "Ab", "A", "A#", "Bb", "B", "C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#",
]

const BOX_SYSTEM_LABELS: Record<BoxSystem, string> = {
  none:       "All notes",
  caged:      "CAGED",
  "3nps":     "3NPS",
  pentatonic: "Pentatonic boxes",
  windows:    "Position windows",
}

const SOLO_MODE_OPTIONS = [
  { value: "ionian",        label: "Ionian" },
  { value: "dorian",        label: "Dorian" },
  { value: "phrygian",      label: "Phrygian" },
  { value: "lydian",        label: "Lydian" },
  { value: "mixolydian",    label: "Mixolydian" },
  { value: "aeolian",       label: "Aeolian" },
  { value: "locrian",       label: "Locrian" },
  { value: "melodic minor", label: "Melodic Minor" },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ChordPanelProps {
  root: string
  onRootChange: (root: string) => void
  chordTypeTrigger?: { type: string } | null
  onScaleSelect?: (tonic: string, scaleName: string) => void
}

export function ChordPanel({ root, onRootChange, chordTypeTrigger, onScaleSelect }: ChordPanelProps) {
  const dbSuffixes = useMemo(() => listChordDbSuffixes(), [])
  const commonSuffixes = useMemo(
    () => COMMON_TYPES.filter((t) => dbSuffixes.includes(t)),
    [dbSuffixes],
  )
  const otherSuffixes = useMemo(
    () => dbSuffixes.filter((t) => !COMMON_TYPES.includes(t)),
    [dbSuffixes],
  )
  const [chordType, setChordType] = useState(COMMON_TYPES[0])

  useEffect(() => {
    if (chordTypeTrigger) setChordType(chordTypeTrigger.type)
  }, [chordTypeTrigger]) // eslint-disable-line react-hooks/exhaustive-deps

  const [viewMode, setViewMode]
     = useState<"fretboard" | "fingerings" | "soloing">("fretboard")
  const [soloingMode, setSoloingMode] = useState(() => defaultModeForChordType(COMMON_TYPES[0]))

  useEffect(() => {
    setSoloingMode(defaultModeForChordType(chordType))
  }, [chordType]) // eslint-disable-line react-hooks/exhaustive-deps

  const [labelMode, setLabelMode] = useState<"note" | "interval">("interval")
  const [boxSystem, setBoxSystem] = useState<BoxSystem>("none")
  const [boxIndex, setBoxIndex]   = useState(0)
  const [showMode, setShowMode]   = useState<ShowMode>("fingers")
  const [isDark, setIsDark]       = useState(false)

  // Track dark-mode class on <html> so diagrams re-render when theme changes.
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"))
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  const chordScale = useMemo(
    () => getChordAsScale(root, chordType),
    [root, chordType]
  )
  const availableBoxSystems = useMemo(
    () => getArpeggioBoxSystems(chordScale.type),
    [chordScale.type]
  )
  const parentScaleType = CHORD_TYPE_TO_SCALE[chordScale.type]
  const boxCount = useMemo(() => {
    if (boxSystem === "caged")   return CAGED_BOX_LABELS.length
    if (boxSystem === "3nps")    return 7
    if (boxSystem === "windows") return chordScale.positions.length
    return 0
  }, [boxSystem, chordScale.positions.length])
  const safeBoxIndex = boxIndex < boxCount ? boxIndex : 0

  const isShell = (SHELL_CHORD_TYPES as readonly string[]).includes(chordType)

  const soloScales = useMemo(
    () => getSoloScales({ tonic: root, type: chordType, degree: 1 }, soloingMode),
    [root, chordType, soloingMode]
  )

  const chord = useMemo(
    () => isShell ? null : getChord(root, chordType),
    [root, chordType, isShell]
  )
  const positions = useMemo(
    () => isShell
      ? getShellChordPositions(root, chordType)
      : getChordPositions(root, chordType),
    [root, chordType, isShell]
  )

  // Chord tones for the Show dropdown (Notes/Intervals modes).
  // For shell types: look up the base chord via SHELL_TONAL_TYPE to get notes/intervals.
  const { chordNotes, chordIntervals } = useMemo(() => {
    if (isShell) {
      const baseType = SHELL_TONAL_TYPE[chordType]
      if (!baseType) return { chordNotes: [], chordIntervals: [] }
      const info = getChord(root, baseType)
      return { chordNotes: info.notes, chordIntervals: info.intervals }
    }
    return { chordNotes: chord?.notes ?? [], chordIntervals: chord?.intervals ?? [] }
  }, [root, chordType, isShell, chord])

  return (
    <div className="space-y-4">
      {/* Root + Chord type selectors */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="chord-root-select">
            Root
          </label>
          <select
            id="chord-root-select"
            aria-label="Root"
            value={root}
            onChange={(e) => onRootChange(e.target.value)}
            className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
          >
            {ROOT_NOTES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="chord-type-select">
            Chord type
          </label>
          <select
            id="chord-type-select"
            value={chordType}
            onChange={(e) => {
              const newType = e.target.value
              setChordType(newType)
              setBoxIndex(0)
              const newScale = getChordAsScale(root, newType)
              const newSystems = getArpeggioBoxSystems(newScale.type)
              if (!newSystems.includes(boxSystem)) setBoxSystem("none")
            }}
            className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
          >
            <optgroup label="Common">
              {commonSuffixes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </optgroup>
            <optgroup label="Shell Voicings">
              {SHELL_CHORD_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </optgroup>
            <optgroup label="Other">
              {otherSuffixes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </optgroup>
          </select>
        </div>
        <AddToGoalButton
          kind="chord"
          subtype={chordType}
          defaultKey={root}
          displayName={`${root}${chordType} chord`}
        />
      </div>

      {/* Notes + formula */}
      {isShell ? (
        <p className="text-xs text-muted-foreground">
          Formula: {SHELL_FORMULA[chordType]}
        </p>
      ) : (
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground">
            Notes: {chord?.notes.join(" – ")}
          </p>
          <p className="text-xs text-muted-foreground">
            Formula: {chord ? intervalsToFormula(chord.intervals) : ""}
          </p>
        </div>
      )}

      {/* View mode toggle */}
      <div className="flex rounded border border-border overflow-hidden text-sm w-fit">
        <button
          onClick={() => setViewMode("fretboard")}
          className={cn(
            "px-3 py-1.5 transition-colors",
            viewMode === "fretboard"
              ? "bg-accent text-accent-foreground"
              : "bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          Fretboard
        </button>
        <button
          onClick={() => setViewMode("fingerings")}
          className={cn(
            "px-3 py-1.5 transition-colors border-l border-border",
            viewMode === "fingerings"
              ? "bg-accent text-accent-foreground"
              : "bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          Fingerings
        </button>
        <button
          onClick={() => setViewMode("soloing")}
          className={cn(
            "px-3 py-1.5 transition-colors border-l border-border",
            viewMode === "soloing"
              ? "bg-accent text-accent-foreground"
              : "bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          Soloing
        </button>
      </div>

      {/* Fretboard controls + viewer */}
      {viewMode === "fretboard" && (
        <>
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-wrap gap-3 items-end">
              {availableBoxSystems.length > 1 && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground" htmlFor="chord-box-system-select">
                      Highlight
                    </label>
                    <select
                      id="chord-box-system-select"
                      value={boxSystem}
                      onChange={(e) => {
                        setBoxSystem(e.target.value as BoxSystem)
                        setBoxIndex(0)
                      }}
                      className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      {availableBoxSystems.map((s) => (
                        <option key={s} value={s}>{BOX_SYSTEM_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>

                  {boxSystem !== "none" && boxCount > 0 && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground" htmlFor="chord-box-index-select">
                        Box
                      </label>
                      <select
                        id="chord-box-index-select"
                        value={safeBoxIndex}
                        onChange={(e) => setBoxIndex(Number(e.target.value))}
                        className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        {Array.from({ length: boxCount }, (_, i) => (
                          <option key={i} value={i}>
                            {boxSystem === "caged"
                              ? `${CAGED_BOX_LABELS[i]} shape`
                              : `Position ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={labelMode === "interval"}
                onChange={(e) => setLabelMode(e.target.checked ? "interval" : "note")}
                className="accent-accent"
              />
              Show intervals
            </label>
          </div>

          <FretboardViewer
            scale={chordScale}
            boxSystem={boxSystem}
            boxIndex={safeBoxIndex}
            labelMode={labelMode}
            boxScaleType={parentScaleType}
          />
        </>
      )}

      {/* Fingerings */}
      {viewMode === "fingerings" && (
        positions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No voicings available for this chord type.</p>
        ) : (
          <>
            {/* Show dropdown */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="chord-show-select">
                Show
              </label>
              <select
                id="chord-show-select"
                value={showMode}
                onChange={(e) => setShowMode(e.target.value as ShowMode)}
                className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
              >
                <option value="fingers">Fingers</option>
                <option value="notes">Notes</option>
                <option value="intervals">Intervals</option>
              </select>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-6">
              {positions.map((pos, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground text-center">{pos.label}</span>
                  <ChordDiagram
                    numFrets={4}
                    chord={toSVGChord(pos, showMode, isDark, chordNotes, chordIntervals)}
                  />
                </div>
              ))}
            </div>
          </>
        )
      )}

      {/* Soloing */}
      {viewMode === "soloing" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="chord-solo-mode-select">
              Modal context
            </label>
            <select
              id="chord-solo-mode-select"
              value={soloingMode}
              onChange={(e) => setSoloingMode(e.target.value)}
              className="bg-card border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent w-fit"
            >
              {SOLO_MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <SoloScalesPanel
            scales={soloScales}
            chordName={`${root}${chordType}`}
            onScaleSelect={onScaleSelect}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run the chord-panel tests — they should pass**

```bash
pnpm test:run __tests__/reference/chord-panel.test.tsx
```

Expected output: all tests pass, including the new "renders a Show dropdown" test.

- [ ] **Step 3: Run the full test suite to check for regressions**

```bash
pnpm test:run
```

Expected output: all tests pass. (The triad-panel test still has an unused react-chords mock — that's harmless and fixed in Task 3.)

- [ ] **Step 4: Commit**

```bash
git add app/(app)/reference/_components/chord-panel.tsx __tests__/reference/chord-panel.test.tsx
git commit -m "feat: migrate chord fingerings from react-chords to SVGuitar with Show dropdown"
```

---

### Task 3: Remove the leftover react-chords mock from triad-panel tests

**Files:**
- Modify: `__tests__/reference/triad-panel.test.tsx`

- [ ] **Step 1: Remove the dead mock (lines 4–6)**

Open `__tests__/reference/triad-panel.test.tsx`. Delete the block:

```typescript
vi.mock("@tombatossals/react-chords/lib/Chord", () => ({
  default: () => <svg data-testid="chord-diagram" />,
}))
```

(It appears at the top of the file, just before the AddToGoalButton mock.)

- [ ] **Step 2: Run triad-panel tests to confirm nothing broke**

```bash
pnpm test:run __tests__/reference/triad-panel.test.tsx
```

Expected output: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add __tests__/reference/triad-panel.test.tsx
git commit -m "chore: remove unused react-chords mock from triad-panel tests"
```

---

### Task 4: Remove react-chords package and type declarations

**Files:**
- Modify: `package.json` (via pnpm)
- Delete: `types/react-chords.d.ts`

- [ ] **Step 1: Uninstall the package**

```bash
pnpm remove @tombatossals/react-chords
```

Expected output: `@tombatossals/react-chords` removed from `package.json` and `pnpm-lock.yaml`.

- [ ] **Step 2: Delete the type declaration file**

```bash
rm types/react-chords.d.ts
```

- [ ] **Step 3: Run the full test suite to verify nothing broke**

```bash
pnpm test:run
```

Expected output: all tests pass. TypeScript should not error on the deleted type file since nothing imports it anymore.

- [ ] **Step 4: Verify no remaining references to react-chords**

```bash
grep -r "react-chords" . --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=".next"
```

Expected output: no matches (or only matches in docs/plans/specs — those are fine).

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: remove @tombatossals/react-chords dependency"
```

---

## Self-Review

**Spec coverage:**
- ✅ Migrate ChordPanel fingerings to SVGuitar → Task 2
- ✅ Shared `ChordDiagram` component reused → Task 2 (imports `ChordDiagram`, passes `numFrets={4}`)
- ✅ Show dropdown (Fingers/Notes/Intervals) → Task 2 (state, dropdown JSX, `toSVGChord` text/colour logic)
- ✅ Colour scheme matches fretboard (root=amber, 3rd=green, 5th=blue, 7th=purple, 9th=yellow, 11th=rose, 13th=cyan) → `degreeToColor` in Task 2
- ✅ Barre arc support → `svgBarres` computation in `toSVGChord`, Task 2
- ✅ Dark mode open-string text colour → `isDark` state + `MutationObserver` + `textColor` logic in Task 2
- ✅ Shell chords: Notes/Intervals via `SHELL_TONAL_TYPE` lookup → `chordNotes`/`chordIntervals` memo in Task 2
- ✅ Update chord-panel tests → Task 1
- ✅ Remove react-chords mock from triad-panel tests → Task 3
- ✅ Remove `@tombatossals/react-chords` → Task 4
- ✅ Delete `types/react-chords.d.ts` → Task 4

**Placeholder scan:** No TBDs or incomplete steps found.

**Type consistency:**
- `ChordPosition` imported from `@/lib/theory/chords` — matches what `getChordPositions()` and `getShellChordPositions()` return
- `SVGChord`, `Finger`, `FingerOptions`, `Barre` all imported from `"svguitar"` — consistent across `toSVGChord` definition and return type
- `ShowMode` defined once, used in state and `toSVGChord` signature
- `INTERVAL_TO_DEGREE` defined in the same file, used in `toSVGChord` — consistent
- `chordNotes: string[]`, `chordIntervals: string[]` from memo match `toSVGChord` parameter types
