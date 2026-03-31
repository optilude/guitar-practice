# Phase 3: Music Theory Engine & Reference Section — Design

## Overview

Phase 3 builds the music theory foundation that powers the entire app. It has two deliverables:

1. **Theory engine** (`lib/theory/`) — a pure TypeScript layer wrapping TonalJS with guitar-specific abstractions. No DOM, no rendering, no database. Consumed by the Reference section in Phase 3 and by the routine/flashcard system in Phase 4.
2. **Reference section** (`/reference`) — an interactive explorer that proves the engine works. Circle of 5ths as key picker; panels for scales, arpeggios, and chords with tab, fretboard, and chord diagram rendering.

No database changes in Phase 3. All theory is computed at runtime from static data and TonalJS.

---

## Architecture

Three distinct layers with no upward dependencies:

```
┌─────────────────────────────────────────┐
│  Reference UI  (app/(app)/reference/)   │  ← client components, interactive
│  Future: Routine/Flashcard (Phase 4)    │
├─────────────────────────────────────────┤
│  Rendering layer  (lib/rendering/)      │  ← client-side SVG, no theory logic
├─────────────────────────────────────────┤
│  Theory engine   (lib/theory/)          │  ← pure TS, server or client safe
└─────────────────────────────────────────┘
```

**Theory layer** — pure functions, no side effects, no DOM. Returns structured data that any consumer can render however it likes.

**Rendering layer** — takes structured data from the theory layer and produces SVG. Three renderers: tab (VexFlow), fretboard (SVGuitar), chord diagram (SVGuitar). No theory logic here.

**UI layer** — client components that wire the two layers together. The Reference section is fully client-side interactive; no server data fetching needed.

---

## Dependencies

| Package | Purpose |
|---|---|
| `tonal` | Music theory: notes, intervals, scales, modes, chords, keys, diatonic harmony, Roman numerals, Nashville numbers, circle of 5ths |
| `@tombatossals/chords-db` | Static JSON database of guitar chord fingerings — all standard types, all 12 keys, multiple voicings per chord |
| `vexflow` | Renders guitar tablature to SVG |
| `svguitar` | Renders chord diagrams and fretboard/scale diagrams to SVG |

`data/scale-patterns.ts` (generated static file) provides fretboard positions for all scale types. It is not an npm dependency — it lives in the repo.

---

## Scale Position System

Guitar-specific problem: the same note appears at multiple places on the neck. The solution is shape-based patterns with transposition.

**How it works:**
1. Each scale type has 2–5 pre-defined shapes, expressed as `[string, fretOffset]` pairs relative to the root note's fret position.
2. To render a scale in any key, locate the root note's fret on the appropriate string, then add each shape's offset to get the absolute fret number for that position. This produces `FretPosition` objects with absolute fret numbers, ready for the rendering layer.
3. Transposition to any of the 12 keys is arithmetic — no additional shapes needed.

**Scales covered in `data/scale-patterns.ts`:**
- Major (Ionian) — 5 positions (full CAGED coverage)
- Dorian, Phrygian, Lydian, Mixolydian, Aeolian (Natural Minor), Locrian — 3 positions each
- Altered (7th mode of melodic minor / super Locrian) — 2 positions
- Harmonic Minor — 3 positions
- Melodic Minor (ascending) — 3 positions
- Pentatonic Major — 5 box positions
- Pentatonic Minor — 5 box positions
- Blues (minor pentatonic + b5) — 5 positions
- Diminished whole-half — 2 positions
- Diminished half-whole — 2 positions
- Whole tone — 2 positions

**Arpeggios** use the same position system, filtered to chord tones only (root, 3rd, 5th, 7th).

---

## Theory Engine API

All exported from `lib/theory/index.ts`.

### Types

```ts
type NoteName = string          // "C", "D#", "Bb"
type IntervalName = string      // "1P", "3M", "7m" (TonalJS format)
type ScaleType = string         // "Major", "Dorian", "Altered", "Blues", etc.
type ChordType = string         // "maj7", "m7", "7", "m7b5", "dim7", "aug", etc.

interface FretPosition {
  string: number    // 1 = high e, 6 = low E
  fret: number
  interval: string  // "R", "2", "b3", "3", "4", "b5", "5", "6", "b7", "7"
}

interface ScalePosition {
  label: string           // "Position 1", "Position 2", etc.
  positions: FretPosition[]
}

interface GuitarScale {
  tonic: NoteName
  type: ScaleType
  notes: NoteName[]
  intervals: IntervalName[]
  positions: ScalePosition[]  // all available positions for this scale+key
}

interface ChordVoicing {
  frets: (number | null)[]  // index 0 = low E string, null = muted
  fingers: (number | null)[]
  barre?: { fret: number; fromString: number; toString: number }
  label?: string            // "Drop 2", "Drop 3", "Open", etc.
}

interface GuitarChord {
  tonic: NoteName
  type: ChordType
  notes: NoteName[]
  intervals: IntervalName[]
  voicings: ChordVoicing[]
}

interface DiatonicChord {
  degree: number         // 1–7
  roman: string          // "I", "ii", "iii", "IV", "V", "vi", "vii°"
  nashville: string      // "1", "2", "3", "4", "5", "6", "7"
  tonic: NoteName
  type: ChordType
  quality: string        // "major", "minor", "diminished", "augmented"
}

interface CircleEntry {
  tonic: NoteName
  relativeMajor?: NoteName
  relativeMinor?: NoteName
  sharps?: number
  flats?: number
}

interface Progression {
  name: string           // "Jazz Blues", "II-V-I", "I-IV-V", etc.
  description: string
  degrees: string[]      // ["I", "IV", "V"] or Nashville: ["1", "4", "5"]
}

interface ProgressionChord {
  roman: string
  nashville: string
  tonic: NoteName
  type: ChordType
}

interface Key {
  tonic: NoteName
  mode: string
  notes: NoteName[]
  signature: { sharps?: number; flats?: number }
  diatonicChords: DiatonicChord[]
  relativeKey: { tonic: NoteName; mode: string }
}
```

### Functions

```ts
// Keys
getKey(tonic: NoteName, mode: string): Key
getCircleOfFifths(): CircleEntry[]   // C G D A E B F# / Db Ab Eb Bb F — clockwise
stepCircle(tonic: NoteName, steps: number): NoteName
// steps > 0 = move clockwise (up a 5th), steps < 0 = move counter-clockwise (up a 4th)

// Scales
getScale(tonic: NoteName, type: ScaleType, positionIndex?: number): GuitarScale
listScaleTypes(): ScaleType[]

// Chords
getChord(tonic: NoteName, type: ChordType): GuitarChord
// voicings sourced from @tombatossals/chords-db; drop-2/3 appended for 4-voice chords
listChordTypes(): ChordType[]
generateDropVoicing(voicing: ChordVoicing, drop: 2 | 3): ChordVoicing

// Arpeggios
getArpeggio(tonic: NoteName, chordType: ChordType, positionIndex?: number): GuitarScale
// Returns chord tones only, using scale position system

// Diatonic harmony
getDiatonicChords(tonic: NoteName, mode: string): DiatonicChord[]

// Progressions
listProgressions(): Progression[]
getProgression(name: string, tonic: NoteName): ProgressionChord[]
```

---

## Rendering Layer

### `lib/rendering/tab.ts`

Takes a `GuitarScale` (or `GuitarScale` filtered to one position) and renders it as a VexFlow tablature SVG. Options:

```ts
interface TabRenderOptions {
  scale: GuitarScale
  positionIndex: number
  containerEl: HTMLElement
}
function renderTab(options: TabRenderOptions): void
```

Notes are rendered left-to-right, ascending, one position at a time. No rhythmic notation in Phase 3 — all notes are equal duration.

### `lib/rendering/fretboard.ts`

Takes a `GuitarScale` position and renders highlighted notes on a neck diagram using SVGuitar. Supports two label modes:

```ts
interface FretboardRenderOptions {
  scale: GuitarScale
  positionIndex: number
  labelMode: 'note' | 'interval'
  containerEl: HTMLElement
}
function renderFretboard(options: FretboardRenderOptions): void
```

In `'interval'` mode, dots are labelled "R", "2", "b3", etc. The chromatic scale with interval mode shows all 12 intervals across the full neck — a complete fretboard interval map.

### `lib/rendering/chord-diagram.ts`

Takes a `ChordVoicing` and renders a standard chord box using SVGuitar.

```ts
interface ChordDiagramRenderOptions {
  chord: GuitarChord
  voicingIndex: number
  containerEl: HTMLElement
}
function renderChordDiagram(options: ChordDiagramRenderOptions): void
```

---

## Reference Section UI

Route: `/reference`. A new nav item added alongside Library, Goals, History. Client component throughout — no server data fetching.

### Layout

```
┌─────────────────────────────────────────┐
│  Circle of 5ths (SVG, interactive)      │
│  Tap any key to select it               │
│  Outer ring: major keys                 │
│  Inner ring: relative minors            │
│  Centre: selected key name              │
├─────────────────────────────────────────┤
│  [ Scales ]  [ Arpeggios ]  [ Chords ]  │
├─────────────────────────────────────────┤
│  SCALES panel:                          │
│  [Scale type ▾]  [Position ▾]           │
│  [Tab] [Fretboard]  ○ Show intervals    │
│  ┌── tab or fretboard SVG ──────────┐   │
│  └────────────────────────────────────┘ │
│                                         │
│  ARPEGGIOS panel:                       │
│  [Chord type ▾]  [Position ▾]           │
│  [Tab] [Fretboard]  ○ Show intervals    │
│  ┌── tab or fretboard SVG ──────────┐   │
│  └────────────────────────────────────┘ │
│                                         │
│  CHORDS panel:                          │
│  [Chord type ▾]  [Voicing ▾]           │
│  ┌── chord diagram SVG ─────────────┐   │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**State:** selected key lives at the page level and is shared across all three panels. Changing the key in the circle updates all panels simultaneously.

**Chord voicings:** the voicing selector cycles through all voicings from `@tombatossals/chords-db` plus any generated drop-2/drop-3 voicings, each labelled (e.g. "Open", "Barre 3fr", "Drop 2").

### Components

| Component | File | Responsibility |
|---|---|---|
| `CircleOfFifths` | `_components/circle-of-fifths.tsx` | SVG circle, emits selected key |
| `ScalePanel` | `_components/scale-panel.tsx` | Scale type/position selectors + tab/fretboard toggle |
| `ArpeggioPanel` | `_components/arpeggio-panel.tsx` | Chord type/position selectors + tab/fretboard toggle |
| `ChordPanel` | `_components/chord-panel.tsx` | Chord type/voicing selector + chord diagram |
| `TabViewer` | `_components/tab-viewer.tsx` | Wraps `renderTab()` in a React component |
| `FretboardViewer` | `_components/fretboard-viewer.tsx` | Wraps `renderFretboard()` in a React component |
| `ChordDiagramViewer` | `_components/chord-diagram-viewer.tsx` | Wraps `renderChordDiagram()` in a React component |

---

## File Structure

```
lib/theory/
  index.ts
  types.ts
  keys.ts
  scales.ts
  chords.ts
  arpeggios.ts
  harmony.ts
  progressions.ts
  data/
    scale-patterns.ts

lib/rendering/
  tab.ts
  fretboard.ts
  chord-diagram.ts

app/(app)/reference/
  page.tsx
  _components/
    circle-of-fifths.tsx
    scale-panel.tsx
    arpeggio-panel.tsx
    chord-panel.tsx
    tab-viewer.tsx
    fretboard-viewer.tsx
    chord-diagram-viewer.tsx

__tests__/
  theory/
    keys.test.ts
    scales.test.ts
    chords.test.ts
    harmony.test.ts
    progressions.test.ts
```

---

## Testing

**Theory layer** — unit tests covering:
- `getScale('C', 'Major')` returns correct 7 notes and correct fret positions for each position
- All 7 modes of C major return notes consistent with their parent key
- `getDiatonicChords('G', 'Major')` returns correct Roman numerals, Nashville numbers, and chord types
- `getProgression('II-V-I', 'C')` returns Dm7, G7, Cmaj7
- `stepCircle('C', 1)` returns 'G', `stepCircle('C', -1)` returns 'F'
- Drop-2 voicing generation produces a lower second voice
- Altered scale returns correct 7 notes (C D♭ E♭ E G♭ A♭ B♭ in C)

**Rendering layer** — snapshot tests:
- `renderTab` produces expected SVG structure for a known scale/position
- `renderChordDiagram` produces expected SVG for a known chord voicing
- `renderFretboard` in interval mode labels the root dot "R"

**Reference UI** — component tests:
- Selecting a key in the circle updates the selected key state
- Scale panel passes selected key to `getScale`
- Tab/Fretboard toggle switches which renderer is active

No E2E tests in Phase 3 — all interactivity is client-side with no server round-trips.
