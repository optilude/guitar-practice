# Fretboard.js Integration Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the broken SVGuitar-based fretboard view with Fretboard.js, showing the full neck (frets 0–15) with interval/degree colour-coding, optional box highlighting (CAGED, 3NPS, pentatonic boxes), and a note-name/interval toggle. Both the Scales and Arpeggios tabs benefit.

**Architecture:** Fretboard.js is used purely as an SVG renderer (`setDots()` + `style()` + `render()`). All music theory (note positions, box membership) is computed from our own TonalJS code and existing `SCALE_PATTERNS` data. The only exception is pentatonic/blues box membership, which delegates to Fretboard.js's `FretboardSystem` + `Systems.pentatonic` for the canonical 5-box definitions.

**Tech Stack:** `@moonwave99/fretboard.js`, TonalJS, existing `scale-patterns.ts`, React (client components).

---

## Colour Coding

Matches the existing tab view exactly (exported from `lib/rendering/tab.ts`):

| Degree | Colour |
|--------|--------|
| Root (R) | CSS `--accent` (resolved at render time) |
| 3rd / b3 | `#16a34a` (green-600) |
| 5th / b5 / #5 | `#2563eb` (blue-600) |
| 7th / b7 | `#9333ea` (purple-600) |
| All other intervals | CSS `--muted-foreground` |

---

## Box Systems

### Scales

| Scale type | Box systems available |
|---|---|
| Major, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian, Harmonic Minor, Melodic Minor, Altered | CAGED + 3NPS |
| Pentatonic Major, Pentatonic Minor | Pentatonic boxes (Fretboard.js) |
| Blues | Pentatonic boxes (Fretboard.js, mapped to `'minor pentatonic'`) |
| Whole Tone, Diminished Whole-Half, Diminished Half-Whole | No box system |

When a box is active, **out-of-box dots are dimmed** (reduced opacity, grey fill/stroke) but remain visible.

### Arpeggios

Arpeggio notes are a subset of their parent scale's notes, so the parent scale's box positions apply directly. The dots rendered are always arpeggio tones only (not all parent scale tones). In-box arpeggio tones are full opacity and colour-coded; out-of-box arpeggio tones are dimmed.

**Parent scale mapping:**

| Chord type(s) | Parent scale | Box systems |
|---|---|---|
| major, maj7, maj9, 6, maj6 | Major | CAGED + 3NPS |
| minor, m7, m9 | Dorian | CAGED + 3NPS |
| 7, 9, 13 | Mixolydian | CAGED + 3NPS |
| m7b5 | Locrian | CAGED + 3NPS |
| mmaj7, mmaj9 | Melodic Minor | CAGED + 3NPS |
| dim, dim7 | No mapping | Position windows only |
| aug, aug7 | No mapping | Position windows only |
| All others | No mapping | Position windows only |

Position windows (fallback): the existing 5 `POSITION_WINDOWS` fret-range boxes, shown as dimmed regions.

---

## Box Membership Computation

### CAGED (scales + arpeggios)

`SCALE_PATTERNS[scaleType][positionIndex]` holds `[guitarString, fretOffset]` shapes where `fretOffset` is relative to the root fret on string 6 (low E). Convert to absolute frets:

```
absoluteFret = rootFretOnLowE(tonic) + fretOffset
```

Negative frets: add 12 (shift up one octave). Frets > 15: discard. Build a `Set<"string:fret">` for O(1) membership lookup.

### 3NPS (scales + arpeggios)

Computed algorithmically by `build3NPSPositions(tonic, scaleNotes, scaleIntervals)`. Returns 7 positions (one per scale degree).

Algorithm for position *i* (0-indexed, starting on degree *i*):
1. Find the absolute fret of scale degree *i* on string 6; call this `startFret`.
2. For each string 6 → 1:
   - Find the 3 consecutive scale-tone frets at or above `startFret` on that string.
   - Set `startFret` for the next string = lowest fret found on current string.
3. Collect all `{ string, fret }` pairs into a `Set<"string:fret">`.

### Pentatonic boxes (Fretboard.js)

```typescript
import { FretboardSystem, Systems } from '@moonwave99/fretboard.js'

const system = new FretboardSystem() // standard tuning, 15 frets
const positions = system.getScale({ type: fbScaleType, root: tonic, box: { box: boxIndex + 1, system: Systems.pentatonic } })
const inBoxSet = new Set(positions.filter(p => p.inBox).map(p => `${p.string}:${p.fret}`))
```

Scale type mapping: `'Pentatonic Minor'` → `'pentatonic minor'`, `'Pentatonic Major'` → `'major pentatonic'`, `'Blues'` → `'minor pentatonic'`.

If Fretboard.js throws for an unsupported type, fall back to `SCALE_PATTERNS` for that scale.

### Full fretboard positions

```typescript
function getAllFretboardPositions(
  tonic: string,
  scaleNotes: string[],
  scaleIntervals: string[]
): FretboardDot[]
```

For each string (1–6) × fret (0–15): check if `(openChroma[string] + fret) % 12` matches any scale note chroma. If so, record `{ string, fret, interval, note }`.

---

## Files Changed

| File | Change |
|---|---|
| `package.json` | Add `@moonwave99/fretboard.js` dependency |
| `lib/rendering/fretboard.ts` | Rewrite: replace SVGuitar with Fretboard.js; add `getAllFretboardPositions()`, `getBoxMembershipSet()`, `build3NPSPositions()`, `CHORD_TYPE_TO_SCALE` map |
| `app/(app)/reference/_components/fretboard-viewer.tsx` | Update props: replace `positionIndex` with `boxSystem` + `boxIndex` |
| `app/(app)/reference/_components/scale-panel.tsx` | Replace position dropdown with box-system + box-number selectors (fretboard mode only) |
| `app/(app)/reference/_components/arpeggio-panel.tsx` | Add box-system + box-number selectors (fretboard mode only) |

No changes to `lib/theory/scales.ts`, `lib/theory/arpeggios.ts`, `lib/theory/types.ts`, or `lib/rendering/tab.ts`.

---

## Component Props (updated)

### `FretboardViewer`

```typescript
interface FretboardViewerProps {
  scale: GuitarScale           // tonic, type, notes, intervals, positions
  boxSystem: 'none' | 'caged' | '3nps' | 'pentatonic' | 'windows'
  boxIndex: number             // 0-based; ignored when boxSystem === 'none'
  labelMode: 'note' | 'interval'
}
```

### `ScalePanel` (fretboard mode controls)

- **Box system** `<select>`: options depend on scale type (see Box Systems table above); always includes "All notes" (none)
- **Box number** `<select>`: shown only when boxSystem ≠ 'none'; options displayed as 1–N (converted to 0-based `boxIndex` prop internally); resets to 1 when box system changes

### `ArpeggioPanel` (fretboard mode controls)

- Same box system / box number selectors as ScalePanel, driven by the chord type's parent scale
- Falls back to "Position windows" system for unmapped chord types

---

## Unsupported / Deferred

- Arpeggios with no parent scale mapping (dim, aug, etc.) use position windows only — no CAGED or 3NPS.
- No box system for Whole Tone or Diminished scales — full fretboard renders without highlighting.
- If `@moonwave99/fretboard.js` lacks ESM-compatible exports for `FretboardSystem`/`Systems` in the Next.js build, fall back to `SCALE_PATTERNS` for pentatonic boxes and note this as a known issue.
