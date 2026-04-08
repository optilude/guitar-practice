# Scale Finder Implementation Design

## Goal

Build an interactive scale finder tool where the user clicks notes on a 15-fret guitar fretboard and sees, in real time, all scales that contain those notes — with the option to overlay the full scale on the fretboard.

## Architecture

A new tool page at `/tools/scale-finder` following the same page-wrapper + client-component pattern as the chord finder. The fretboard is rendered via Fretboard.js directly (not via the existing `renderFretboard()` pipeline), using its native click event system for interaction. Detection and ranking logic lives in a pure utility module (`lib/theory/scale-finder.ts`) with no UI dependencies.

**Tech Stack:** Next.js (app router), React, Fretboard.js (`@moonwave99/fretboard.js`), TonalJS (`tonal`), Tailwind CSS

---

## File Structure

| File | Role |
|------|------|
| `app/(app)/tools/scale-finder/page.tsx` | Route page: breadcrumb, h1, mounts `<ScaleFinderClient />` |
| `app/(app)/tools/scale-finder/_components/scale-finder-client.tsx` | Orchestrator: holds state, wires fretboard ↔ detection ↔ results |
| `app/(app)/tools/scale-finder/_components/interactive-fretboard.tsx` | Fretboard.js wrapper component |
| `lib/theory/scale-finder.ts` | Pure detection + ranking logic |

---

## Layout

The page stacks vertically on all screen sizes — the 15-fret fretboard needs the full width, so there are no side-by-side columns.

```
[ Key centre: (Any ▾) ]  [ ● Notes  ○ Intervals ]   ← Intervals toggle only when key selected
[ ══════════ 15-fret interactive fretboard ══════════ ]
[ Clear ]
──────────────────────────────────────────────────────
[ Results list ]
```

---

## Component: `interactive-fretboard.tsx`

**Props:**
```ts
interface InteractiveFretboardProps {
  selectedChromas: Set<number>       // pitch classes the user has toggled on
  previewedScale: ScaleMatch | null  // scale currently overlaid (outline dots)
  keyChroma: number | null           // root note chroma, or null if none selected
  labelMode: "notes" | "intervals"   // dot label content
  chromaToNote: string[]             // 12-element chroma→note map (enharmonic-aware)
  onChromaToggle: (chroma: number) => void
}
```

**Fretboard.js configuration:**
- 6 strings, frets 0–14 (15 frets), same visual style as the Reference page
- Reuses `INTERVAL_DEGREE_COLORS` from `lib/rendering/tab.ts` for interval-degree colour coding
- Dot colour when no key centre: accent colour for all selected notes
- Dot colour when key centre selected: `INTERVAL_DEGREE_COLORS[intervalIndex]` based on semitone distance from key chroma

**Dot types:**
- **Filled dot** — chroma is in `selectedChromas`. Label: note name or interval.
- **Outline dot** — chroma is in `previewedScale` but not in `selectedChromas` (the "extra" notes the scale adds). Same colour convention. Label: note name or interval.
- No dot — all other positions.

**Click handling:**
- Open-string chromas (index 0 = low E string 6, index 5 = high e string 1): `[4, 9, 2, 7, 11, 4]` (E A D G B E).
- Fretboard.js `.on('click', ({ string, fret }) => ...)` — Fretboard.js string numbers are 1-based with 1 = high e (string 1) and 6 = low E. Convert to 0-based index via `stringIndex = 6 - string`. Derive pitch chroma from `(OPEN_CHROMA[stringIndex] + fret) % 12` and call `onChromaToggle(chroma)`.
- Clicking an outline dot (extra scale note) selects it (adds it to `selectedChromas`).

**Re-render trigger:** The component re-initialises Fretboard.js whenever `selectedChromas`, `previewedScale`, `keyChroma`, `labelMode`, or `chromaToNote` changes.

---

## Component: `scale-finder-client.tsx`

**State:**
```ts
selectedChromas: Set<number>       // user-toggled pitch classes
filterKey: string                  // "" = Any, else e.g. "C"
labelMode: "notes" | "intervals"   // only relevant when filterKey is set
previewedScale: ScaleMatch | null  // scale row clicked in results
```

**Derived:**
```ts
scaleNotes = filterKey ? getScale(filterKey, "Major").notes : null  // used for enharmonic map only
chromaToNote = buildChromaMap(scaleNotes)     // from lib/theory/chord-finder (already exported)
keyChroma = filterKey ? Note.chroma(filterKey) : null
results = detectScales(selectedChromas, { key: filterKey || undefined })
```

**Controls:**
- **Key centre dropdown:** "Any" + Ab A Bb B C Db D Eb E F Gb G. Changing it clears `previewedScale`.
- **Notes/Intervals toggle:** only rendered when `filterKey` is non-empty.
- **Clear button:** resets `selectedChromas` to empty Set and clears `previewedScale`.

**`onChromaToggle(chroma)`:** Toggles chroma in `selectedChromas`. If the chroma was already selected and its removal leaves fewer than 3 chromas, also clears `previewedScale`.

---

## Detection Logic: `lib/theory/scale-finder.ts`

### Types

```ts
export type ScaleMatch = {
  root: string          // e.g. "C"
  type: string          // e.g. "Dorian"
  displayName: string   // e.g. "C Dorian"
  notes: string[]       // e.g. ["C", "D", "Eb", "F", "G", "A", "Bb"]
  intervals: string[]   // e.g. ["1", "2", "b3", "4", "5", "6", "b7"]
  extraNotes: number    // scale size minus selectedChromas.size
  commonalityTier: number  // 1 (most common) – 5 (most exotic)
}
```

### Commonality Tiers

| Tier | Scales |
|------|--------|
| 1 | Major (Ionian), Aeolian (Natural Minor), Pentatonic Major, Pentatonic Minor, Blues |
| 2 | Dorian, Mixolydian |
| 3 | Phrygian, Lydian, Locrian, Melodic Minor, Harmonic Minor |
| 4 | Modes of Melodic Minor (Dorian b2, Lydian Augmented, Lydian Dominant, Mixolydian b6, Locrian #2, Altered) |
| 5 | Modes of Harmonic Minor, Whole Tone, Diminished variants, Bebop, all others |

### Algorithm

```ts
export function detectScales(
  selectedChromas: Set<number>,
  options?: { key?: string },
): ScaleMatch[]
```

1. Return `[]` if `selectedChromas.size < 3`.
2. Determine roots to test: if `options.key` is set, use only that root; otherwise all 12 chromatic roots.
3. For each root × scale type combination:
   - Build the scale's chroma set using `getScale(root, type)`.
   - Skip if the scale's chroma set is not a superset of `selectedChromas`.
   - Compute `extraNotes = scaleSize - selectedChromas.size`.
   - Look up `commonalityTier` from the tier map.
   - Build `intervals[]` by converting tonal interval strings (e.g. `"3m"`) to degree notation (e.g. `"b3"`) using a `TONAL_TO_DEGREE` map defined in `lib/theory/scale-finder.ts` (duplicate the map from `chord-finder-client.tsx` — it is small and the two files are independent).
4. Sort results by `(extraNotes ASC, commonalityTier ASC, displayName ASC)`.
5. Return sorted list.

---

## Results Display

Each result row:
```
C Dorian                        ← scale name, medium weight
C  D  Eb  F  G  A  Bb          ← notes, small, spaced
1  2  b3  4  5  6  b7          ← formula, small, muted colour
```

The row is clickable. The active previewed row gets `bg-accent/10` with an `border-accent/20` border tint.

Clicking the same row again clears the preview. Clicking a different row replaces the preview.

**Placeholder states:**
- Fewer than 3 notes: "Select at least 3 notes to identify scales."
- 3+ notes, no matches: "No matching scales found." (rare in practice)

---

## Clear Button

Positioned below the fretboard, left-aligned. Uses `btn("destructive", "sm")`. Resets `selectedChromas` and `previewedScale`.

---

## Tests

`lib/theory/scale-finder.test.ts`:
- Returns `[]` for fewer than 3 chromas
- C + E + G (chromas 0, 4, 7) matches C Major, C Major Pentatonic, G Major, E Minor, etc.
- With `key: "C"`, only C-rooted scales appear
- Extra notes sort before commonality tier (a tight match with tier 2 beats a loose tier 1)
- Tier ordering: Major (tier 1) ranks before Dorian (tier 2) at equal extra notes
