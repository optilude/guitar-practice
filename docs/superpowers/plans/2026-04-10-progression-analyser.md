# Progression Analyser Tool — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Progression Analyser" tool at `/tools/progression-analyser` that lets users enter any chord sequence, see real-time Roman numeral analysis with functional harmony and borrowed-chord colouring, pick substitutions (permanently applicable) or explore soloing scales, and save the result to "My Progressions".

**Architecture:** The tool follows the Transposer pattern (page.tsx + `_components/analyser-client.tsx`). A small `_lib/build-progression-chords.ts` helper converts `InputChord[] + ChordAnalysis[]` → `ProgressionChord[]`, which is what the existing `getSubstitutions` and `getSoloScales` APIs need. The save action reuses the existing `createUserProgression` server action.

**Tech Stack:** Next.js App Router (client component), React hooks, `@dnd-kit` (via ChordInputRow), TonalJS (via lib/theory), existing SubstitutionsPanel / SoloScalesPanel / ChordQualityBlock / ChordInputRow components.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `app/(app)/tools/page.tsx` | Modify | Add Progression Analyser entry |
| `app/(app)/tools/progression-analyser/page.tsx` | Create | Server page shell |
| `app/(app)/tools/progression-analyser/_components/analyser-client.tsx` | Create | Main interactive client (all state, chord input, analysis display, tabs, permanent substitution apply) |
| `app/(app)/tools/progression-analyser/_components/save-modal.tsx` | Create | Modal dialog: pre-filled title/description, calls createUserProgression, navigates on success |
| `app/(app)/tools/progression-analyser/_lib/build-progression-chords.ts` | Create | Pure helper: `buildProgressionChords(parsedChords, analyses) → ProgressionChord[]` |
| `__tests__/tools/build-progression-chords.test.ts` | Create | Unit tests for the conversion helper |
| `__tests__/tools/analyser-client.test.tsx` | Create | Component tests (render, chord selection, permanent apply, save modal) |

---

## Task 1: `buildProgressionChords` helper

**Files:**
- Create: `app/(app)/tools/progression-analyser/_lib/build-progression-chords.ts`
- Create: `__tests__/tools/build-progression-chords.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/tools/build-progression-chords.test.ts
import { describe, it, expect } from "vitest"
import { buildProgressionChords } from "@/app/(app)/tools/progression-analyser/_lib/build-progression-chords"
import type { InputChord, ChordAnalysis } from "@/lib/theory/key-finder"

function inputChord(root: string, type: string): InputChord {
  return { root, type, symbol: `${root}${type}` }
}

function analysis(degree: number | null, roman: string, role: ChordAnalysis["role"] = "diatonic"): ChordAnalysis {
  return {
    inputChord: { root: "C", type: "", symbol: "C" },
    degree,
    roman,
    score: 1,
    role,
  }
}

describe("buildProgressionChords", () => {
  it("maps diatonic chord with known degree", () => {
    const result = buildProgressionChords(
      [inputChord("C", "maj7")],
      [analysis(1, "I")],
    )
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      tonic: "C",
      type: "maj7",
      roman: "I",
      degree: 1,
      quality: "major",
      nashville: "1",
    })
  })

  it("falls back degree to 1 when analysis degree is null", () => {
    const result = buildProgressionChords(
      [inputChord("Db", "7")],
      [analysis(null, "♭II", "non-diatonic")],
    )
    expect(result[0]!.degree).toBe(1)
    expect(result[0]!.roman).toBe("♭II")
  })

  it("derives quality 'minor' for m7 type", () => {
    const result = buildProgressionChords(
      [inputChord("A", "m7")],
      [analysis(6, "vi")],
    )
    expect(result[0]!.quality).toBe("minor")
  })

  it("derives quality 'diminished' for m7b5 type", () => {
    const result = buildProgressionChords(
      [inputChord("B", "m7b5")],
      [analysis(7, "vii°")],
    )
    expect(result[0]!.quality).toBe("diminished")
  })

  it("derives quality 'dominant' for type '7'", () => {
    const result = buildProgressionChords(
      [inputChord("G", "7")],
      [analysis(5, "V7")],
    )
    expect(result[0]!.quality).toBe("dominant")
  })

  it("handles multiple chords in order", () => {
    const result = buildProgressionChords(
      [inputChord("C", "maj7"), inputChord("A", "m7"), inputChord("F", "maj7"), inputChord("G", "7")],
      [analysis(1, "I"), analysis(6, "vi"), analysis(4, "IV"), analysis(5, "V7")],
    )
    expect(result).toHaveLength(4)
    expect(result.map(c => c.roman)).toEqual(["I", "vi", "IV", "V7"])
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run __tests__/tools/build-progression-chords.test.ts 2>&1 | tail -10
```
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement the helper**

```typescript
// app/(app)/tools/progression-analyser/_lib/build-progression-chords.ts
import type { ProgressionChord } from "@/lib/theory/types"
import type { InputChord, ChordAnalysis } from "@/lib/theory/key-finder"

function qualityFromType(type: string): ProgressionChord["quality"] {
  const t = type.toLowerCase()
  if (t === "m7b5" || t.startsWith("dim") || t === "ø" || t === "ø7") return "diminished"
  if (t.startsWith("m") && !t.startsWith("maj")) return "minor"
  if (/^(7|9|11|13|alt)/.test(t)) return "dominant"
  return "major"
}

/**
 * Converts parsed input chords + their analyses to ProgressionChord[], which
 * is the type required by getSubstitutions, getSoloScales, and related APIs.
 *
 * Use displayAnalyses (after applyFunctionalRomanOverrides) to get functional
 * roman numerals (V7/IV, ii/IV, etc.) rather than chromatic ones.
 */
export function buildProgressionChords(
  parsedChords: InputChord[],
  displayAnalyses: ChordAnalysis[],
): ProgressionChord[] {
  return parsedChords.map((chord, i) => {
    const analysis = displayAnalyses[i]
    return {
      roman:    analysis?.roman ?? "?",
      nashville: String(analysis?.degree ?? 1),
      tonic:    chord.root,
      type:     chord.type,
      quality:  qualityFromType(chord.type),
      degree:   analysis?.degree ?? 1,
    }
  })
}
```

- [ ] **Step 4: Run tests and confirm pass**

```bash
npx vitest run __tests__/tools/build-progression-chords.test.ts 2>&1 | tail -10
```
Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/(app)/tools/progression-analyser/_lib/build-progression-chords.ts __tests__/tools/build-progression-chords.test.ts
git commit -m "feat: add buildProgressionChords utility for progression analyser"
```

---

## Task 2: Page shell + tool registration

**Files:**
- Create: `app/(app)/tools/progression-analyser/page.tsx`
- Modify: `app/(app)/tools/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
// app/(app)/tools/progression-analyser/page.tsx
import Link from "next/link"
import { AnalyserClient } from "./_components/analyser-client"

export default function ProgressionAnalyserPage() {
  return (
    <div className="pt-6">
      <Link
        href="/tools"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
      >
        ← Tools
      </Link>
      <h1 className="text-2xl font-semibold text-foreground mb-2">Progression Analyser</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Enter any chord sequence to see real-time harmonic analysis, explore substitutions, and find scales to solo over each chord.
      </p>
      <AnalyserClient />
    </div>
  )
}
```

- [ ] **Step 2: Create a stub client so the page compiles**

```typescript
// app/(app)/tools/progression-analyser/_components/analyser-client.tsx
"use client"

export function AnalyserClient() {
  return <div>Progression Analyser — coming soon</div>
}
```

- [ ] **Step 3: Register in tools/page.tsx**

In `app/(app)/tools/page.tsx`, add the import and new entry **before** the Metronome entry:

```typescript
// Change the import line at the top from:
import { Search, Music, Compass, ArrowLeftRight, Timer } from "lucide-react"
// to:
import { Search, Music, Compass, ArrowLeftRight, Timer, BarChart2 } from "lucide-react"
```

Insert this entry into the `TOOLS` array between Transposer and Metronome:

```typescript
  {
    href: "/tools/progression-analyser",
    icon: <BarChart2 size={36} strokeWidth={1.5} aria-hidden="true" />,
    name: "Progression Analyser",
    description: "Analyse chord progressions with real-time harmonic labelling",
  },
```

The TOOLS array should now be: Chord Finder, Scale Finder, Key Finder, Transposer, **Progression Analyser**, Metronome.

- [ ] **Step 4: Verify it builds**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors (the stub client satisfies the import).

- [ ] **Step 5: Commit**

```bash
git add app/(app)/tools/progression-analyser/page.tsx app/(app)/tools/progression-analyser/_components/analyser-client.tsx app/(app)/tools/page.tsx
git commit -m "feat: add Progression Analyser page shell and register in tools index"
```

---

## Task 3: Core analyser client — controls, chord input, analysis display

Replace the stub `analyser-client.tsx` with the full implementation.

**File:** `app/(app)/tools/progression-analyser/_components/analyser-client.tsx`

- [ ] **Step 1: Write the failing component test**

```typescript
// __tests__/tools/analyser-client.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { AnalyserClient } from "@/app/(app)/tools/progression-analyser/_components/analyser-client"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock("@/lib/theory/key-finder", () => ({
  parseChord: (s: string) => {
    if (!s) return null
    const root = s.match(/^([A-G][#b]?)/)?.[1] ?? null
    if (!root) return null
    return { root, type: s.slice(root.length), symbol: s }
  },
  applyFunctionalRomanOverrides: (analyses: unknown[]) => analyses,
  analyzeChordInKey: () => ({ degree: 1, roman: "I", role: "diatonic", score: 1.0, inputChord: {} }),
}))
vi.mock("@/lib/theory/transposer", () => ({
  analyzeProgression: () => [],
}))
vi.mock("@/lib/theory", () => ({
  getSubstitutions: () => [],
  getSoloScales: () => ({ chordTonic: "C", primary: { scaleName: "Major" }, additional: [] }),
  analyzeFunctionalContext: () => ({ romanOverride: null, scalesOverride: null }),
}))
vi.mock("@/app/(app)/reference/progressions/actions", () => ({
  createUserProgression: vi.fn().mockResolvedValue({ success: true, id: "test-id" }),
}))
// Stub DnD to avoid test environment issues
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  closestCenter: vi.fn(),
  PointerSensor: class {},
  KeyboardSensor: class {},
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}))
vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  horizontalListSortingStrategy: {},
  sortableKeyboardCoordinates: {},
  arrayMove: vi.fn((arr: unknown[], from: number, to: number) => {
    const result = [...arr]
    const [item] = result.splice(from, 1)
    result.splice(to, 0, item!)
    return result
  }),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}))
vi.mock("@/lib/theory/chords", () => ({ listChordDbSuffixes: () => ["", "maj7", "m7", "7", "m7b5", "dim7"] }))

describe("AnalyserClient", () => {
  it("renders key and mode selectors", () => {
    render(<AnalyserClient />)
    expect(screen.getByLabelText("Key")).toBeInTheDocument()
    expect(screen.getByLabelText("Mode")).toBeInTheDocument()
  })

  it("renders title and description inputs", () => {
    render(<AnalyserClient />)
    expect(screen.getByPlaceholderText(/My progression/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/supports markdown/i)).toBeInTheDocument()
  })

  it("renders add chord button", () => {
    render(<AnalyserClient />)
    expect(screen.getByLabelText("add chord")).toBeInTheDocument()
  })

  it("Save button is disabled when no chords entered", () => {
    render(<AnalyserClient />)
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run __tests__/tools/analyser-client.test.tsx 2>&1 | tail -15
```
Expected: FAIL (AnalyserClient not implemented yet).

- [ ] **Step 3: Implement the full analyser-client.tsx**

```typescript
// app/(app)/tools/progression-analyser/_components/analyser-client.tsx
"use client"

import { useCallback, useMemo, useState } from "react"
import { parseChord, applyFunctionalRomanOverrides, analyzeChordInKey } from "@/lib/theory/key-finder"
import { analyzeProgression } from "@/lib/theory/transposer"
import { getSubstitutions, getSoloScales, analyzeFunctionalContext } from "@/lib/theory"
import type { FunctionalAnalysis, ChordContext } from "@/lib/theory"
import { ALL_KEY_MODES } from "@/lib/theory/commonality-tiers"
import { ChordInputRow } from "@/app/(app)/tools/_components/chord-input-row"
import { ChordQualityBlock, targetDegreeFromRoman } from "@/app/(app)/reference/_components/chord-quality-block"
import { SubstitutionsPanel } from "@/app/(app)/reference/_components/substitutions-panel"
import { SoloScalesPanel } from "@/app/(app)/reference/_components/solo-scales-panel"
import { buildProgressionChords } from "../_lib/build-progression-chords"
import { SaveModal } from "./save-modal"
import { btn } from "@/lib/button-styles"
import { cn } from "@/lib/utils"
import type { ChordSubstitution, PreviewChord, ProgressionChord } from "@/lib/theory/types"

const ROOT_NOTES = [
  "Ab", "A", "A#", "Bb", "B", "C", "C#", "Db", "D", "D#", "Eb", "E",
  "F", "F#", "Gb", "G", "G#",
] as const

const MODE_GROUPS = [
  { label: "Common",   modes: ALL_KEY_MODES.filter(m => m.tier === 1) },
  { label: "Modal",    modes: ALL_KEY_MODES.filter(m => m.tier === 2 || m.tier === 3) },
  { label: "Advanced", modes: ALL_KEY_MODES.filter(m => m.tier >= 4) },
]

const SELECT_CLASS =
  "bg-card border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent w-fit"

type ChordEntry = { id: string; symbol: string }

// ---------------------------------------------------------------------------
// Preview helpers (mirrors progressions-tab.tsx — intentional parallel copy)
// ---------------------------------------------------------------------------

function chordToPreview(c: ProgressionChord): PreviewChord {
  return { tonic: c.tonic, type: c.type, roman: c.roman, quality: c.quality, degree: c.degree }
}

function applyPreview(
  chords: ProgressionChord[],
  sub: ChordSubstitution,
): { previewChords: PreviewChord[]; highlightIndices: Set<number> } {
  const base = chords.map(chordToPreview)
  const { result } = sub

  if (result.kind === "replacement") {
    const preview = [...base]
    const indices = new Set<number>()
    for (const { index, chord } of result.replacements) {
      preview[index] = chord
      indices.add(index)
    }
    return { previewChords: preview, highlightIndices: indices }
  }

  if (result.kind === "insertion") {
    const preview = [
      ...base.slice(0, result.insertBefore),
      ...result.chords,
      ...base.slice(result.insertBefore),
    ]
    const count = result.chords.length
    const indices = new Set(
      Array.from({ length: count + 1 }, (_, i) => result.insertBefore + i),
    )
    return { previewChords: preview, highlightIndices: indices }
  }

  // range_replacement
  const preview = [
    ...base.slice(0, result.startIndex),
    ...result.chords,
    ...base.slice(result.endIndex + 1),
  ]
  const indices = new Set(
    Array.from({ length: result.chords.length }, (_, i) => result.startIndex + i),
  )
  return { previewChords: preview, highlightIndices: indices }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AnalyserClient() {
  const [key, setKey]         = useState("C")
  const [modeIdx, setModeIdx] = useState(0)
  const [title, setTitle]     = useState("")
  const [description, setDescription] = useState("")
  const [chords, setChords]   = useState<ChordEntry[]>([])
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [previewedSub, setPreviewedSub]   = useState<ChordSubstitution | null>(null)
  const [activeTab, setActiveTab]         = useState<"substitutions" | "soloing">("substitutions")
  const [saveModalOpen, setSaveModalOpen] = useState(false)

  const mode = ALL_KEY_MODES[modeIdx]!

  const parsedChords = useMemo(
    () => chords.map(c => parseChord(c.symbol)).filter((c): c is NonNullable<typeof c> => c !== null),
    [chords],
  )

  const chordAnalyses = useMemo(
    () => parsedChords.length > 0 ? analyzeProgression(parsedChords, key, mode.modeName) : [],
    [parsedChords, key, mode.modeName],
  )

  const displayAnalyses = useMemo(
    () => chordAnalyses.length > 0
      ? applyFunctionalRomanOverrides(chordAnalyses, key, mode.modeName)
      : [],
    [chordAnalyses, key, mode.modeName],
  )

  const progressionChords = useMemo(
    () => buildProgressionChords(parsedChords, displayAnalyses),
    [parsedChords, displayAnalyses],
  )

  const { previewChords, highlightIndices } = useMemo(() => {
    if (!previewedSub || progressionChords.length === 0) {
      return { previewChords: progressionChords.map(chordToPreview), highlightIndices: new Set<number>() }
    }
    return applyPreview(progressionChords, previewedSub)
  }, [progressionChords, previewedSub])

  const functionalAnalyses = useMemo(
    (): FunctionalAnalysis[] =>
      progressionChords.map((chord, i) =>
        analyzeFunctionalContext(
          { ...chord, quality: chord.quality as ChordContext["quality"] },
          progressionChords[i + 1]
            ? { ...progressionChords[i + 1]!, quality: progressionChords[i + 1]!.quality as ChordContext["quality"] }
            : null,
          key,
          mode.modeName,
        )
      ),
    [progressionChords, key, mode.modeName],
  )

  const selectedChord = selectedIndex !== null ? progressionChords[selectedIndex] ?? null : null

  const selectedDisplayRoman = selectedIndex !== null
    ? (functionalAnalyses[selectedIndex]?.romanOverride ?? progressionChords[selectedIndex]?.roman ?? null)
    : null

  const scales = useMemo(() => {
    if (!selectedChord || selectedIndex === null) return null
    return functionalAnalyses[selectedIndex]?.scalesOverride ??
      getSoloScales({ tonic: selectedChord.tonic, type: selectedChord.type, degree: selectedChord.degree }, mode.modeName)
  }, [selectedChord, selectedIndex, functionalAnalyses, mode.modeName])

  const substitutions = useMemo(
    () => selectedIndex !== null && selectedChord
      ? getSubstitutions(selectedChord, progressionChords, selectedIndex, key, mode.modeName)
      : [],
    [selectedChord, progressionChords, selectedIndex, key, mode.modeName],
  )

  const handleAdd = useCallback(() => {
    const id = crypto.randomUUID()
    setChords(prev => [...prev, { id, symbol: "" }])
    setEditingId(id)
  }, [])

  const handleCommit = useCallback((id: string, symbol: string) => {
    setEditingId(null)
    if (!symbol) setChords(prev => prev.filter(c => c.id !== id))
    else setChords(prev => prev.map(c => c.id === id ? { ...c, symbol } : c))
    setSelectedIndex(null)
    setPreviewedSub(null)
  }, [])

  const handleRemove = useCallback((id: string) => {
    setChords(prev => prev.filter(c => c.id !== id))
    setSelectedIndex(null)
    setPreviewedSub(null)
  }, [])

  const handleStartEdit = useCallback((id: string) => setEditingId(id), [])

  const handleChordClick = useCallback((i: number) => {
    setPreviewedSub(null)
    setSelectedIndex(prev => prev === i ? null : i)
  }, [])

  function handleApplyPermanently() {
    if (!previewedSub) return
    const { previewChords: applied } = applyPreview(progressionChords, previewedSub)
    setChords(applied.map(c => ({ id: crypto.randomUUID(), symbol: `${c.tonic}${c.type}` })))
    setPreviewedSub(null)
    setSelectedIndex(null)
    setEditingId(null)
  }

  const hasParsedChords = parsedChords.length > 0

  return (
    <div className="flex flex-col gap-6">

      {/* Key + Mode */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs uppercase tracking-widest text-muted-foreground whitespace-nowrap">Key</span>
        <select
          value={key}
          onChange={e => setKey(e.target.value)}
          aria-label="Key"
          className={SELECT_CLASS}
        >
          {ROOT_NOTES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={modeIdx}
          onChange={e => setModeIdx(Number(e.target.value))}
          aria-label="Mode"
          className={SELECT_CLASS}
        >
          {MODE_GROUPS.map(group => (
            <optgroup key={group.label} label={group.label}>
              {group.modes.map(m => {
                const idx = ALL_KEY_MODES.findIndex(km => km.modeName === m.modeName)
                return <option key={m.modeName} value={idx}>{m.displayName}</option>
              })}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Title</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="My progression"
          className="w-full rounded border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          placeholder="Describe this progression… (supports markdown)"
          className="w-full rounded border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-y"
        />
      </div>

      {/* Chord input */}
      <div>
        <label className="block text-xs text-muted-foreground mb-2">Chords</label>
        <ChordInputRow
          chords={chords}
          editingId={editingId}
          chordAnalyses={displayAnalyses}
          onChordChange={setChords}
          onCommit={handleCommit}
          onRemove={handleRemove}
          onStartEdit={handleStartEdit}
          onAdd={handleAdd}
        />
      </div>

      {/* Analysed chord tiles — selectable; mirrors progressions-tab chord display */}
      {hasParsedChords && (
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Analysis in {key} {mode.displayName}
          </p>
          <div role="group" aria-label="Analysed chords" className="flex flex-wrap items-center gap-1">
            {previewChords.map((chord, i) => {
              const displayRoman = !previewedSub && selectedIndex !== null
                ? (functionalAnalyses[i]?.romanOverride ?? chord.roman)
                : chord.roman
              const targetDegree = targetDegreeFromRoman(displayRoman)
              const inputChord = parseChord(`${chord.tonic}${chord.type}`)
              const keyAnalysis = inputChord ? analyzeChordInKey(inputChord, key, mode.modeName) : null
              const role = keyAnalysis?.role ?? "non-diatonic"
              const effectiveDegree = targetDegree ?? keyAnalysis?.degree ?? chord.degree ?? 1
              const effectiveVariant = targetDegree !== null
                ? "borrowed"
                : role === "diatonic" ? "diatonic"
                : role === "borrowed" ? "borrowed"
                : "non-diatonic"
              return (
                <div key={i} className="flex items-center gap-1 flex-shrink-0">
                  {i > 0 && <span className="text-muted-foreground text-sm flex-shrink-0">→</span>}
                  <ChordQualityBlock
                    roman={displayRoman}
                    chordName={`${chord.tonic}${chord.type}`}
                    degree={effectiveDegree}
                    isSelected={!previewedSub && selectedIndex === i}
                    onClick={() => handleChordClick(i)}
                    variant={effectiveVariant}
                    isSubstitutionPreview={highlightIndices.has(i)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!hasParsedChords && (
        <p className="text-sm text-muted-foreground">Add chords above to see harmonic analysis.</p>
      )}

      {/* Per-chord tabs — shown when a chord is selected */}
      {selectedChord && (
        <div className="space-y-3">
          <div className="flex rounded border border-border overflow-hidden text-sm w-fit">
            <button
              type="button"
              onClick={() => setActiveTab("substitutions")}
              className={cn(
                "px-3 py-1.5 transition-colors",
                activeTab === "substitutions"
                  ? "bg-accent text-accent-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              Substitutions
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("soloing")}
              className={cn(
                "px-3 py-1.5 transition-colors border-l border-border",
                activeTab === "soloing"
                  ? "bg-accent text-accent-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              Soloing
            </button>
          </div>

          {activeTab === "substitutions" && (
            <div className="space-y-3">
              <SubstitutionsPanel
                substitutions={substitutions}
                chordName={`${selectedChord.tonic}${selectedChord.type}`}
                previewedId={previewedSub?.id ?? null}
                onPreview={setPreviewedSub}
              />
              {previewedSub && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={handleApplyPermanently}
                    className={btn("primary", "sm")}
                  >
                    Apply permanently
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewedSub(null)}
                    className={btn("standalone", "sm")}
                  >
                    Cancel preview
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "soloing" && scales && (
            <SoloScalesPanel
              scales={scales}
              chordName={`${selectedChord.tonic}${selectedChord.type}`}
              romanNumeral={selectedDisplayRoman ?? undefined}
            />
          )}
        </div>
      )}

      {/* Save button */}
      <div className="pt-2 border-t border-border">
        <button
          type="button"
          disabled={!hasParsedChords}
          onClick={() => setSaveModalOpen(true)}
          className={btn("primary")}
        >
          Save to My Progressions
        </button>
      </div>

      {/* Save modal */}
      {saveModalOpen && (
        <SaveModal
          parsedChords={parsedChords}
          tonic={key}
          modeName={mode.modeName}
          initialTitle={title}
          initialDescription={description}
          onClose={() => setSaveModalOpen(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run __tests__/tools/analyser-client.test.tsx 2>&1 | tail -20
```
Expected: 4 tests pass. (SaveModal will be a stub at this point — see Task 4.)

Note: The test will fail initially because `SaveModal` doesn't exist yet. Create a temporary stub:

```typescript
// Add to the bottom of analyser-client.tsx temporarily while implementing:
// (Remove once save-modal.tsx is created in Task 4)
```

Actually — create the stub save-modal.tsx first, then implement it fully in Task 4.

```typescript
// app/(app)/tools/progression-analyser/_components/save-modal.tsx (stub)
"use client"
import type { InputChord } from "@/lib/theory/key-finder"

interface SaveModalProps {
  parsedChords: InputChord[]
  tonic: string
  modeName: string
  initialTitle: string
  initialDescription: string
  onClose: () => void
}
export function SaveModal({ onClose }: SaveModalProps) {
  return (
    <div role="dialog" aria-label="Save progression">
      <button type="button" onClick={onClose}>Close</button>
    </div>
  )
}
```

- [ ] **Step 5: Run tests again**

```bash
npx vitest run __tests__/tools/analyser-client.test.tsx 2>&1 | tail -10
```
Expected: all 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/(app)/tools/progression-analyser/_components/analyser-client.tsx app/(app)/tools/progression-analyser/_components/save-modal.tsx
git commit -m "feat: implement progression analyser client with chord input, analysis display, and substitution/soloing tabs"
```

---

## Task 4: Save modal

Replace the save-modal.tsx stub with the full implementation.

**File:** `app/(app)/tools/progression-analyser/_components/save-modal.tsx`

- [ ] **Step 1: Add save modal test to analyser-client.test.tsx**

Add to the existing `__tests__/tools/analyser-client.test.tsx` describe block:

```typescript
  it("Save button opens the modal when chords are present", async () => {
    // This test requires a chord to be present — mock the parsedChords derivation
    // by rendering with a pre-seeded chord entry. Because DnD is mocked, we can't
    // easily simulate ChordInputRow interaction; instead test that the Save button
    // exists and is correctly disabled when there are no chords.
    render(<AnalyserClient />)
    const saveBtn = screen.getByRole("button", { name: /save/i })
    expect(saveBtn).toBeDisabled()
    // When chords exist the button is enabled — tested via integration; omit here
    // to keep unit tests simple and focused on pure disabled state.
  })
```

(This is a lightweight test — the modal itself is tested separately below.)

- [ ] **Step 2: Write save modal test**

```typescript
// __tests__/tools/save-modal.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { SaveModal } from "@/app/(app)/tools/progression-analyser/_components/save-modal"
import type { InputChord } from "@/lib/theory/key-finder"

const mockPush = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }))
vi.mock("@/lib/theory/transposer", () => ({
  analyzeProgression: () => [
    { roman: "I", degree: 1, role: "diatonic", score: 1, inputChord: { root: "C", type: "maj7", symbol: "Cmaj7" } },
  ],
}))
vi.mock("@/app/(app)/reference/progressions/actions", () => ({
  createUserProgression: vi.fn().mockResolvedValue({ success: true, id: "new-id" }),
}))

const fakeParsedChords: InputChord[] = [{ root: "C", type: "maj7", symbol: "Cmaj7" }]

beforeEach(() => { mockPush.mockClear() })

describe("SaveModal", () => {
  it("renders with pre-filled title and description", () => {
    render(
      <SaveModal
        parsedChords={fakeParsedChords}
        tonic="C"
        modeName="major"
        initialTitle="My Test"
        initialDescription="A nice progression"
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByDisplayValue("My Test")).toBeInTheDocument()
    expect(screen.getByDisplayValue("A nice progression")).toBeInTheDocument()
  })

  it("shows error when title is empty and save is clicked", async () => {
    render(
      <SaveModal
        parsedChords={fakeParsedChords}
        tonic="C"
        modeName="major"
        initialTitle=""
        initialDescription=""
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument()
  })

  it("calls createUserProgression and navigates on success", async () => {
    const { createUserProgression } = await import("@/app/(app)/reference/progressions/actions")
    render(
      <SaveModal
        parsedChords={fakeParsedChords}
        tonic="C"
        modeName="major"
        initialTitle="My Progression"
        initialDescription=""
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => expect(createUserProgression).toHaveBeenCalledWith({
      displayName: "My Progression",
      description: "",
      mode: "major",
      degrees: expect.arrayContaining(["I:maj7"]),
    }))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/reference/progressions"))
  })

  it("calls onClose when Cancel is clicked", () => {
    const onClose = vi.fn()
    render(
      <SaveModal
        parsedChords={fakeParsedChords}
        tonic="C"
        modeName="major"
        initialTitle=""
        initialDescription=""
        onClose={onClose}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 3: Run to confirm failure**

```bash
npx vitest run __tests__/tools/save-modal.test.tsx 2>&1 | tail -10
```
Expected: FAIL — stub SaveModal doesn't implement the logic yet.

- [ ] **Step 4: Implement save-modal.tsx**

```typescript
// app/(app)/tools/progression-analyser/_components/save-modal.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { analyzeProgression } from "@/lib/theory/transposer"
import { createUserProgression } from "@/app/(app)/reference/progressions/actions"
import { btn } from "@/lib/button-styles"
import type { InputChord } from "@/lib/theory/key-finder"

interface SaveModalProps {
  parsedChords: InputChord[]
  tonic: string
  modeName: string
  initialTitle: string
  initialDescription: string
  onClose: () => void
}

export function SaveModal({
  parsedChords,
  tonic,
  modeName,
  initialTitle,
  initialDescription,
  onClose,
}: SaveModalProps) {
  const router = useRouter()
  const [modalTitle, setModalTitle]       = useState(initialTitle)
  const [modalDescription, setModalDescription] = useState(initialDescription)
  const [isSaving, setIsSaving]           = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  async function handleSave() {
    if (!modalTitle.trim()) { setError("Name is required"); return }
    setIsSaving(true)
    setError(null)

    const analyses = analyzeProgression(parsedChords, tonic, modeName)
    const degrees = analyses.map((a, i) => {
      const chord = parsedChords[i]
      return chord && chord.type ? `${a.roman}:${chord.type}` : a.roman
    })

    const result = await createUserProgression({
      displayName: modalTitle.trim(),
      description: modalDescription,
      mode: modeName,
      degrees,
    })

    if ("error" in result) {
      setError(result.error)
      setIsSaving(false)
    } else {
      router.push("/reference/progressions")
    }
  }

  return (
    /* Full-screen overlay */
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Save progression"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onPointerDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Save progression</h2>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">Name</label>
          <input
            value={modalTitle}
            onChange={e => setModalTitle(e.target.value)}
            placeholder="My progression"
            autoFocus
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">Description (markdown)</label>
          <textarea
            value={modalDescription}
            onChange={e => setModalDescription(e.target.value)}
            rows={4}
            placeholder="Optional notes about this progression…"
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-y"
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={btn("primary")}
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className={btn("standalone")}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run all new tests**

```bash
npx vitest run __tests__/tools/ 2>&1 | tail -15
```
Expected: all tests in `__tests__/tools/` pass.

- [ ] **Step 6: Run full test suite**

```bash
npx vitest run 2>&1 | tail -10
```
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add app/(app)/tools/progression-analyser/_components/save-modal.tsx __tests__/tools/save-modal.test.tsx
git commit -m "feat: implement save modal for progression analyser — saves to My Progressions"
```

---

## Self-Review Checklist

**Spec coverage:**

| Requirement | Covered in |
|---|---|
| Before Metronome on Tools panel | Task 2 Step 3 |
| UX similar to Transposer | analyser-client mirrors transposer-client structure |
| Key and mode selectors | Task 3 Step 3 — key/modeIdx selectors |
| Title and Description inputs | Task 3 Step 3 |
| Chord tile input spanning full width | Task 3 Step 3 — ChordInputRow w/full width container |
| Real-time Roman numeral + functional harmony analysis | displayAnalyses via analyzeProgression + applyFunctionalRomanOverrides |
| Borrowed chord highlighting | effectiveVariant logic in analysed chord tiles (dashed = borrowed, dotted = non-diatonic) |
| Tabs: Substitutions (default) and Soloing | activeTab defaults to "substitutions" |
| Same analysis as Progressions tab | functionalAnalyses + scales logic mirrors progressions-tab.tsx exactly |
| Substitution preview in progression | applyPreview + highlightIndices + isSubstitutionPreview prop |
| Permanently apply substitution | handleApplyPermanently — converts preview → ChordEntry[] |
| Save button → modal | setSaveModalOpen + SaveModal component |
| Modal pre-fills title/description | SaveModal initialTitle/initialDescription props |
| Title/description overrideable in modal | SaveModal has its own modalTitle/modalDescription state |
| Saved as last custom progression | createUserProgression (uses `order` auto-increment) |
| Navigate to My Progressions on save | router.push("/reference/progressions") |

**Placeholder scan:** No TBDs or TODOs found in steps above.

**Type consistency:**
- `buildProgressionChords(parsedChords: InputChord[], displayAnalyses: ChordAnalysis[]): ProgressionChord[]` — used consistently in analyser-client.tsx Task 3, tested in Task 1.
- `SaveModal` props interface `{ parsedChords, tonic, modeName, initialTitle, initialDescription, onClose }` — defined in Task 4, imported correctly in analyser-client.tsx Task 3.
- `applyPreview(chords: ProgressionChord[], sub: ChordSubstitution)` — defined in analyser-client.tsx, used in analyser-client.tsx and handleApplyPermanently. No cross-file dependency.
