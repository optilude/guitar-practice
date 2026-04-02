# Reference Page — Harmony Study & Layout Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Reference page layout so the Circle of Fifths and a new Harmony Study panel sit side-by-side, with the Scale/Arpeggio/Chord/Triad study tools moved to a full-width section below; introduce Harmony and Progressions study panels backed by a new scale-recommendation engine.

**Architecture:** The page gains a three-section layout (Circle + Harmony Study on top; Study Tools spanning full width below). Harmony Study is a new component subtree with two sub-tabs (Harmony, Progressions) that share a reusable chord-block component and a scale-recommendation display. The theory layer gains a `getSoloScales` function and an extended, richer progressions dataset.

**Tech Stack:** Next.js 16 App Router (RSC/client boundary unchanged), React 19, Tailwind v4, TonalJS (already in use), existing `getDiatonicChords` / `getKey` / `getProgression` theory API.

---

## File Map

### New files
| Path | Purpose |
|------|---------|
| `lib/theory/solo-scales.ts` | `getSoloScales(chord, mode)` — primary + additional scale recommendations |
| `app/(app)/reference/_components/harmony-study.tsx` | Harmony/Progressions sub-tab container |
| `app/(app)/reference/_components/harmony-tab.tsx` | Mode selector + diatonic chord blocks + scale panel |
| `app/(app)/reference/_components/progressions-tab.tsx` | Progression selector + chord blocks + scale panel |
| `app/(app)/reference/_components/chord-quality-block.tsx` | Reusable diatonic chord block (selectable) |
| `app/(app)/reference/_components/solo-scales-panel.tsx` | Primary + "Also works" scale display |
| `__tests__/theory/solo-scales.test.ts` | Unit tests for getSoloScales |
| `__tests__/reference/harmony-study.test.tsx` | Integration: tab switching, key propagation |
| `__tests__/reference/harmony-tab.test.tsx` | Mode selector, chord blocks, chord selection |
| `__tests__/reference/progressions-tab.test.tsx` | Progression selector, chord blocks, scale display |

### Modified files
| Path | Change |
|------|--------|
| `lib/theory/types.ts` | Extend `Progression` type; add `SoloScales` type; add `degree`+`quality` to `ProgressionChord` |
| `lib/theory/progressions.ts` | Replace PROGRESSIONS data with user's 15 progressions; extend resolver for ♭-prefixed degrees and per-progression modes |
| `lib/theory/index.ts` | Re-export `getSoloScales`, updated `listProgressions` |
| `app/(app)/reference/page.tsx` | New three-section layout |
| `app/(app)/reference/_components/chord-panel.tsx` | Fingerings grid: max 5 columns |
| `app/(app)/reference/_components/triad-panel.tsx` | Fingerings grid: max 5 columns |
| `__tests__/reference/page.test.tsx` | Update mocks + assertions for new layout |

---

## Section 1 — Type Changes (`lib/theory/types.ts`)

### Extend `Progression`
```typescript
export interface Progression {
  name: string          // identifier: "pop-standard"
  displayName: string   // "Pop Standard"
  romanDisplay: string  // "I – V – vi – IV"
  description: string   // short prose description
  degrees: string[]     // ["I", "V", "vi", "IV"] — may include ♭-prefixed: "♭VII"
  mode: string          // TonalJS mode name; "ionian" for most, "aeolian"/"mixolydian" for exceptions
  recommendedScaleType: string // display string: "Major Scale", "Natural Minor Scale", "Mixolydian Scale", "Minor Pentatonic / Blues Scale"
}
```

### Extend `ProgressionChord`
Add `degree` and `quality` so the UI can pass it directly to `getSoloScales`:
```typescript
export interface ProgressionChord {
  roman: string
  nashville: string
  tonic: NoteName
  type: ChordType
  quality: string   // "major" | "minor" | "dominant" | "diminished"
  degree: number    // 1–7
}
```

### New `SoloScales`
```typescript
export interface SoloScaleEntry {
  scaleName: string  // "Mixolydian", "Minor Pentatonic", etc. — just the type, no tonic
  hint?: string      // "bluesy", "lifted feel", "brighter", "adds ♭5 colour"
}

export interface SoloScales {
  chordTonic: NoteName        // e.g. "G" — prefix for display: "G Mixolydian"
  primary: SoloScaleEntry
  additional: SoloScaleEntry[]
}
```

---

## Section 2 — Solo Scales Engine (`lib/theory/solo-scales.ts`)

### Primary scale algorithm

The primary scale for a chord of degree `d` within mode `m` is the mode built on that chord's root. Since all 7 modes of the major scale are a rotation of the same set, the primary mode is:

```typescript
const MODES = ["ionian", "dorian", "phrygian", "lydian", "mixolydian", "aeolian", "locrian"]

const MODE_OFFSET: Record<string, number> = {
  ionian: 0, major: 0,
  dorian: 1,
  phrygian: 2,
  lydian: 3,
  mixolydian: 4,
  aeolian: 5, minor: 5,
  locrian: 6,
}

const MODE_DISPLAY: Record<string, string> = {
  ionian:     "Ionian (major)",
  dorian:     "Dorian",
  phrygian:   "Phrygian",
  lydian:     "Lydian",
  mixolydian: "Mixolydian",
  aeolian:    "Aeolian (natural minor)",
  locrian:    "Locrian",
}

function primaryScaleType(mode: string, degree: number): string {
  const offset = MODE_OFFSET[mode.toLowerCase()] ?? 0
  return MODES[(offset + degree - 1) % 7]
}
```

Examples (verify in tests):
- Ionian, degree 5 (G7) → index 4 → "mixolydian" → display "Mixolydian"
- Ionian, degree 6 (Am7) → index 5 → "aeolian"
- Ionian, degree 1 (Cmaj7) → index 0 → "ionian"
- Aeolian, degree 1 (Am7) → index 5 → "aeolian"
- Dorian, degree 4 (G7 in D Dorian) → index 4 → "mixolydian"

### Additional scales by chord type

```typescript
const ADDITIONAL_BY_TYPE: Record<string, SoloScaleEntry[]> = {
  maj7: [
    { scaleName: "Lydian",           hint: "lifted feel" },
    { scaleName: "Major Pentatonic", hint: "safe choice" },
  ],
  "7": [
    { scaleName: "Minor Pentatonic", hint: "bluesy" },
    { scaleName: "Blues Scale",      hint: "adds ♭5 colour" },
  ],
  m7: [
    { scaleName: "Minor Pentatonic" },
    { scaleName: "Dorian",           hint: "brighter" },
  ],
  m7b5: [
    { scaleName: "Locrian #2",       hint: "less dissonant" },
  ],
}
```

### Scale name → TonalJS key mapping (also exported for use in SoloScalesPanel)

```typescript
export const SCALE_TONAL_NAMES: Record<string, string> = {
  "Ionian (major)":         "ionian",
  "Dorian":                 "dorian",
  "Phrygian":               "phrygian",
  "Lydian":                 "lydian",
  "Mixolydian":             "mixolydian",
  "Aeolian (natural minor)":"aeolian",
  "Locrian":                "locrian",
  "Major Pentatonic":       "major pentatonic",
  "Minor Pentatonic":       "minor pentatonic",
  "Blues Scale":            "blues",
  "Locrian #2":             "locrian #2",
}
```

`SoloScalesPanel` uses `SCALE_TONAL_NAMES[scaleName]` to call `Scale.get(\`${chordTonic} ${tonalName}\`).notes.join(" ")` for the note string next to the primary scale. If a scale name isn't in the map, omit the note string rather than erroring.

### Public function

```typescript
export function getSoloScales(
  chord: { tonic: string; type: string; degree: number },
  mode: string
): SoloScales {
  const primaryType = primaryScaleType(mode, chord.degree)
  const primaryDisplay = MODE_DISPLAY[primaryType] ?? primaryType
  // Filter additional to exclude the primary (no duplicates)
  const additional = (ADDITIONAL_BY_TYPE[chord.type] ?? [])
    .filter((a) => a.scaleName.toLowerCase() !== primaryDisplay.toLowerCase())
  return {
    chordTonic: chord.tonic,
    primary: { scaleName: primaryDisplay },
    additional,
  }
}
```

---

## Section 3 — Updated Progressions Data (`lib/theory/progressions.ts`)

### Replace PROGRESSIONS array with the 15 user-specified progressions

The new data replaces the current 8-entry array in its entirety:

```typescript
const PROGRESSIONS: Progression[] = [
  { name: "pop-standard",        displayName: "Pop Standard",        romanDisplay: "I – V – vi – IV",
    description: "The most common pop progression",
    degrees: ["I","V","vi","IV"],            mode: "ionian",     recommendedScaleType: "Major Scale" },

  { name: "sensitive-pop",       displayName: "Sensitive Pop",       romanDisplay: "vi – IV – I – V",
    description: "Minor-feel variant of the pop progression",
    degrees: ["vi","IV","I","V"],            mode: "ionian",     recommendedScaleType: "Major Scale" },

  { name: "doo-wop",             displayName: "50s / Doo-Wop",       romanDisplay: "I – vi – IV – V",
    description: "Classic 1950s progression",
    degrees: ["I","vi","IV","V"],            mode: "ionian",     recommendedScaleType: "Major Scale" },

  { name: "folk-rock",           displayName: "Folk Rock",           romanDisplay: "I – IV – V",
    description: "Simple three-chord foundation",
    degrees: ["I","IV","V"],                 mode: "ionian",     recommendedScaleType: "Major Scale" },

  { name: "jazz-turnaround",     displayName: "Jazz Turnaround",     romanDisplay: "ii – V – I",
    description: "The most important cadence in jazz",
    degrees: ["ii","V","I"],                 mode: "ionian",     recommendedScaleType: "Major Scale" },

  { name: "extended-turnaround", displayName: "Extended Turnaround", romanDisplay: "vi – ii – V – I",
    description: "Jazz turnaround extended one step back",
    degrees: ["vi","ii","V","I"],            mode: "ionian",     recommendedScaleType: "Major Scale" },

  { name: "blues-rock",          displayName: "Blues Rock",          romanDisplay: "I – ♭VII – IV",
    description: "Rock staple with the borrowed ♭VII chord",
    degrees: ["I","♭VII","IV"],              mode: "mixolydian", recommendedScaleType: "Mixolydian Scale" },

  { name: "classic-rock-loop",   displayName: "Classic Rock Loop",   romanDisplay: "I – IV – I – V",
    description: "Looping rock pattern with repeated tonic",
    degrees: ["I","IV","I","V"],             mode: "ionian",     recommendedScaleType: "Major Scale" },

  { name: "climactic-rise",      displayName: "Climactic Rise",      romanDisplay: "I – IV – V – IV",
    description: "Rising tension then releasing back through IV",
    degrees: ["I","IV","V","IV"],            mode: "ionian",     recommendedScaleType: "Major Scale" },

  { name: "dark-ballad",         displayName: "Dark / Emo Ballad",   romanDisplay: "i – ♭VI – ♭III – ♭VII",
    description: "Descending minor progression",
    degrees: ["i","♭VI","♭III","♭VII"],      mode: "aeolian",   recommendedScaleType: "Natural Minor Scale" },

  { name: "driving-rock",        displayName: "Driving Rock",        romanDisplay: "vi – V – IV – V",
    description: "Descending major pattern starting on vi",
    degrees: ["vi","V","IV","V"],            mode: "ionian",     recommendedScaleType: "Major Scale" },

  { name: "epic-cadence",        displayName: "Epic Cadence",        romanDisplay: "IV – V – iii – vi",
    description: "Ascending then landing on vi",
    degrees: ["IV","V","iii","vi"],          mode: "ionian",     recommendedScaleType: "Major Scale" },

  { name: "pachelbel",           displayName: "Pachelbel's Canon",   romanDisplay: "I – V – vi – iii – IV – I – IV – V",
    description: "Classical progression, basis for many modern songs",
    degrees: ["I","V","vi","iii","IV","I","IV","V"], mode: "ionian", recommendedScaleType: "Major Scale" },

  { name: "gospel-rb",           displayName: "Gospel / R&B Loop",   romanDisplay: "I – vi – ii – V",
    description: "Smooth loop common in gospel and R&B",
    degrees: ["I","vi","ii","V"],            mode: "ionian",     recommendedScaleType: "Major Scale" },

  { name: "progressive-ballad",  displayName: "Progressive Ballad",  romanDisplay: "vi – iii – IV – I",
    description: "Descending through the major scale",
    degrees: ["vi","iii","IV","I"],          mode: "ionian",     recommendedScaleType: "Major Scale" },
]
```

### Extend ROMAN_TO_DEGREE to handle ♭-prefixed degrees

```typescript
const ROMAN_TO_DEGREE: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7,
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7,
  "♭II": 2, "♭III": 3, "♭IV": 4, "♭V": 5, "♭VI": 6, "♭VII": 7,
  "♭ii": 2, "♭iii": 3, "♭iv": 4, "♭v": 5, "♭vi": 6, "♭vii": 7,
}
```

### Extend `getProgression` to use the progression's own mode

Two changes to the existing function:

1. Replace the hardcoded `"major"` with `prog.mode` when calling `getDiatonicChords`.
2. The existing `romanToDegree` helper strips `°` and `+` then looks up in `ROMAN_TO_DEGREE`. It already handles `♭VII` → 7 once `ROMAN_TO_DEGREE` is extended (see above), since `♭` is not stripped by the existing regex.

Return type changes: add `quality` and `degree` to each returned object:
```typescript
export function getProgression(name: string, tonic: string): ProgressionChord[] {
  const prog = PROGRESSIONS.find((p) => p.name === name)
  if (!prog) return []

  const diatonic = getDiatonicChords(tonic, prog.mode)  // was hardcoded "major"
  const byDegree: Record<number, DiatonicChord> = {}
  for (const dc of diatonic) byDegree[dc.degree] = dc

  return prog.degrees.map((roman) => {
    const degree = romanToDegree(roman)
    const dc = byDegree[degree]
    if (!dc) return { roman, nashville: String(degree), tonic, type: "maj7", quality: "major", degree }
    return { roman, nashville: dc.nashville, tonic: dc.tonic, type: dc.type, quality: dc.quality, degree: dc.degree }
  })
}
```

Note: `♭VII` in mixolydian mode is degree 7, which IS diatonic (Bb maj7 in C mixolydian). The ♭ prefix is relative to the major scale; the degree number is correct for the mode. No special borrowed-chord handling is needed.

---

## Section 4 — Page Layout (`app/(app)/reference/page.tsx`)

Three-section layout replacing the current two-column layout:

```typescript
// Desktop (lg+): top row = Circle + HarmonyStudy; bottom row = StudyTools full-width
// Mobile: all three stacked vertically
return (
  <div className="pt-6 space-y-6">
    {/* Heading */}
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Music Theory</p>
      <h1 className="text-2xl font-semibold text-foreground mb-2">Reference</h1>
    </div>

    {/* Top section: Circle of Fifths + Harmony Study */}
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <section
        aria-label="Circle of Fifths key picker"
        className="lg:sticky lg:top-6 lg:w-[400px] lg:shrink-0"
      >
        <CircleOfFifths selectedKey={selectedKey} onKeySelect={setSelectedKey} />
      </section>

      <div className="flex-1 min-w-0">
        <HarmonyStudy tonic={selectedKey} />
      </div>
    </div>

    {/* Bottom section: Study Tools — full width */}
    <section aria-label="Study tools">
      <StudyTools tonic={selectedKey} />
    </section>
  </div>
)
```

`StudyTools` is not a new component — it is the existing tab bar (Scales/Arpeggios/Chords/Triads) extracted from the current page.tsx into a small inline component or kept inline in page.tsx. Either approach is fine; prefer keeping it inline in page.tsx to avoid a trivial wrapper component.

---

## Section 5 — Chord Quality Block (`_components/chord-quality-block.tsx`)

Shared between HarmonyTab and ProgressionsTab.

**Props:**
```typescript
interface ChordQualityBlockProps {
  roman: string         // "I", "ii", "V", "vii°", "♭VII"
  chordName: string     // "Cmaj7", "G7", "Am7"
  type: string          // chord type from DiatonicChord/ProgressionChord
  isSelected: boolean
  onClick: () => void
}
```

**Color mapping by `type`:**
```typescript
function blockColors(type: string) {
  if (type === "maj7" || type === "")
    return { border: "border-green-700", bg: "bg-green-950", text: "text-green-400", sub: "text-green-900" }
  if (type === "7")
    return { border: "border-amber-700", bg: "bg-amber-950", text: "text-amber-400", sub: "text-amber-900" }
  if (type === "m7")
    return { border: "border-blue-700", bg: "bg-blue-950", text: "text-blue-400", sub: "text-blue-900" }
  if (type === "m7b5" || type === "dim7")
    return { border: "border-purple-700", bg: "bg-purple-950", text: "text-purple-400", sub: "text-purple-900" }
  // fallback
  return { border: "border-border", bg: "bg-card", text: "text-foreground", sub: "text-muted-foreground" }
}
```

**Selected state:** selected block gets a ring (`ring-2 ring-offset-1 ring-offset-background`) and brighter border (`border-2`). Use `aria-pressed={isSelected}`.

**Layout:** `min-w-[68px]` fixed min-width so blocks don't collapse on small screens. Roman numeral in small muted text above; chord name in bold; chord type (e.g., "maj7", "m7") in tiny muted text below.

---

## Section 6 — Solo Scales Panel (`_components/solo-scales-panel.tsx`)

**Props:**
```typescript
interface SoloScalesPanelProps {
  scales: SoloScales   // from getSoloScales()
  chordName: string    // e.g. "G7" — for the panel heading
}
```

**Layout:**
1. Heading: "Scales to solo over {chordName}"
2. Primary row: badge `PRIMARY` (coloured per chord quality, same as block) + "{chordTonic} {primary.scaleName}" in large text + note-name string (e.g., "G A B C D E F") in muted text — note names come from `Scale.get(\`${chordTonic} ${primaryModeKey}\`).notes` via TonalJS
3. Divider
4. "Also works" heading + list of additional entries: bullet + "{chordTonic} {scaleName}" + optional hint in muted text

The note string is computed in the panel component using:
```typescript
import { Scale } from "tonal"
const notes = Scale.get(`${scales.chordTonic} ${scaleTypeToTonalName(scales.primary.scaleName)}`).notes.join(" ")
```

Where `scaleTypeToTonalName` maps display names back to TonalJS names ("Ionian (major)" → "ionian", "Aeolian (natural minor)" → "aeolian", etc.).

---

## Section 7 — Harmony Tab (`_components/harmony-tab.tsx`)

**Props:** `{ tonic: string }`

**State:**
```typescript
const [mode, setMode] = useState("ionian")
const [selectedDegree, setSelectedDegree] = useState<number | null>(null)
```

**Mode options** (dropdown `<select>` with `aria-label="Mode"`):
```
Ionian (major)  → "ionian"
Dorian          → "dorian"
Phrygian        → "phrygian"
Lydian          → "lydian"
Mixolydian      → "mixolydian"
Aeolian (natural minor) → "aeolian"
Locrian         → "locrian"
```

**Data:** `const chords = getDiatonicChords(tonic, mode)` — 7 DiatonicChords.

**Chord blocks:** `<div role="group" aria-label="Diatonic chords">` wrapping 7 `ChordQualityBlock` components horizontally, `overflow-x-auto` for narrow screens.

**Scale panel:** rendered below chords when `selectedDegree !== null`. Clicking a new chord updates `selectedDegree`; clicking the same chord deselects (toggles). When displayed:
```typescript
const chord = chords.find(c => c.degree === selectedDegree)!
const scales = getSoloScales(chord, mode)
<SoloScalesPanel scales={scales} chordName={`${chord.tonic}${chord.type}`} />
```

When no chord selected: subtle placeholder "Click a chord to see recommended scales for soloing."

**Changing mode** clears `selectedDegree`.

---

## Section 8 — Progressions Tab (`_components/progressions-tab.tsx`)

**Props:** `{ tonic: string }`

**State:**
```typescript
const [progressionName, setProgressionName] = useState("pop-standard")
const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
```

Note: `selectedIndex` is the index in the ordered `chords` array (not degree), since the same chord can appear twice (e.g., Pachelbel's Canon has I twice).

**Data:**
```typescript
const progressions = listProgressions()
const prog = progressions.find(p => p.name === progressionName)!
const chords = getProgression(progressionName, tonic)  // ProgressionChord[]
```

**Progression selector:** `<select aria-label="Progression">` with option text `"{displayName} · {romanDisplay}"`.

**Chord blocks:** The `chords` array (with possible duplicates) rendered in order, separated by thin arrows (`→`). Each index gets its own `ChordQualityBlock`. Clicking index `i` selects it (or deselects if already selected).

**Per-chord scale panel:** `selectedIndex !== null`:
```typescript
const chord = chords[selectedIndex]
const scales = getSoloScales(chord, prog.mode)
<SoloScalesPanel scales={scales} chordName={`${chord.tonic}${chord.type}`} />
```
(same SoloScalesPanel component, including "Also works")

**Progression-wide recommendation:** always visible below (whether or not a chord is selected), rendered in a distinctly styled card:
- Heading: "Over the whole progression"
- Content: `{tonic} {prog.recommendedScaleType}` (e.g., "C Major Scale")

**Changing progression** clears `selectedIndex`.

---

## Section 9 — Harmony Study Container (`_components/harmony-study.tsx`)

**Props:** `{ tonic: string }`

**State:** `const [tab, setTab] = useState<"harmony" | "progressions">("harmony")`

Simple sub-tab bar (role="tablist") switching between `<HarmonyTab>` and `<ProgressionsTab>`. Changing `tonic` does not reset the active tab.

---

## Section 10 — Study Tools (fingering grid expansion)

### `chord-panel.tsx`
Change the fingerings grid from its current column count to `grid-cols-3 sm:grid-cols-4 lg:grid-cols-5`. The `max-w` constraint on the panel (if any) should be removed so it fills the full container width.

### `triad-panel.tsx`
Same: `grid-cols-3 sm:grid-cols-4 lg:grid-cols-5`. Remove any `max-w` constraint.

The fretboard/notes views in ScalePanel and ArpeggioPanel need no code changes — Fretboard.js and VexFlow renderers already fill their container. Moving the container from `flex-1` (half-page) to full-width will naturally make them wider.

---

## Section 11 — Testing

### `__tests__/theory/solo-scales.test.ts`
```typescript
import { getSoloScales } from "@/lib/theory/solo-scales"

it("returns G Mixolydian as primary for G7 in C Ionian (degree 5)", () => {
  const result = getSoloScales({ tonic: "G", type: "7", degree: 5 }, "ionian")
  expect(result.chordTonic).toBe("G")
  expect(result.primary.scaleName).toBe("Mixolydian")
})

it("returns A Aeolian as primary for Am7 in C Ionian (degree 6)", () => {
  const result = getSoloScales({ tonic: "A", type: "m7", degree: 6 }, "ionian")
  expect(result.primary.scaleName).toBe("Aeolian (natural minor)")
})

it("does not include the primary scale in additional", () => {
  const result = getSoloScales({ tonic: "G", type: "7", degree: 5 }, "ionian")
  expect(result.additional.map(a => a.scaleName)).not.toContain("Mixolydian")
})

it("returns Minor Pentatonic and Blues Scale as additional for dominant chords", () => {
  const result = getSoloScales({ tonic: "G", type: "7", degree: 5 }, "ionian")
  const names = result.additional.map(a => a.scaleName)
  expect(names).toContain("Minor Pentatonic")
  expect(names).toContain("Blues Scale")
})

it("returns A Dorian as primary for Am7 in D Dorian (degree 1)", () => {
  const result = getSoloScales({ tonic: "A", type: "m7", degree: 1 }, "dorian")
  expect(result.primary.scaleName).toBe("Dorian")
})
```

### `__tests__/theory/progressions.test.ts`
```typescript
import { listProgressions, getProgression } from "@/lib/theory"

it("lists 15 progressions", () => {
  expect(listProgressions()).toHaveLength(15)
})

it("every progression has a recommendedScaleType", () => {
  for (const p of listProgressions()) {
    expect(p.recommendedScaleType).toBeTruthy()
  }
})

it("resolves Pop Standard chords correctly in C", () => {
  const chords = getProgression("pop-standard", "C")
  expect(chords.map(c => c.tonic)).toEqual(["C", "G", "A", "F"])
})

it("resolves Blues Rock ♭VII correctly in C (uses mixolydian mode)", () => {
  const chords = getProgression("blues-rock", "C")
  expect(chords[1].tonic).toBe("Bb")   // ♭VII of C = Bb
})

it("resolves Dark Ballad ♭VI correctly in A (uses aeolian mode)", () => {
  const chords = getProgression("dark-ballad", "A")
  // i=Am, ♭VI=F, ♭III=C, ♭VII=G
  expect(chords.map(c => c.tonic)).toEqual(["A", "F", "C", "G"])
})

it("returns degree on each ProgressionChord", () => {
  const chords = getProgression("pop-standard", "C")
  expect(chords.every(c => typeof c.degree === "number")).toBe(true)
})
```

### `__tests__/reference/harmony-tab.test.tsx`
Mock `@/lib/theory` to return predictable data:
```typescript
vi.mock("@/lib/theory", () => ({
  getDiatonicChords: () => [
    { degree: 1, roman: "I",  tonic: "C", type: "maj7", quality: "major",     nashville: "1" },
    { degree: 5, roman: "V",  tonic: "G", type: "7",    quality: "dominant",  nashville: "5" },
    // ... minimal set needed
  ],
  getSoloScales: () => ({
    chordTonic: "G",
    primary: { scaleName: "Mixolydian" },
    additional: [{ scaleName: "Minor Pentatonic", hint: "bluesy" }],
  }),
}))
```

Test cases:
- Renders mode selector defaulting to "Ionian (major)"
- Renders 7 chord blocks (use `vi.mock` with 7 entries for this test)
- Clicking a chord block shows the solo scales panel
- Clicking the same chord block again hides it (toggle)
- Changing mode clears the selected chord

### `__tests__/reference/progressions-tab.test.tsx`
Mock `@/lib/theory` similarly. Test cases:
- Renders progression selector
- Renders chord blocks for the default progression
- Shows progression-wide scale recommendation always
- Clicking a chord block shows per-chord scales including "Also works"
- Clicking same block again deselects
- Changing progression clears selected chord

### `__tests__/reference/harmony-study.test.tsx`
- Renders "Harmony" and "Progressions" tab buttons
- Defaults to Harmony tab active (`aria-selected="true"`)
- Clicking Progressions tab switches panels

### Update `__tests__/reference/page.test.tsx`
Add mock for `getDiatonicChords`, `getSoloScales`, `listProgressions`, `getProgression` in the `@/lib/theory` mock. Add assertions:
- Harmony Study renders (check for "Harmony" tab button)
- Study Tools section renders below (check for Scales/Arpeggios/Chords/Triads tabs)

---

## Non-Goals (v1)

- Harmonic Minor and Melodic Minor mode systems — natural next addition but deferred
- Clicking a chord in the Harmony Study to navigate to it in the Study Tools fretboard
- Audio playback of progressions or individual chords
- Transposing a saved progression to a new key (beyond the existing key picker)
- Drop-2 / Drop-3 chord voicings (separate roadmap item)
