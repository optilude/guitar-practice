# Chord Fingerings: SVGuitar Migration Design

**Date:** 2026-04-04
**Status:** Approved

## Overview

Migrate the chord fingerings view in `ChordPanel` from `@tombatossals/react-chords` to `SVGuitar`, using the shared `ChordDiagram` component already built for the triads panel. Add a "Show" dropdown (Fingers / Notes / Intervals) that colours and labels each dot by interval degree. Remove `react-chords` as a dependency.

## Architecture

No new files. No changes to the data layer (`lib/theory/chords.ts`, `lib/theory/shells.ts`). All changes are in the component and test files.

## Files Changed

### `app/(app)/reference/_components/chord-panel.tsx`

**Imports:**
- Remove: `Chord` from `@tombatossals/react-chords/lib/Chord`
- Add: `ChordDiagram` from `./chord-diagram`
- Add: `Note` from `"tonal"` (for chroma calculation)
- Add: `INTERVAL_DEGREE_COLORS` from `"@/lib/rendering/tab"`
- Add: SVGuitar types `type Chord as SVGChord, OPEN, SILENT, type Finger, type FingerOptions, type Barre` from `"svguitar"`

**New constants:**
```typescript
const OPEN_CHROMA = [4, 9, 2, 7, 11, 4] as const  // E A D G B e (str6…str1)
const ROOT_COLOR = "#d97706"  // amber-600

// Maps shell chord display types → base Tonal symbol for note/interval lookup
const SHELL_TONAL_TYPE: Record<string, string> = {
  "maj7 shell": "maj7", "m7 shell": "m7", "7 shell": "7",
  "maj6 shell": "6",    "dim7/m6 shell": "m6",
}

type ShowMode = "fingers" | "notes" | "intervals"
```

**`degreeToColor(degree: string): string`** — maps interval degree labels to hex colours using exact equality (not `.includes()` — avoids false matches e.g. "13" matching "3"):
- `"R"` or `"1"` → `ROOT_COLOR` (amber)
- `"3"`, `"b3"`, `"#3"` → `INTERVAL_DEGREE_COLORS.third` (green)
- `"5"`, `"b5"`, `"#5"` → `INTERVAL_DEGREE_COLORS.fifth` (blue)
- `"7"`, `"b7"` → `INTERVAL_DEGREE_COLORS.seventh` (purple)
- `"6"`, `"b6"` → `INTERVAL_DEGREE_COLORS.sixth` (cyan)
- `"9"`, `"b9"`, `"#9"` → `INTERVAL_DEGREE_COLORS.second` (yellow)
- `"11"`, `"#11"` → `INTERVAL_DEGREE_COLORS.fourth` (rose)
- `"13"`, `"b13"` → `INTERVAL_DEGREE_COLORS.sixth` (cyan)
- fallback → `ROOT_COLOR`

**`toSVGChord(pos, showMode, isDark, chordNotes, chordIntervals): SVGChord`**:
1. Pre-compute `chordChromas = chordNotes.map(n => Note.get(n).chroma ?? -1)`
2. For each string `idx` (0=str6 … 5=str1), `str = 6 - idx`:
   - `frets[idx] === -1` → push `[str, SILENT]`
   - `frets[idx] === 0` → open string: `absFret = 0`; compute chroma; if in chord, colour + text; push `[str, OPEN, options]`
   - `frets[idx] >= 1` → closed: `absFret = relativeFret + baseFret - 1`; compute chroma; if in chord, colour + text; push `[str, relativeFret, options]`
3. Text per mode: `"fingers"` → `undefined`; `"notes"` → `chordNotes[matchIdx]`; `"intervals"` → `INTERVAL_TO_DEGREE[chordIntervals[matchIdx]] ?? chordIntervals[matchIdx]`
4. Text colour: open strings → `isDark ? "#f9fafb" : "#1f2937"` (visible on unfilled 'O' circle); closed → `"#ffffff"`
5. Barre arcs: for each entry in `pos.barres`, find all `idx` where `pos.frets[idx] === barreFret`, compute `fromString = 6 - maxIdx`, `toString = 6 - minIdx`, push `Barre`
6. Return: `{ fingers, barres: svgBarres, position: pos.baseFret > 1 ? pos.baseFret : undefined }`

**New state:**
```typescript
const [showMode, setShowMode] = useState<ShowMode>("fingers")
const [isDark, setIsDark]     = useState(false)
// MutationObserver on document.documentElement watching "class" attribute
```

**New memo for chord tones** (needed for Notes/Intervals across both shell and non-shell types — single memo to avoid calling `getChord()` twice for shell types):
```typescript
const { chordNotes, chordIntervals } = useMemo(() => {
  if (isShell) {
    const baseType = SHELL_TONAL_TYPE[chordType]
    if (!baseType) return { chordNotes: [], chordIntervals: [] }
    const info = getChord(root, baseType)
    return { chordNotes: info.notes, chordIntervals: info.intervals }
  }
  return { chordNotes: chord?.notes ?? [], chordIntervals: chord?.intervals ?? [] }
}, [root, chordType, isShell, chord])
```

**Fingerings render:**
- Remove `GUITAR_INSTRUMENT`, remove `<Chord>` usage, remove `dark:invert` wrapper
- Add Show dropdown (before the grid, same style as other selectors): Fingers / Notes / Intervals
- Render: `<ChordDiagram numFrets={4} chord={toSVGChord(pos, showMode, isDark, chordNotes, chordIntervals)} />`
- Label text below each diagram: `pos.label` (already stored — "Open", "Barre – 3fr", etc.)
- Grid stays `grid-cols-3 sm:grid-cols-4 lg:grid-cols-5`

### `__tests__/reference/chord-panel.test.tsx`

- Replace: `vi.mock("@tombatossals/react-chords/lib/Chord", ...)` 
- With: `vi.mock("@/app/(app)/reference/_components/chord-diagram", () => ({ ChordDiagram: () => <div data-testid="chord-diagram" /> }))`
- No other test changes needed (testid `"chord-diagram"` remains the same)

### `__tests__/reference/triad-panel.test.tsx`

- Remove the leftover unused `vi.mock("@tombatossals/react-chords/lib/Chord", ...)` block (triad panel no longer uses react-chords)

### `package.json`

- Remove `@tombatossals/react-chords` from `dependencies`
- Keep `@tombatossals/chords-db`

### `types/react-chords.d.ts`

- Delete the file (type declarations no longer needed)

## Data Format Notes

`ChordPosition.frets[]` from `getChordPositions()`:
- Index 0 = str6 (low E), index 5 = str1 (high e)
- `-1` = muted, `0` = open string, `1+` = fret number relative to `baseFret` (so absolute fret = `frets[i] + baseFret - 1`)

This is the same convention used in `triads.ts`. The `toSVGChord` function follows the same conversion logic as `triad-panel.tsx`'s `toSVGChord`.

## What Is NOT Changed

- `lib/theory/chords.ts` — `ChordPosition` interface and all public functions unchanged
- `lib/theory/shells.ts` — unchanged
- `@tombatossals/chords-db` — kept as a dependency (still used for chord data lookup)
- Fretboard view, Soloing view — unchanged
- `ChordDiagram` component — unchanged (already generic)
