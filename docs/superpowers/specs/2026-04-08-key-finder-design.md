# Key Finder Implementation Design

## Goal

Build an interactive key finder tool where the user enters a chord progression and sees, in real time, all keys/modes that best fit those chords — ranked by fit quality and commonality.

## Architecture

A new tool page at `/tools/key-finder` following the same page-wrapper + client-component pattern as the chord finder and scale finder. Detection and scoring logic lives in a pure utility module (`lib/theory/key-finder.ts`) with no UI dependencies. The commonality tier map is extracted from `lib/theory/scale-finder.ts` into a new shared module `lib/theory/commonality-tiers.ts`, imported by both tools.

**Tech Stack:** Next.js (app router), React, `@dnd-kit/core` + `@dnd-kit/sortable`, TonalJS (`tonal`), Tailwind CSS

---

## File Structure

| File | Role |
|------|------|
| `app/(app)/tools/key-finder/page.tsx` | Route page: breadcrumb, h1, mounts `<KeyFinderClient />` |
| `app/(app)/tools/key-finder/_components/key-finder-client.tsx` | State + orchestration: holds chords, selected result, wires input ↔ detection ↔ results |
| `app/(app)/tools/key-finder/_components/chord-input-row.tsx` | DnD sortable chord tiles + "+" button |
| `app/(app)/tools/key-finder/_components/chord-tile.tsx` | Single tile: drag handle, chord name/edit mode, ✕ button |
| `lib/theory/key-finder.ts` | Pure detection + scoring logic |
| `lib/theory/commonality-tiers.ts` | Shared commonality tier map (extracted from `scale-finder.ts`; imported by both) |

`lib/theory/scale-finder.ts` is updated to import `COMMONALITY_TIER` from `commonality-tiers.ts` rather than defining it inline.

---

## Layout

```
[ Key Finder ]

[ Cm7 ≡ ✕ ]  [ F7 ≡ ✕ ]  [ Bb ≡ ✕ ]  [ Eb ≡ ✕ ]  [+]
  ↑ tiles wrap to multiple lines; drag handle (≡) on left, ✕ on right
──────────────────────────────────────────────────────
  Bb major     100%   [ ii ]  [ V ]   [ I ]   [ IV ]
  Eb major      75%   [ vi ]  [ II7 ] [ V ]   [ I ]
  F Dorian      60%   [ III ] [ VI ]  [  Bb  ] [ V ]   ← greyed = non-diatonic
```

The page stacks vertically. No side-by-side columns — the chord input row needs full width.

---

## Component: `chord-tile.tsx`

**Props:**
```ts
interface ChordTileProps {
  id: string                    // stable key for DnD
  symbol: string                // e.g. "Cm7"
  analysis: ChordAnalysis | null  // null until a key result is selected
  isEditing: boolean
  onCommit: (symbol: string) => void
  onRemove: () => void
  onStartEdit: () => void
}
```

**Normal mode:**
- Drag handle (⠿) on the left — connected to `useSortable` from `@dnd-kit/sortable`
- Chord symbol centred
- ✕ button on the right
- If `analysis` is non-null and `role === "diatonic"` or `"borrowed"`: render as `ChordQualityBlock` with the matched degree colour and roman numeral above
- If `analysis` is non-null and `role === "non-diatonic"` or `"secondary-dominant"`: render greyed out (no degree colour, muted border, no roman numeral)
- If `analysis` is null (no key selected): neutral style — border-2 border-border bg-card, same dimensions as `ChordQualityBlock`
- Click anywhere on the tile body to enter edit mode

**Edit mode:**
- Tile body replaced by a `<input type="text">` of the same width
- Autocomplete dropdown appears below (see below)
- Enter or selecting a suggestion commits; Escape cancels (removes tile if it was newly added)

**Autocomplete dropdown:**
- Greedy root detection: match the longest prefix against `["Ab","A","Bb","B","C","Db","D","Eb","E","F","Gb","G"]`
- Filter `listChordDbSuffixes()` by prefix match on the remainder of the typed string
- Show up to 10 suggestions as a dropdown list
- Pressing arrow keys navigates suggestions

---

## Component: `chord-input-row.tsx`

**Props:**
```ts
interface ChordInputRowProps {
  chords: Array<{ id: string; symbol: string }>
  editingId: string | null
  selectedResult: KeyMatch | null     // for degree-colour annotations
  onReorder: (oldIndex: number, newIndex: number) => void
  onCommit: (id: string, symbol: string) => void
  onRemove: (id: string) => void
  onStartEdit: (id: string) => void
  onAdd: () => void
}
```

- `DndContext` (closestCenter) wraps a `SortableContext` (horizontalListSortingStrategy) containing all `ChordTile` components
- The `[+]` button sits outside the `SortableContext`
- Tiles are `flex-wrap` — they wrap to multiple lines on narrow screens
- `onAdd` appends a new chord with a generated id and empty symbol, setting it as the editing tile

---

## Component: `key-finder-client.tsx`

**State:**
```ts
chords: Array<{ id: string; symbol: string }>   // the progression
editingId: string | null                         // which tile is in edit mode
selectedResult: KeyMatch | null                  // clicked result row
```

**Derived:**
```ts
parsedChords = chords.map(c => parseChord(c.symbol)).filter(Boolean)
results = parsedChords.length >= 2 ? detectKey(parsedChords) : []
```

**Handlers:**
- `handleAdd`: append `{ id: crypto.randomUUID(), symbol: "" }`, set `editingId` to new id
- `handleCommit(id, symbol)`: update chord symbol, clear `editingId`; if symbol is empty, remove the chord
- `handleRemove(id)`: remove chord, clear `selectedResult`
- `handleReorder(oldIndex, newIndex)`: use `arrayMove` from `@dnd-kit/sortable`
- `handleResultClick(result)`: toggle `selectedResult` (clicking the active result deselects it)
- `handleStartEdit(id)`: set `editingId`, clear `selectedResult`

---

## Detection Logic: `lib/theory/key-finder.ts`

### Types

```ts
export type InputChord = {
  root: string      // e.g. "C", "F#"
  type: string      // raw suffix e.g. "m7", "maj9", ""
  symbol: string    // original input e.g. "Cm7"
}

export type ChordRole = "diatonic" | "borrowed" | "secondary-dominant" | "non-diatonic"

export type ChordAnalysis = {
  inputChord: InputChord
  degree: number | null     // 1–7, or null
  roman: string | null
  score: number             // 0 | 0.5 | 0.6 | 1.0
  role: ChordRole
}

export type KeyMatch = {
  tonic: string
  mode: string
  displayName: string       // e.g. "Bb major"
  score: number             // 0–1 (capped for display at 100%)
  diatonicCount: number
  chordAnalysis: ChordAnalysis[]
  commonalityTier: number   // from shared COMMONALITY_TIER map
}
```

### Chord parsing

```ts
export function parseChord(symbol: string): InputChord | null
```

Uses TonalJS `Chord.get(symbol)` to validate. Returns `null` for unrecognised symbols. Stores the raw `symbol`, parsed `root` (tonic letter), and `type` (chord type suffix).

### Chord type normalisation

Maps any chord type string to a functional family used for diatonic matching. Examples:

| Input type(s) | Normalised family |
|---|---|
| `""`, `maj`, `M`, `5` | `"major"` |
| `m`, `min`, `-` | `"minor"` |
| `7`, `9`, `11`, `13`, `7sus4`, `7b5`, `7#5`, `7#11`, `9#11`, `13b9`, `alt` | `"dom7"` |
| `maj7`, `maj9`, `maj11`, `maj13`, `maj7#11`, `Δ`, `Δ7` | `"maj7"` |
| `6`, `69`, `6/9`, `add9`, `add11` | `"major"` (treated as major triad extensions) |
| `m6`, `m69`, `m6/9` | `"minor"` |
| `m7`, `m9`, `m11`, `m13`, `-7` | `"m7"` |
| `mmaj7`, `mM7`, `-maj7` | `"mmaj7"` |
| `m7b5`, `ø`, `ø7` | `"m7b5"` |
| `dim`, `dim7`, `°7` | `"dim7"` |
| `aug`, `+`, `aug7` | `"aug"` |
| `maj7#5` | `"maj7"` |
| `sus2`, `sus4` | `"sus"` |

Anything not in the map falls back to `"major"`.

### Algorithm

```ts
export function detectKey(chords: InputChord[]): KeyMatch[]
```

1. Return `[]` if `chords.length < 2`.
2. For each of 12 roots × all entries in `ALL_KEY_MODES` (from `commonality-tiers.ts`):
   a. Call `getKey(root, modeName)` to get `diatonicChords: DiatonicChord[]`.
   b. Build a lookup: `{ rootChroma → { normalisedType → DiatonicChord } }` from the diatonic chords (also normalise the diatonic chord types).
   c. For each input chord:
      - Normalise its type.
      - Check lookup for matching root chroma + normalised type → `"diatonic"`, score **1.0**, record degree + roman.
      - Else check the **parallel major** (same tonic, mode = "major") and **parallel minor** (same tonic, mode = "minor") diatonic sets for the same root + normalised type → `"borrowed"`, score **0.6**, degree = matched degree in the parallel key. (For a major key candidate, only check the parallel minor. For a minor key candidate, only check the parallel major. For modal candidates, check both.)
      - Else check if the chord is a secondary dominant: its root chroma is exactly 7 semitones above (a perfect fifth above) any diatonic chord's root chroma, and its normalised type is `"dom7"` or `"major"` → `"secondary-dominant"`, score **0.5**, degree = null.
      - Else → `"non-diatonic"`, score **0.0**, degree = null.
   d. Compute base score: `sum(per-chord scores) / chords.length`.
   e. Bonuses (additive):
      - First or last chord's root chroma === key tonic chroma → **+0.10**
      - Last two chords form a V→I cadence (by chroma) → **+0.05**
      - Last three chords form a ii→V→I cadence → **+0.05** (in addition to V→I bonus)
   f. Final score = base + bonuses.
3. Filter: `score >= 0.5`.
4. Sort: `score DESC`, then `commonalityTier ASC`, then `displayName ASC`.
5. Return.

### Shared module: `lib/theory/commonality-tiers.ts`

The module exports the tier map keyed by the **display name** strings already used in `scale-finder.ts` (e.g. `"Major"`, `"Aeolian"`, `"Dorian"`). It also exports a parallel lookup keyed by the **mode name** strings passed to `getKey()` (e.g. `"major"`, `"minor"`, `"dorian"`), so both consumers can look up tiers without a string conversion step.

```ts
// Keyed by display name — used by scale-finder.ts (same keys as DISPLAY_TO_TONAL)
export const COMMONALITY_TIER: Record<string, number> = {
  // Tier 1 — ubiquitous
  "Major": 1, "Aeolian": 1, "Pentatonic Major": 1, "Pentatonic Minor": 1, "Blues": 1,
  // Tier 2 — very common
  "Dorian": 2, "Mixolydian": 2,
  // Tier 3 — common in jazz/classical
  "Phrygian": 3, "Lydian": 3, "Locrian": 3, "Melodic Minor": 3, "Harmonic Minor": 3,
  // Tier 4 — jazz/fusion (Melodic Minor modes)
  "Dorian b2": 4, "Lydian Augmented": 4, "Lydian Dominant": 4,
  "Mixolydian b6": 4, "Locrian #2": 4, "Altered": 4,
  // Everything else is tier 5 (default)
}

// Keyed by getKey() mode name — used by key-finder.ts
export const MODE_COMMONALITY_TIER: Record<string, number> = {
  // Tier 1
  "major": 1, "minor": 1,
  // Tier 2
  "dorian": 2, "mixolydian": 2,
  // Tier 3
  "phrygian": 3, "lydian": 3, "locrian": 3, "melodic minor": 3, "harmonic minor": 3,
  // Tier 4
  "dorian b2": 4, "lydian augmented": 4, "lydian dominant": 4,
  "mixolydian b6": 4, "locrian #2": 4, "altered": 4,
  // Everything else is tier 5 (default)
}

// All (displayName, modeName) pairs that key-finder iterates over.
// modeName is passed to getKey(); displayName is used for COMMONALITY_TIER lookup and display.
export const ALL_KEY_MODES: Array<{ displayName: string; modeName: string }> = [
  { displayName: "Major",             modeName: "major" },
  { displayName: "Aeolian",          modeName: "minor" },
  { displayName: "Dorian",           modeName: "dorian" },
  { displayName: "Phrygian",         modeName: "phrygian" },
  { displayName: "Lydian",           modeName: "lydian" },
  { displayName: "Mixolydian",       modeName: "mixolydian" },
  { displayName: "Locrian",          modeName: "locrian" },
  { displayName: "Melodic Minor",    modeName: "melodic minor" },
  { displayName: "Dorian b2",        modeName: "dorian b2" },
  { displayName: "Lydian Augmented", modeName: "lydian augmented" },
  { displayName: "Lydian Dominant",  modeName: "lydian dominant" },
  { displayName: "Mixolydian b6",    modeName: "mixolydian b6" },
  { displayName: "Locrian #2",       modeName: "locrian #2" },
  { displayName: "Altered",          modeName: "altered" },
  { displayName: "Harmonic Minor",   modeName: "harmonic minor" },
  { displayName: "Locrian #6",       modeName: "locrian #6" },
  { displayName: "Ionian #5",        modeName: "ionian #5" },
  { displayName: "Dorian #4",        modeName: "dorian #4" },
  { displayName: "Phrygian Dominant",modeName: "phrygian dominant" },
  { displayName: "Lydian #2",        modeName: "lydian #2" },
  { displayName: "Altered Diminished",modeName: "altered diminished" },
]
```

`scale-finder.ts` imports `COMMONALITY_TIER` from this module instead of defining it inline.

---

## Results Display

```
Bb major     100%   [ ii ]  [ V ]   [ I ]   [ IV ]
Eb major      75%   [ vi ]  [ II7 ] [ V ]   [ I ]
F Dorian      60%   [ III ] [ VI ]  [ Bb ]  [ V ]
```

Each result row:
- **Key name** — `text-sm font-medium text-foreground`
- **Percentage** — `Math.round(Math.min(score, 1) * 100)%`, small muted text, right of key name
- **Chord tiles** — the input chords re-rendered with roman numerals and degree colours via `ChordQualityBlock` for diatonic/borrowed chords; greyed-out (border-border, bg-card, text-muted-foreground) for non-diatonic/secondary-dominant chords
- Row is a `<button>` — clicking selects/deselects it (`bg-accent/10 border border-accent/20` when active)
- When a row is selected, the input chord tiles at the top also update to show degree colours for that key

**Grouping:** If results span multiple commonality tiers, insert a subtle heading between groups:
- Tier 1: "Common keys"
- Tier 2–3: "Modal keys"
- Tier 4–5: "Exotic keys"

Only show a group heading if that group has at least one result.

**Placeholder states:**
- Fewer than 2 chords: `"Add at least 2 chords to identify possible keys."`
- 2+ chords, no matches: `"No matching keys found — try removing or changing a chord."`

---

## Tests

`lib/theory/key-finder.test.ts`:
- `parseChord("Cm7")` returns `{ root: "C", type: "m7", symbol: "Cm7" }`
- `parseChord("xyz")` returns `null`
- Normalisation: `"9"` → `"dom7"`, `"maj9"` → `"maj7"`, `"6/9"` → `"major"`, `"m7b5"` → `"m7b5"`
- `detectKey([])` and `detectKey([one chord])` return `[]`
- `[Cm7, F7, BbMaj7, EbMaj7]` — Bb major appears first with score ~1.0
- `[C, F, G, Bb]` — C major appears with score < 1.0 (Bb is borrowed), Bb major appears with score 1.0
- With only diatonic chords, score equals 1.0 before bonuses
- Tonic resolution bonus applied when last chord matches key tonic
- Results sorted: higher score before lower, tier 1 before tier 3 at equal score
- `lib/theory/commonality-tiers.ts` exports `COMMONALITY_TIER` and it is the same object used by both key-finder and scale-finder
