# Chord Finder — Design Spec

**Date:** 2026-04-07

## Overview

An interactive chord identification tool. The user places dots on a chord diagram and sees real-time chord detection, ranked by simplicity and root-position preference. An optional key+scale filter narrows results to diatonic chords.

## Architecture

Approach B: extracted detection logic + focused client component.

```
lib/theory/chord-finder.ts               ← pure detection + ranking (no React)
app/(app)/tools/chord-finder/
  page.tsx                               ← server component (back link + h1)
  _components/
    chord-finder-client.tsx              ← "use client" — all state, wires pieces together
    interactive-chord-grid.tsx           ← SVGuitar rendering + interactive overlay
```

## Data Model

```ts
// Per-string state: null = muted (X), 0 = open (○), N = absolute fret number
type StringState = number | null
// Index 0 = string 6 (low E), index 5 = string 1 (high e)
type Frets = [StringState, StringState, StringState, StringState, StringState, StringState]

type DetectedChord = {
  symbol: string         // e.g. "Cm7", "Eb/G"
  root: string           // e.g. "C", "Eb"
  quality: string        // e.g. "m7", "M"
  bass: string           // lowest sounding note
  isRootPosition: boolean
  degreeLabel?: string   // e.g. "ii" — only when key filter is active
}
```

## Detection Logic (`lib/theory/chord-finder.ts`)

**Algorithm:**

1. For each non-muted string, compute chroma: `(OPEN_CHROMA[i] + fret) % 12`
   - `OPEN_CHROMA = [4, 9, 2, 7, 11, 4]` (low E, A, D, G, B, high e)
2. Map chroma to flat-preferred note names (`Db` not `C#`, `Bb` not `A#`, etc.)
3. Deduplicate pitch classes
4. Call `Chord.detect(uniqueNotes)` from tonal — returns symbol strings (e.g. `"CM"`, `"Em/G"`)
5. Bass note = lowest-index non-muted string's note
6. Parse each result: `isRootPosition` = bass note matches chord root
7. If key+scale filter active (both root and scaleType set): discard chords with tones outside the scale; add `degreeLabel`

**Ranking** (lower score shown first, ties broken left-to-right):

| Factor | Score |
|---|---|
| Root position | 0 |
| Inversion | 1 |
| Triad | +0 |
| 7th (maj7, m7, dom7, aug7) | +1 |
| 6th | +2 |
| Sus | +3 |
| Extended (9th, 11th, 13th) | +4 |
| Other | +5 |
| Symbol length (tiebreaker) | +length |

Show all results (no cap). Ranking may be revisited once tested in practice.

**Public API:**

```ts
export function detectChords(
  frets: (number | null)[],
  options?: { key?: string; scaleType?: string }
): DetectedChord[]
```

## Interactive Chord Grid (`interactive-chord-grid.tsx`)

**Rendering:** SVGuitar (`SVGuitarChord`) renders the visual diagram — consistent with chord and inversion panels. State is converted to a SVGuitar `Chord` object on each change and re-drawn via `useEffect`.

**Interactivity:** An absolutely-positioned transparent overlay grid sits on top of the SVGuitar SVG. Click zones are calculated from the SVGuitar `width`/`height` and its known regular layout (strings and frets evenly spaced within known margins).

**Interaction model:**
- Header row (above nut): click toggles open (○) ↔ muted (X)
- Fret cell: click sets that string to that absolute fret, clearing any previous fret on the same string; clicking the active fret mutes the string
- Start fret: `<input type="number">` positioned to the right of the first fret row, replacing SVGuitar's built-in position label

**Props:**

```ts
interface InteractiveChordGridProps {
  frets: (number | null)[]
  startFret: number
  onFretsChange: (frets: (number | null)[]) => void
  onStartFretChange: (fret: number) => void
}
```

## UI Layout (`chord-finder-client.tsx`)

**Key filter** (always visible, above everything):
```
Root: [Any ▾]   Scale: [Any ▾]   [Clear filter]
```
- Both default to "Any". Filter activates only when **both** root and scale type are set.
- Root dropdown: "Any" + 12 flat-preferred notes (Ab A Bb B C Db D Eb E F Gb G)
- Scale type dropdown: same optgroups as ScalePanel (Major modes, Melodic Minor, Harmonic Minor, Pentatonics, Other)
- [Clear filter] resets both to "Any"

**Main layout:**
- Desktop (md+): two columns — grid left, results right
- Mobile: stacked (filter → grid → results)

**Left column:**
- Interactive chord grid (SVGuitar + overlay)
- [Clear] button below the grid — resets all strings to muted

**Right column (results):**
- Empty state: "Place dots on the diagram to identify chords"
- Each result row: chord symbol (prominent, `font-medium`) + quality description + position label (root position / 1st inversion / 2nd inversion)
- When key filter active: degree badge (e.g. `ii`) on each row

## What's Not In Scope

- Saving or sharing a chord shape
- Audio playback
- Barre chord detection / display (SVGuitar handles this if the data warrants it)

## Notes

- The complexity tier ordering (triad → 7th → 6th → sus → extended → other) may need tuning once tested in practice.
- This is the first "finder" tool. Shared abstractions (layout, filter bar) should be extracted when building the second finder, not speculatively now.
