# Chord and Triad Fretboard Views — Design Spec

## Goal

Add a full-neck fretboard diagram to the chord panel and the triad panel, showing all chord tones (note names or intervals) across every position on the fretboard.

## Architecture

Chords and arpeggios are the same concept — a set of tones played across the neck — so both views share the same data layer (`getArpeggio`) and the same rendering component (`FretboardViewer`). Two thin adapter functions translate chord/triad type identifiers into the `GuitarScale` shape that the existing fretboard system expects.

## Tech Stack

- `getArpeggio()` from `lib/theory/arpeggios.ts` — position computation engine
- `FretboardViewer` from `app/(app)/reference/_components/fretboard-viewer.tsx` — rendering
- `getArpeggioBoxSystems` / `CHORD_TYPE_TO_SCALE` from `lib/rendering/fretboard.ts` — box system availability
- Existing React state patterns from `arpeggio-panel.tsx`

---

## Data Layer

### `getChordAsScale(tonic: string, dbSuffix: string): GuitarScale`

Added to `lib/theory/chords.ts`, exported from `lib/theory/index.ts`.

Maps chords-db suffix → tonal.js symbol, then delegates entirely to `getArpeggio(tonic, tonalSym)`.

**Mapping rules (precedence order):**

Build a single `CHORD_DB_TO_TONAL` lookup (checked in order, fallthrough to passthrough):

```typescript
const CHORD_DB_TO_TONAL: Record<string, string> = {
  // Shell types (checked first — contain spaces)
  "maj7 shell":    "maj7",
  "m7 shell":      "m7",
  "7 shell":       "7",
  "maj6 shell":    "6",
  "dim7/m6 shell": "m6",
  // Common suffixes that differ between chords-db and tonal.js
  major: "maj",
  minor: "m",
  // Edge cases from existing DB_SUFFIX_TO_TONAL in chords.ts
  alt:       "7alt",
  aug9:      "9#5",
  "maj7b5":  "M7b5",
  mmaj7:     "mM7",
  "mmaj7b5": "oM7",
  mmaj9:     "mM9",
  // All other db suffixes ("maj7", "m7", "7", "dim7", "dim", "aug",
  // "9", "sus2", "sus4", "7sus4", etc.) are already valid tonal symbols
  // and are passed through via: CHORD_DB_TO_TONAL[dbSuffix] ?? dbSuffix
}
```

The returned `GuitarScale.type` is the tonal symbol (e.g. `"maj"`), which means `getArpeggioBoxSystems(scale.type)` and `CHORD_TYPE_TO_SCALE[scale.type]` work correctly without any changes to the fretboard rendering system.

### `getTriadAsScale(tonic: string, type: string): GuitarScale`

Added to `lib/theory/triads.ts`, exported from `lib/theory/index.ts`.

Maps triad type string → tonal symbol, delegates to `getArpeggio(tonic, tonalSym)`.

**Mapping:**
- `"major"` → `"maj"`
- `"minor"` → `"m"`
- `"diminished"` → `"dim"`
- `"augmented"` → `"aug"`

---

## Chord Panel Changes

**File:** `app/(app)/reference/_components/chord-panel.tsx`

### Layout (top to bottom)

1. Chord type selector (unchanged)
2. Notes + Formula (unchanged)
3. Fretboard controls: label mode checkbox + box system/box index selectors
4. `FretboardViewer`
5. Voicing grid or shell formula (unchanged, below)

The fretboard is always visible — no toggle. This applies to all chord types including shell voicings (which previously showed no diagram at all; the fretboard gives them a useful visual).

### New state

```typescript
const [labelMode, setLabelMode] = useState<"note" | "interval">("interval")
const [boxSystem, setBoxSystem] = useState<BoxSystem>("none")
const [boxIndex, setBoxIndex]   = useState(0)
```

### New derived values

```typescript
const chordScale = useMemo(
  () => getChordAsScale(tonic, chordType),
  [tonic, chordType]
)
const availableBoxSystems = useMemo(
  () => getArpeggioBoxSystems(chordScale.type),
  [chordScale.type]
)
const parentScaleType = CHORD_TYPE_TO_SCALE[chordScale.type]
const boxCount = useMemo(() => {
  if (boxSystem === "caged")   return CAGED_BOX_LABELS.length  // 5
  if (boxSystem === "3nps")    return 7
  if (boxSystem === "windows") return chordScale.positions.length
  return 0
}, [boxSystem, chordScale.positions.length])
```

When `chordType` changes, reset `boxSystem` to `"none"` and `boxIndex` to `0` if the current box system is no longer in `availableBoxSystems` (same pattern as arpeggio panel).

### Box system controls

Shown only when `availableBoxSystems.length > 1` (same condition as arpeggio panel). Chords with a known parent scale in `CHORD_TYPE_TO_SCALE` (maj, m, m7, 7, 9, and shell types whose tonal symbol is in the map) offer CAGED and 3NPS. Others (aug, sus2, sus4, 7sus4) get "windows" only. The logic is entirely driven by `getArpeggioBoxSystems(chordScale.type)` — no new cases to handle.

### FretboardViewer props

```tsx
<FretboardViewer
  scale={chordScale}
  boxSystem={boxSystem}
  boxIndex={safeBoxIndex}
  labelMode={labelMode}
  boxScaleType={parentScaleType}
/>
```

---

## Triad Panel Changes

**File:** `app/(app)/reference/_components/triad-panel.tsx`

### Layout (top to bottom)

1. Filter bar: triad type + voicing/inversion/string set selectors (unchanged)
2. Formula (unchanged)
3. Label mode checkbox (note/interval)
4. `FretboardViewer`
5. Voicing grid grouped by string set (unchanged, below)

The fretboard is always visible — no toggle. It is independent of the voicing/inversion/string set filters; it always shows all occurrences of the 3 chord tones across the full neck. The filters below only affect the chord diagram grid.

### New state

```typescript
const [labelMode, setLabelMode] = useState<"note" | "interval">("interval")
```

No box system controls — triads have only 3 notes, and the fretboard's role here is to show the full-neck view of the chord tones. The voicing diagrams below already show specific playable positions.

### New derived value

```typescript
const triadScale = useMemo(
  () => getTriadAsScale(tonic, triadType),
  [tonic, triadType]
)
```

### FretboardViewer props

```tsx
<FretboardViewer
  scale={triadScale}
  boxSystem="none"
  boxIndex={0}
  labelMode={labelMode}
/>
```

---

## Tests

### `__tests__/theory/chord-fretboard.test.ts`

- `getChordAsScale("C", "major")` → notes `["C", "E", "G"]`, type `"maj"`
- `getChordAsScale("C", "minor")` → notes `["C", "Eb", "G"]`, type `"m"`
- `getChordAsScale("C", "maj7")` → notes `["C", "E", "G", "B"]`, type `"maj7"`
- `getChordAsScale("C", "maj7 shell")` → notes `["C", "E", "B"]`, type `"maj7"`
- `getChordAsScale("C", "7 shell")` → notes `["C", "E", "Bb"]`, type `"7"`
- All calls return a non-empty `positions` array

### `__tests__/theory/triad-fretboard.test.ts`

- `getTriadAsScale("C", "major")` → notes `["C", "E", "G"]`, type `"maj"`
- `getTriadAsScale("C", "minor")` → notes `["C", "Eb", "G"]`, type `"m"`
- `getTriadAsScale("C", "diminished")` → notes `["C", "Eb", "Gb"]`, type `"dim"`
- `getTriadAsScale("C", "augmented")` → notes `["C", "E", "G#"]`, type `"aug"`
- All calls return a non-empty `positions` array

### Component tests

Extended in `__tests__/reference/chord-panel.test.tsx` and `__tests__/reference/triad-panel.test.tsx`:

- Chord panel renders a fretboard container (`div` wrapping `FretboardViewer`) in its default state
- Triad panel renders a fretboard container in its default state
- Label mode checkbox toggles `labelMode` state in chord panel
- Label mode checkbox toggles `labelMode` state in triad panel

---

## Files Touched

| Action | File |
|--------|------|
| Modify | `lib/theory/chords.ts` |
| Modify | `lib/theory/triads.ts` |
| Modify | `lib/theory/index.ts` |
| Modify | `app/(app)/reference/_components/chord-panel.tsx` |
| Modify | `app/(app)/reference/_components/triad-panel.tsx` |
| Create | `__tests__/theory/chord-fretboard.test.ts` |
| Create | `__tests__/theory/triad-fretboard.test.ts` |
| Modify | `__tests__/reference/chord-panel.test.tsx` |
| Modify | `__tests__/reference/triad-panel.test.tsx` |

No new components needed — `FretboardViewer` is reused as-is.
