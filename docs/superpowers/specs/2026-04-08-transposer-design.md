# Transposer Tool Design

## Goal

Build a transposer tool that lets the user enter a chord progression in a known source key, view roman numeral analysis for every chord (including non-diatonic ones), then pick a target root and see the progression transposed to that key.

## Architecture

The transposer reuses the chord input row (shared with key finder), extends the existing chord analysis logic to always emit a roman numeral, and adds a thin transposition layer that handles enharmonic spelling from the target key's signature. The key finder also benefits from the roman numeral extension.

**Tech stack:** Next.js App Router, TonalJS, `@dnd-kit` (via shared chord input), Tailwind + existing component library.

---

## Layout and UX

Vertical pipeline — all sections visible at once:

1. **Source key selectors** — root dropdown (all 17 enharmonic spellings: Ab A A# Bb B C C# Db D D# Eb E F F# Gb G G#) and mode dropdown (grouped `<optgroup>`: Major scale modes, Melodic minor modes, Harmonic minor modes, Pentatonic/other — sourced from `ALL_KEY_MODES`). Defaults to C / Major (Ionian).

2. **Chord input row** — the shared `ChordInputRow` component (drag-to-reorder, keyboard nav, autocomplete, `+` button). Because the source key is always known, `ChordAnalysis[]` is computed immediately and passed to the row; tiles always show `ChordQualityBlock` with roman numerals and degree colours. A Clear button sits below the row.

3. **Target key selector** — root dropdown (same 17-note list). Displayed once ≥1 chord is entered. A static mode label sits beside the dropdown showing the source mode name (e.g. "Target: [F ▼] · Dorian"), making it clear that mode is preserved.

4. **Transposed output row** — read-only `ChordQualityBlock` tiles with `→` arrows between them (progressions-tab style, `flex-wrap`). Shown when ≥1 chord is entered and target root ≠ source root. Uses the target key's enharmonic spelling. Roman numerals and `variant` values are identical to the source row — mode is preserved, so all chord roles (diatonic/borrowed/non-diatonic) carry over unchanged.

### Empty / minimal states

- No chords entered: show "Add chords to transpose." below the input row.
- Source root === target root: transposed row hidden.
- All chords cleared: target selector hidden, transposed row hidden.

---

## Theory layer — `lib/theory/transposer.ts`

### Chromatic roman numeral

```ts
function chromaticRoman(rootChroma: number, tonicChroma: number, quality: string): string
```

Computes the roman numeral for any chord relative to a tonic, including non-diatonic chords:
- Interval = `(rootChroma − tonicChroma + 12) % 12`
- Interval → base roman: `[I, ♭II, II, ♭III, III, IV, ♭V, V, ♭VI, VI, ♭VII, VII]`
- Case: uppercase for major/augmented, lowercase for minor/diminished/half-dim
- Suffix: ° for diminished, + for augmented, ø for half-diminished

### Transposition

```ts
export function transposeProgression(
  chords: InputChord[],
  sourceTonic: string,
  targetTonic: string,
  mode: string,
): InputChord[]
```

For each chord:
1. Compute `semitones = (Note.chroma(targetTonic) − Note.chroma(sourceTonic) + 12) % 12`
2. New root chroma = `(Note.chroma(chord.root) + semitones) % 12`
3. Resolve enharmonic spelling: check if a diatonic note in `getKey(targetTonic, mode)` has that chroma — if so, use it; otherwise use `keyPrefersSharps(targetTonic, mode) ? SHARP_ROOTS[chroma] : FLAT_ROOTS[chroma]`
4. Preserve `chord.type` exactly

### Key spelling preference

```ts
export function keyPrefersSharps(tonic: string, mode: string): boolean
```

Counts `#` vs `b` accidentals in the diatonic notes of `getKey(tonic, mode)`. Returns true if sharps outnumber flats.

### Progression analysis

```ts
export function analyzeProgression(
  chords: InputChord[],
  tonic: string,
  mode: string,
): ChordAnalysis[]
```

Thin wrapper: calls the extended `analyzeChord` from `key-finder.ts` for each chord. Does not duplicate analysis logic.

---

## Extension to `lib/theory/key-finder.ts`

### `analyzeChord` extension

`analyzeChord` is updated to always compute a roman numeral for every chord — including non-diatonic and secondary-dominant chords — using `chromaticRoman(rootChroma, tonicChroma, quality)`.

`ChordAnalysis.roman` changes from `string | null` to `string`. Existing tests that expected `roman: null` for non-diatonic chords are updated to expect the chromatic roman numeral instead. All other test expectations are unchanged.

`chromaticRoman` is exported from `key-finder.ts` so `transposer.ts` can reuse it without duplication.

### Key finder tile update

`ResultChordBadge` and `ChordTile` are updated to always render a roman numeral (now guaranteed non-null), using the `variant` prop on `ChordQualityBlock` for visual distinction between diatonic, borrowed, and non-diatonic chords.

---

## Component architecture

### Shared components — move to `app/(app)/tools/_components/`

- `chord-input-row.tsx` (currently in `key-finder/_components/`)
- `chord-tile.tsx` (currently in `key-finder/_components/`)

**`ChordInputRow` prop change:** `selectedResult: KeyMatch | null` → `chordAnalyses: ChordAnalysis[] | null`

The key finder passes `selectedResult?.chordAnalysis ?? null`. The transposer passes its computed `ChordAnalysis[]` directly (always non-null once ≥1 chord is entered).

### `ChordQualityBlock` — add `variant` prop

```ts
variant?: "diatonic" | "borrowed" | "non-diatonic"  // default: "diatonic"
```

- `"diatonic"`: existing degree colour at current opacity (unchanged)
- `"borrowed"`: degree colour at reduced opacity (border 0.15, background 0.07) — visually similar but subtly muted
- `"non-diatonic"`: fixed warning colour (orange-700 `#c2410c`), indicating an unusual/unexpected chord

The `degree` prop still determines colour for diatonic/borrowed; it is ignored for non-diatonic (fixed colour used instead).

### New files

| File | Purpose |
|------|---------|
| `lib/theory/transposer.ts` | Transposition arithmetic + `analyzeProgression` wrapper |
| `lib/theory/transposer.test.ts` | Unit tests |
| `app/(app)/tools/transposer/_components/transposer-client.tsx` | Main client component |
| `app/(app)/tools/transposer/_components/transposed-row.tsx` | Read-only output row (ChordQualityBlock tiles + arrows) |

### Updated files

| File | Change |
|------|--------|
| `app/(app)/tools/transposer/page.tsx` | Replace "Coming soon" stub |
| `app/(app)/tools/key-finder/_components/key-finder-client.tsx` | Update import paths, pass `chordAnalyses` prop |
| `app/(app)/reference/_components/chord-quality-block.tsx` | Add `variant` prop |
| `lib/theory/key-finder.ts` | Extend `analyzeChord` with `alwaysRoman` option; export `chromaticRoman` helper |

---

## Edge cases

- **Same source and target root**: transposed row hidden.
- **Tritone (6 semitones)**: spelled as ♭V in flat-preferring keys, #IV in sharp-preferring keys.
- **Enharmonic source input**: transposition is chroma-based (not string-based), so C# and Db as input produce the same transposed root.
- **Mode label on target**: use `displayName` from `ALL_KEY_MODES` (e.g. "Dorian"), not the internal `modeName`.

---

## Tests — `lib/theory/transposer.test.ts`

- **Chromatic roman numerals**: all 12 intervals × major and minor quality; diminished ° and augmented + suffixes
- **Transposition arithmetic**: correct semitone shift for representative source/target pairs
- **Enharmonic spelling**: Cm → Dm in D major (not C##m); Am → B♭m in B♭ major (not A#m)
- **Quality preservation**: Cdim7 transposed by 5 semitones stays dim7
- **Extended `analyzeChord`**: non-diatonic chords with `alwaysRoman: true` return a non-null roman numeral; existing diatonic/borrowed cases return the same result as before (existing key-finder tests remain green)
