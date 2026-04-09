# Chord Substitutions — Design Spec

**Date:** 2026-04-09
**Branch:** New feature branch (do not merge to main without user testing)

---

## Goal

Add a "Substitutions" capability to the Reference view's Progressions tab. When the user selects a chord tile in a progression, they can see a list of musically valid substitutions for that chord. Clicking a substitution temporarily previews it in the chord row (with dashed-outline highlighting), allowing the user to see the updated Roman numerals and try the altered progression on their instrument.

---

## Scope

- **In scope:** Substitution display and preview within the Progressions tab (both built-in and user progressions). Eight substitution rules derived from `docs/research/chord_substitution_rules.yaml`.
- **Out of scope:** Audio playback, saving/committing substitutions to a progression, functional Roman numeral analysis (secondary dominants in saved progressions — see Known Limitations).
- **Deferrable:** Coltrane Changes (complex, noted below). All other 7 rules must ship.

---

## Architecture

### New files

| File | Role |
|------|------|
| `lib/theory/substitutions.ts` | Pure theory layer. Exports `getSubstitutions()`. No React. Fully testable. |
| `app/(app)/reference/_components/substitutions-panel.tsx` | Renders the substitution list for the selected chord. |

### Modified files

| File | Change |
|------|--------|
| `lib/theory/types.ts` | Add `PreviewChord`, `SubstitutionResult`, `ChordSubstitution` types. |
| `lib/theory/index.ts` | Re-export `getSubstitutions`. |
| `app/(app)/reference/_components/progressions-tab.tsx` | Add `previewedSub` state, `chordDetailTab` state, `applyPreview()` helper, and the new tab bar + panel rendering. |

No changes to `solo-scales-panel.tsx`, `chord-panel.tsx`, `reference-page-client.tsx`, or any other existing file.

---

## Data Structures

Added to `lib/theory/types.ts`:

```typescript
/** A single chord in a substitution preview (may not be diatonic to the key). */
export type PreviewChord = {
  tonic: string     // e.g. "E", "Bb"
  type: string      // e.g. "7", "m7", "m7b5", "dim7"
  roman: string     // local-function label e.g. "V7/vi", "ii/V", "bII7"
  quality: string   // "major" | "minor" | "dominant" | "diminished" — for ChordQualityBlock colour
}

export type SubstitutionResult =
  | {
      kind: "replacement"
      /** Each entry replaces the chord at that index in the progression. */
      replacements: Array<{ index: number; chord: PreviewChord }>
    }
  | {
      kind: "insertion"
      /** Splice these chords into the progression immediately before this index. */
      insertBefore: number
      chords: PreviewChord[]
    }
  | {
      kind: "range_replacement"
      /** Replace the contiguous slice [startIndex, endIndex] with an arbitrary set of chords.
       *  Used for Coltrane Changes (3 chords → 7). */
      startIndex: number
      endIndex: number   // inclusive
      chords: PreviewChord[]
    }

export type ChordSubstitution = {
  id: string              // stable unique key, e.g. "diatonic-iii", "tritone", "v-approach"
  ruleName: string        // group heading in SubstitutionsPanel
  label: string           // option row text, e.g. "Em7", "D7 → Gmaj7"
  effect: string          // one-liner description, e.g. "Mediant — similar colour, gentler"
  result: SubstitutionResult
  sortRank: number        // lower = displayed first within and across groups
}
```

---

## Theory Layer — `getSubstitutions()`

```typescript
export function getSubstitutions(
  chord: ProgressionChord,       // the selected chord
  chords: ProgressionChord[],    // full progression
  selectedIndex: number,
  tonic: string,                 // key tonic e.g. "C"
  mode: string,                  // e.g. "major", "dorian"
): ChordSubstitution[]
```

Returns all applicable substitutions sorted by `sortRank`. Uses TonalJS `Note.transpose` and `Interval` for all interval arithmetic. Does **not** consult the key-relative Roman numeral analysis — all V/X and ii/X computations work directly from chord roots.

### Rule implementations

**1. Diatonic Substitution** (`sortRank` 10–11)
- Fires on any chord whose `degree` is a valid diatonic degree (1–7).
- Finds other diatonic chords at degree ±2 (a diatonic third away) using `getDiatonicChords(tonic, mode)`.
- Returns up to 2 replacement options. Conventional commonality order within each degree:
  - I → vi (rank 10), iii (rank 11)
  - IV → ii (rank 10), vi (rank 11)
  - vi → I (rank 10), iii (rank 11)
  - Other degrees: the one closer to the tonic comes first.
- Skips any candidate that is the same chord as the selected chord.

**2. Tritone Substitution** (`sortRank` 20)
- Fires only when `chord.type === "7"`.
- Root: `Note.transpose(chord.tonic, "A4")` (augmented fourth = tritone).
- Result: replacement with `{ tonic: newRoot, type: "7", roman: "bII7", quality: "dominant" }`.
- Effect: `"Tritone sub — chromatic descending bass to resolution"`.

**3. Modal Mixture / Borrowed Chords** (`sortRank` 30–32)
- Fires when the selected chord has subdominant function: degree IV in major, or equivalent in modes (degree IV in dorian, lydian, mixolydian; degree VI in minor/aeolian acting as bVI).
- For a IV chord in major: offers `iv-7` (rank 30), `bVII7` (rank 31), `bVImaj7` (rank 32).
  - `iv-7`: same root as IV, type `"m7"`.
  - `bVII7`: root is `Note.transpose(tonic, "m7")`, type `"7"`.
  - `bVImaj7`: root is `Note.transpose(tonic, "m6")`, type `"maj7"`.
- All are replacements. Roman labels use flat notation relative to the key.

**4. Secondary Dominant — V approach** (`sortRank` 40)
- Fires on any chord.
- V7/X root: `Note.transpose(chord.tonic, "P5")`, type `"7"`.
- Result: insertion with `insertBefore = selectedIndex`, `chords = [V7/X]`.
- Highlight: the inserted V7/X tile and the original selected chord tile.
- Roman: `"V7/" + chord.roman`.
- Effect: `"Strong dominant pull into the chord"`.

**5. ii-V Approach** (`sortRank` 41)
- Fires on any chord.
- V7/X as above.
- ii/X root: `Note.transpose(V7root, "P4")` (a 4th above V7/X root = 5th above X root).
- ii/X type: `"m7"` if X is major or dominant; `"m7b5"` if X is minor or diminished.
- Result: insertion with `insertBefore = selectedIndex`, `chords = [ii/X, V7/X]`.
- Highlight: both inserted tiles and the original selected chord tile.
- Romans: `"ii/" + chord.roman` and `"V7/" + chord.roman`.
- Effect: `"Classic jazz preparation"`.

**6. Diminished Passing** (`sortRank` 50)
- Fires only when `selectedIndex < chords.length - 1` (a next chord exists).
- Passing dim7 root: `Note.transpose(chord.tonic, "A1")` (one semitone above selected root).
- Type: `"dim7"`, quality: `"diminished"`.
- Result: insertion with `insertBefore = selectedIndex + 1`, `chords = [dim7]`.
- Highlight: the inserted dim7 tile and the next chord tile.
- Roman: `"#" + chord.roman + "°7"`.
- Effect: `"Chromatic passing — leading tone into next chord"`.

**7. Cycle of 5ths** (`sortRank` 60)
- Fires when `selectedIndex < chords.length - 1` (a next chord exists).
- Generates a 2-step dominant chain leading into the next chord Y:
  - V7/Y root: `Note.transpose(Y.tonic, "P5")`, type `"7"`.
  - V7/V7/Y root: `Note.transpose(V7Y_root, "P5")`, type `"7"`.
- Result: insertion with `insertBefore = selectedIndex + 1`, `chords = [V7/V7/Y, V7/Y]`.
- Highlight: both inserted tiles and Y.
- Effect: `"Two-step dominant chain into next chord"`.

**8. Coltrane Changes** (`sortRank` 70) *(deferrable)*
- Fires when the selected chord begins a ii-7 → V7 → Imaj7 pattern:
  - `chords[i].type === "m7"` AND `chords[i+1].type === "7"` AND `chords[i+2].type === "maj7"`
  - `Note.pitchClass(Note.transpose(chords[i].tonic, "P4")) === Note.pitchClass(chords[i+1].tonic)` (i is ii relative to i+1)
  - `Note.pitchClass(Note.transpose(chords[i+1].tonic, "P4")) === Note.pitchClass(chords[i+2].tonic)` (i+1 is V relative to i+2)
  - Use `Note.pitchClass()` comparisons throughout to handle enharmonic equivalence (C# = Db).
- Replaces all 3 chords with the 7-chord Coltrane sequence. Given target I = chords[i+2].tonic:
  - Centers at I, bVI (tritone = `Note.transpose(I, "A4")`), III (major third = `Note.transpose(I, "M3")`).
  - Sequence: `[ii/I, V7/I, bVImaj7, V7/bVI, IIImaj7, V7/III→I, Imaj7]` (7 chords total).
  - Each center gets its own V-I resolution, cycling through the three tonal centers a major third apart.
- Result: `kind: "range_replacement"` with `startIndex = i`, `endIndex = i+2`, `chords = [7 PreviewChords]`.
  - `applyPreview()` splices out indices i–i+2 and inserts the 7-chord sequence; all 7 are highlighted.
- Effect: `"Coltrane reharmonisation — cycles through three tonal centres"`.

---

## UI Changes — `progressions-tab.tsx`

### New state

```typescript
const [previewedSub, setPreviewedSub] = useState<ChordSubstitution | null>(null)
const [chordDetailTab, setChordDetailTab] = useState<"soloing" | "substitutions">("soloing")
```

### `applyPreview()` helper (pure, inside the file)

```typescript
function applyPreview(
  chords: ProgressionChord[],
  sub: ChordSubstitution,
): { previewChords: PreviewChord[]; highlightIndices: number[] }
```

Converts the entire `chords` array to `PreviewChord[]` (unchanged chords copy their `tonic`, `type`, `roman`, `quality` directly), then applies the substitution:

- **Replacement:** swap each `result.replacements[n].index` with its `PreviewChord`. `highlightIndices` = those indices.
- **Insertion:** splice `result.chords` before `result.insertBefore`. `highlightIndices` = the spliced range + `insertBefore` (shifted by the splice length).
- **Range replacement:** remove indices `startIndex`–`endIndex` inclusive and splice in `result.chords`. `highlightIndices` = the full range of new indices.

The chord row always renders `PreviewChord[]` — either the full preview array (when `previewedSub !== null`) or the original `chords` converted to `PreviewChord[]`.

### Clearing preview

`previewedSub` is cleared when:
- The user clicks a different chord tile.
- The user deselects the current chord (toggle).
- The selected progression changes.

Switching between Soloing and Substitutions tabs does **not** clear the preview.

### Tab bar

Rendered only when a chord is selected (`selectedChord !== null`). Sits between the chord block row and the detail panel. Two tabs: "Soloing" and "Substitutions". Same small-text underline style as the sub-tabs inside ChordPanel (match existing className patterns from `chord-panel.tsx`).

### SubstitutionsPanel

```typescript
interface SubstitutionsPanelProps {
  substitutions: ChordSubstitution[]
  chordName: string             // e.g. "Gmaj7" — used in heading
  previewedId: string | null
  onPreview: (sub: ChordSubstitution | null) => void
}
```

Groups substitutions by `ruleName`. Within each group, options render in `sortRank` order. Each row shows `label` (bold) and `effect` (muted). Active preview row gets a dashed accent border. Clicking a row calls `onPreview(sub)` or `onPreview(null)` if already active.

---

## Chord Block Row — Preview Highlighting

When `previewedSub` is set, tiles at `highlightIndices` render with:

```
border-dashed border-accent
```

replacing the default solid `border-border`. This is the only visual change to `ChordQualityBlock` prop surface — pass a `isSubstitutionPreview?: boolean` prop; the component applies the dashed style when true.

---

## Omitted Rules

| Rule | Reason |
|------|--------|
| Modal Extensions | Requires melody note information |
| Common Tone Reharmonization | Requires melody note information |

These are not shown to the user at all — no greyed-out entries.

---

## Known Limitations

### Secondary function analysis in saved progressions

The existing `analyzeProgression()` assigns Roman numerals relative to the key tonic only. If a progression already contains a secondary dominant (e.g. A7 in a C major progression), it is labelled as a chromatic non-diatonic chord (e.g. VI7), not as V7/ii. There is no detection of tonicisation or secondary function.

This limitation does not affect the substitution preview — preview chord Roman numerals are computed and labelled locally (e.g. "V7/vi") by the substitution logic itself, bypassing `analyzeProgression()`.

A future spec should add a functional analysis layer that:
- Detects ii-V-I, V-I, and other cadential patterns within progressions.
- Assigns secondary-function labels (V7/X, ii/X) in the chord row display.
- Updates the progression info popover and Roman numeral display throughout the app.

---

## File Map

| File | Action |
|------|--------|
| `lib/theory/types.ts` | Add `PreviewChord`, `SubstitutionResult`, `ChordSubstitution` |
| `lib/theory/substitutions.ts` | Create — `getSubstitutions()` and all 8 rule functions |
| `lib/theory/index.ts` | Export `getSubstitutions` |
| `app/(app)/reference/_components/substitutions-panel.tsx` | Create |
| `app/(app)/reference/_components/chord-quality-block.tsx` | Add `isSubstitutionPreview?: boolean` prop |
| `app/(app)/reference/_components/progressions-tab.tsx` | Add state, tab bar, `applyPreview()`, wire substitutions panel |
