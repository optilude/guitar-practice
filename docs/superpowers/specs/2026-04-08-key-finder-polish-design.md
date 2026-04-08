# Key Finder Polish — Design Spec

**Date:** 2026-04-08  
**Scope:** Visual, functional, and matching-accuracy improvements to the Key Finder tool.

---

## 1. Tile Layout Redesign

### 1a. Arrows between chord tiles

Mirror the Progressions tab layout (`progressions-tab.tsx`). Each chord at index > 0 is grouped with its leading `→` arrow in a single `flex-shrink-0` wrapper. On line-wrap, the new line starts with `→ [tile]`, not `[tile]`.

**Container structure (chord-input-row.tsx):**
```tsx
<div className="flex flex-wrap items-start gap-2">
  {chords.map((chord, i) => (
    <div key={chord.id} className="flex items-center gap-1 flex-shrink-0">
      {i > 0 && <span className="text-muted-foreground text-sm">→</span>}
      <ChordTile ... />
    </div>
  ))}
  <AddButton />
</div>
```

The arrow is part of the chord's flex group, so wrapping always places `→` at the start of a new line, ahead of its chord tile.

### 1b. × delete button inside tile (top-right)

Remove the external `✕` button rendered after each tile. Add an absolute-positioned `×` button to the top-right corner of the tile body inside `ChordTile`.

The `×` must not receive drag listeners — it handles only `onClick={onRemove}` with `e.stopPropagation()` to prevent triggering tile click.

Layout sketch:
```
┌─────────────────┐
│                ×│  ← absolute top-right, small, muted, hover:destructive
│   ii            │
│   Am7           │
└─────────────────┘
```

### 1c. Whole-tile drag (remove ⠿ handle)

Remove the explicit `⠿` drag handle button. Apply `{...attributes} {...listeners}` from `useSortable` to the outer tile wrapper div. Update `PointerSensor` in `chord-input-row.tsx` to use a distance activation constraint:

```tsx
useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
```

This prevents accidental drags when clicking to edit a chord. The `×` button calls `e.stopPropagation()` so it does not initiate a drag.

### 1d. [+] add button — same size as chord tile

The add button must match the visual height of chord tiles. Chord tiles use `rounded-lg border-2 px-3 py-2.5 min-w-[68px]` with a two-row internal layout (10px roman numeral row + 14px chord name row).

The add button uses the same outer sizing with a matching two-row structure:
```tsx
<button className="flex flex-col items-center rounded-lg border-2 border-dashed border-border px-3 py-2.5 min-w-[68px] text-muted-foreground hover:border-accent hover:text-foreground transition-colors">
  <span className="text-[10px] mb-1 invisible">+</span>  {/* spacer row */}
  <span className="text-sm">+</span>
</button>
```

---

## 2. Empty State

When no chords have been added (`chords.length === 0`), show a helper message beneath the add button row in `key-finder-client.tsx`:

```tsx
{chords.length === 0 && (
  <p className="text-sm text-muted-foreground">Add chords to analyse.</p>
)}
```

This replaces the currently empty initial view.

---

## 3. Mode Label Changes

In `lib/theory/commonality-tiers.ts`, update two `displayName` entries in `ALL_KEY_MODES`:

| Before | After |
|--------|-------|
| `"Major"` | `"Ionian (major)"` |
| `"Aeolian"` | `"Aeolian (natural minor)"` |

**Impact:**
- `KeyMatch.displayName` becomes `"C Ionian (major)"` / `"A Aeolian (natural minor)"`
- Result list, selected result display, and toggle key all use `displayName` — all update automatically
- `COMMONALITY_TIER` (used by scale-finder, keyed separately by display name) is **not** changed

---

## 4. Force-Constrain Chord Input

Currently `ChordTile` commits any text on blur or Enter. Invalid symbols (garbage input) are accepted and silently fail to parse in `detectKey`.

**New behaviour:**

On commit (Enter key, blur, or autocomplete suggestion click), validate with `parseChord(value.trim())`:

| Situation | Action |
|-----------|--------|
| Valid chord | Commit as normal |
| Invalid, editing existing chord | Revert to original symbol (silent) |
| Invalid, adding new chord | Remove the tile (same as empty input) |

The autocomplete already guides users toward valid TonalJS symbols. This constraint ensures the chord list only ever contains parseable chords. No error message is needed — silently reverting is sufficient because the autocomplete makes the valid options obvious.

**Implementation note:** `chord-tile.tsx` currently has a type-only import from `key-finder`. The implementation must add `parseChord` as a value import alongside the existing type import. The commit function calls `parseChord(value.trim())` before calling `onCommit`. For the "adding new chord" case, `symbol` prop is `""` — passing `""` to `onCommit` already triggers deletion in `key-finder-client.tsx`.

---

## 5. Matching Fixes

### 5a. TYPE_TO_QUALITY — missing type aliases

`normalizeQuality` falls back to `"major"` for any type not in `TYPE_TO_QUALITY`. This means:
- `"minor"` → falls back to `"major"` (should be `"minor"`)
- `"major"` → falls back to `"major"` (correct by accident, but implicit)

If TonalJS accepts `"Aminor"` as a chord and the raw suffix becomes `"minor"`, the chord is classified as A-major-quality. It fails the diatonic vi check (requires `"minor"` quality), passes the secondary-dominant check (A is V/ii in C major), and scores 0.5 instead of 1.0.

**Fix:** Expand `TYPE_TO_QUALITY` with explicit full-word aliases:
```ts
"minor": "minor", "major": "major",
"augmented": "aug", "diminished": "dim",
"dominant": "major",
```

### 5b. Diatonic lookup — half-dim/dim triad mismatch

Degree vii in a major key is stored as `Bm7b5`, which normalises to quality `"half-dim"`. If the user enters `"Bdim"` (a diminished triad, type `"dim"`, quality `"dim"`), it does not match `"half-dim"` and is classified as non-diatonic.

Music theory: a diminished triad IS diatonic on degree vii of a major scale (it is the triad built from the same three notes as Bm7b5 without the 7th). A dim triad should score 1.0 when playing degree vii.

**Fix:** In `buildDiatonicLookup`, for each seventh chord that is `"m7b5"` (half-dim), also register an additional entry with quality `"dim"` for the same root chroma. This allows both `"Bm7b5"` and `"Bdim"` to match diatonic degree vii.

Implementation:
```ts
// After pushing the seventh chord entry, check for half-dim special case
if (chord.type === "m7b5") {
  existing.push({ chord, quality: "dim" })
}
```

### 5c. Regression tests

Add to `lib/theory/key-finder.test.ts`:
- `"C"` (major triad) + `"Am"` (minor triad) → 100% fitScore in C major
- `"Bdim"` included in C major progression → classified as diatonic (degree vii, score 1.0)
- `"Aminor"` type suffix → quality resolves to `"minor"` (not `"major"`)

---

## Files Changed

| File | Change |
|------|--------|
| `lib/theory/commonality-tiers.ts` | Update two `displayName` strings |
| `lib/theory/key-finder.ts` | Expand `TYPE_TO_QUALITY`; add half-dim/dim entry in `buildDiatonicLookup` |
| `lib/theory/key-finder.test.ts` | Add regression tests for triads and type aliases |
| `app/(app)/tools/key-finder/_components/chord-tile.tsx` | × inside tile; whole-tile drag; validate on commit |
| `app/(app)/tools/key-finder/_components/chord-input-row.tsx` | Arrow layout; updated PointerSensor; [+] button resized |
| `app/(app)/tools/key-finder/_components/key-finder-client.tsx` | Empty state message |
