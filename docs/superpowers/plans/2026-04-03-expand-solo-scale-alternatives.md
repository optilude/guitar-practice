# Expand Solo Scale Alternatives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand `ADDITIONAL_BY_TYPE` in `solo-scales.ts` with more scale alternatives cross-referenced from a second reference source, reorder existing entries so the most accessible choices come first, and wire click-through navigation for all new scales.

**Architecture:** Three files change. `solo-scales.ts` gains new entries in `SCALE_TONAL_NAMES` and a revised `ADDITIONAL_BY_TYPE`. `scales.ts` gains five new entries in `PATTERN_TO_TONAL` so the ScalePanel can display the new scales on a fretboard and accept them as navigation targets. `page.tsx` gains new entries in `SOLO_SCALE_TO_PANEL_TYPE` so clicking a scale name in `SoloScalesPanel` navigates to the correct scale type.

**Tech Stack:** Vitest, TonalJS Scale (via existing `SCALE_TONAL_NAMES`), React.

---

## File map

| File | Change |
|---|---|
| `lib/theory/solo-scales.ts` | Expand `SCALE_TONAL_NAMES`; reorder + expand `ADDITIONAL_BY_TYPE` |
| `lib/theory/scales.ts` | Add 5 entries to `PATTERN_TO_TONAL` |
| `app/(app)/reference/page.tsx` | Add 8 entries to `SOLO_SCALE_TO_PANEL_TYPE` |
| `__tests__/theory/solo-scales.test.ts` | Add tests for new alternatives |

---

## Background: how the three constants relate

- **`SCALE_TONAL_NAMES`** (in `solo-scales.ts`): maps display name → TonalJS scale name. Used by `SoloScalesPanel` to look up note strings via `Scale.get()`. Every scale name used in `ADDITIONAL_BY_TYPE` must have an entry here, or the note display will be blank.
- **`ADDITIONAL_BY_TYPE`** (in `solo-scales.ts`): maps chord type string → ordered list of `SoloScaleEntry` alternatives. Entries whose `scaleName` matches the primary scale are filtered out at runtime by `getSoloScales`.
- **`PATTERN_TO_TONAL`** (in `scales.ts`): maps ScalePanel display name → TonalJS name. `listScaleTypes()` returns its keys — these are the values accepted by `ScalePanel`'s `scaleTypeTrigger` prop. If a scale is not in this map, clicking its name in `SoloScalesPanel` navigates to the Scales tab but fails to change the selected scale type.
- **`SOLO_SCALE_TO_PANEL_TYPE`** (in `page.tsx`): maps `SoloScalesPanel` display name → `PATTERN_TO_TONAL` key. Bridges the click event to the panel. Must be updated alongside `ADDITIONAL_BY_TYPE`.

---

### Task 1: Expand `solo-scales.ts` — `SCALE_TONAL_NAMES` and `ADDITIONAL_BY_TYPE`

**Files:**
- Test: `__tests__/theory/solo-scales.test.ts`
- Modify: `lib/theory/solo-scales.ts` (lines 39–75)

**New scales being added and their TonalJS names:**

| Display name | TonalJS name | Notes |
|---|---|---|
| Altered | `altered` | Already in `SCALE_TONAL_NAMES`? No — add it |
| Lydian Dominant | `lydian dominant` | New |
| Lydian Augmented | `lydian augmented` | New |
| Phrygian Dominant | `phrygian dominant` | New |
| Bebop Dominant | `bebop` | TonalJS calls this `bebop` (Mixolydian + maj7 passing tone) |
| Melodic Minor | `melodic minor` | New to `SCALE_TONAL_NAMES` (already a mode context string) |
| Diminished Half-Whole | `half-whole diminished` | New to `SCALE_TONAL_NAMES` |

**Updated `ADDITIONAL_BY_TYPE` — rationale:**
- **maj7**: Reorder Major Pentatonic first (more accessible than Lydian); add Lydian Augmented as third option (colourful IV-chord choice)
- **dom7 (`"7"`)**: Reorder to put Major Pentatonic + Bebop Dominant first (diatonic/jazz framing); keep Minor Pentatonic + Blues Scale (blues framing); add Altered + Lydian Dominant as esoteric jazz choices
- **m7**: Add Phrygian Dominant (esoteric for iii-m7) and Melodic Minor (esoteric for ii-m7); Dorian stays (esoteric for vi-m7, filtered when it's the primary)
- **m7b5**: Unchanged — Locrian #2 already correct
- **dim7**: Add Diminished Half-Whole (symmetrical choice)

- [ ] **Step 1: Write failing tests**

Add these tests to `__tests__/theory/solo-scales.test.ts` after the existing tests:

```ts
  it("returns Major Pentatonic, Bebop Dominant, Altered and Lydian Dominant as additional for dominant 7", () => {
    const result = getSoloScales({ tonic: "G", type: "7", degree: 5 }, "ionian")
    const names = result.additional.map((a) => a.scaleName)
    expect(names).toContain("Major Pentatonic")
    expect(names).toContain("Bebop Dominant")
    expect(names).toContain("Altered")
    expect(names).toContain("Lydian Dominant")
  })

  it("returns Major Pentatonic and Lydian Augmented as additional for maj7", () => {
    const result = getSoloScales({ tonic: "C", type: "maj7", degree: 1 }, "ionian")
    const names = result.additional.map((a) => a.scaleName)
    expect(names).toContain("Major Pentatonic")
    expect(names).toContain("Lydian Augmented")
  })

  it("returns Phrygian Dominant and Melodic Minor as additional for m7", () => {
    const result = getSoloScales({ tonic: "A", type: "m7", degree: 6 }, "ionian")
    const names = result.additional.map((a) => a.scaleName)
    expect(names).toContain("Minor Pentatonic")
    expect(names).toContain("Phrygian Dominant")
    expect(names).toContain("Melodic Minor")
  })

  it("returns Locrian #2 and Diminished Half-Whole as additional for dim7", () => {
    const result = getSoloScales({ tonic: "B", type: "dim7", degree: 7 }, "ionian")
    const names = result.additional.map((a) => a.scaleName)
    expect(names).toContain("Locrian #2")
    expect(names).toContain("Diminished Half-Whole")
  })
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run __tests__/theory/solo-scales.test.ts
```

Expected: 4 new tests fail (new scale names not yet in `ADDITIONAL_BY_TYPE`). Existing 7 tests pass.

- [ ] **Step 3: Update `SCALE_TONAL_NAMES` in `lib/theory/solo-scales.ts`**

Replace the existing `SCALE_TONAL_NAMES` constant (lines 63–75) with:

```ts
export const SCALE_TONAL_NAMES: Record<string, string> = {
  "Ionian (major)":          "ionian",
  "Dorian":                  "dorian",
  "Phrygian":                "phrygian",
  "Lydian":                  "lydian",
  "Mixolydian":              "mixolydian",
  "Aeolian (natural minor)": "aeolian",
  "Locrian":                 "locrian",
  "Major Pentatonic":        "major pentatonic",
  "Minor Pentatonic":        "minor pentatonic",
  "Blues Scale":             "blues",
  "Locrian #2":              "locrian #2",
  "Altered":                 "altered",
  "Lydian Dominant":         "lydian dominant",
  "Lydian Augmented":        "lydian augmented",
  "Phrygian Dominant":       "phrygian dominant",
  "Bebop Dominant":          "bebop",
  "Melodic Minor":           "melodic minor",
  "Diminished Half-Whole":   "half-whole diminished",
}
```

- [ ] **Step 4: Replace `ADDITIONAL_BY_TYPE` in `lib/theory/solo-scales.ts`**

Replace the existing `ADDITIONAL_BY_TYPE` constant (lines 39–58) with:

```ts
const ADDITIONAL_BY_TYPE: Record<string, SoloScaleEntry[]> = {
  maj7: [
    { scaleName: "Major Pentatonic",  hint: "safe choice" },
    { scaleName: "Lydian",            hint: "lifted feel" },
    { scaleName: "Lydian Augmented",  hint: "IV chord colour" },
  ],
  "7": [
    { scaleName: "Major Pentatonic",  hint: "safe choice" },
    { scaleName: "Bebop Dominant",    hint: "passing tone" },
    { scaleName: "Minor Pentatonic",  hint: "bluesy" },
    { scaleName: "Blues Scale",       hint: "adds ♭5 colour" },
    { scaleName: "Altered",           hint: "jazz tension" },
    { scaleName: "Lydian Dominant",   hint: "bright tension" },
  ],
  m7: [
    { scaleName: "Minor Pentatonic" },
    { scaleName: "Dorian",            hint: "brighter" },
    { scaleName: "Phrygian Dominant", hint: "exotic" },
    { scaleName: "Melodic Minor",     hint: "jazz bright" },
  ],
  m7b5: [
    { scaleName: "Locrian #2",        hint: "less dissonant" },
  ],
  dim7: [
    { scaleName: "Locrian #2",            hint: "less dissonant" },
    { scaleName: "Diminished Half-Whole", hint: "symmetrical" },
  ],
}
```

- [ ] **Step 5: Run all tests**

```bash
npx vitest run __tests__/theory/solo-scales.test.ts
```

Expected: all 11 tests pass. Also confirm full suite hasn't regressed:

```bash
npm test
```

Expected: 298+ tests pass, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add lib/theory/solo-scales.ts __tests__/theory/solo-scales.test.ts
git commit -m "feat: expand solo scale alternatives with jazz and modal options"
```

---

### Task 2: Add new scale types to `lib/theory/scales.ts`

**Files:**
- Modify: `lib/theory/scales.ts` (lines 49–67, `PATTERN_TO_TONAL`)

`PATTERN_TO_TONAL` already contains "Melodic Minor", "Altered", and "Diminished Half-Whole" — these don't need to be added. The five missing entries are: Lydian Dominant, Lydian Augmented, Phrygian Dominant, Bebop Dominant, Locrian #2.

Adding them makes these scales selectable in the ScalePanel's dropdown and navigable via `scaleTypeTrigger`. No tests cover `PATTERN_TO_TONAL` contents directly — verify in the browser after Task 3.

- [ ] **Step 1: Add 5 entries to `PATTERN_TO_TONAL`**

In `lib/theory/scales.ts`, replace lines 49–67:

```ts
const PATTERN_TO_TONAL: Record<string, string> = {
  Major:                   "major",
  Dorian:                  "dorian",
  Phrygian:                "phrygian",
  Lydian:                  "lydian",
  Mixolydian:              "mixolydian",
  Aeolian:                 "aeolian",
  Locrian:                 "locrian",
  "Harmonic Minor":        "harmonic minor",
  "Melodic Minor":         "melodic minor",
  Altered:                 "altered",
  "Lydian Dominant":       "lydian dominant",
  "Lydian Augmented":      "lydian augmented",
  "Phrygian Dominant":     "phrygian dominant",
  "Bebop Dominant":        "bebop",
  "Pentatonic Major":      "major pentatonic",
  "Pentatonic Minor":      "minor pentatonic",
  Blues:                   "blues",
  "Locrian #2":            "locrian #2",
  "Whole Tone":            "whole tone",
  "Diminished Whole-Half": "diminished",
  "Diminished Half-Whole": "half-whole diminished",
  Chromatic:               "chromatic",
}
```

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

Expected: same passing count as before, 0 failures. `PATTERN_TO_TONAL` changes don't affect any unit tests — they add to the ScalePanel dropdown which is not unit-tested.

- [ ] **Step 3: Commit**

```bash
git add lib/theory/scales.ts
git commit -m "feat: add Lydian Dominant, Lydian Augmented, Phrygian Dominant, Bebop Dominant, Locrian #2 to ScalePanel"
```

---

### Task 3: Wire click-through navigation in `app/(app)/reference/page.tsx`

**Files:**
- Modify: `app/(app)/reference/page.tsx` (lines 31–42, `SOLO_SCALE_TO_PANEL_TYPE`)

`SOLO_SCALE_TO_PANEL_TYPE` maps the `scaleName` strings from `SoloScalesPanel` to the scale type keys that `ScalePanel` accepts (i.e. the keys of `PATTERN_TO_TONAL`). Without entries here, clicking a scale name navigates to the Scales tab but leaves the scale type unchanged.

Current entries cover only the 7 modes + 3 pentatonics. All 8 new entries use the same string for key and value — the display names in `SCALE_TONAL_NAMES` match the keys in `PATTERN_TO_TONAL` exactly for these scales.

Additionally, "Locrian #2" was already in `ADDITIONAL_BY_TYPE` before this feature but was missing from `SOLO_SCALE_TO_PANEL_TYPE` — click-through was silently broken. Fix it here.

- [ ] **Step 1: Expand `SOLO_SCALE_TO_PANEL_TYPE`**

In `app/(app)/reference/page.tsx`, replace lines 31–42:

```tsx
const SOLO_SCALE_TO_PANEL_TYPE: Record<string, string> = {
  "Ionian (major)":          "Major",
  "Dorian":                  "Dorian",
  "Phrygian":                "Phrygian",
  "Lydian":                  "Lydian",
  "Mixolydian":              "Mixolydian",
  "Aeolian (natural minor)": "Aeolian",
  "Locrian":                 "Locrian",
  "Major Pentatonic":        "Pentatonic Major",
  "Minor Pentatonic":        "Pentatonic Minor",
  "Blues Scale":             "Blues",
  "Locrian #2":              "Locrian #2",
  "Altered":                 "Altered",
  "Lydian Dominant":         "Lydian Dominant",
  "Lydian Augmented":        "Lydian Augmented",
  "Phrygian Dominant":       "Phrygian Dominant",
  "Bebop Dominant":          "Bebop Dominant",
  "Melodic Minor":           "Melodic Minor",
  "Diminished Half-Whole":   "Diminished Half-Whole",
}
```

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

Expected: 298+ tests pass, 0 failures.

- [ ] **Step 3: Verify in browser**

Run `npm run dev` and navigate to `/reference`.

Check all three panels that use `SoloScalesPanel`:

**Chords tab — Soloing view:**
1. Set root to C, chord type to `major` → Soloing tab shows "C Ionian (major)" as primary. Alternatives: Major Pentatonic, Lydian, Lydian Augmented (no Lydian in additional when deg=1/ionian — confirm Lydian still filtered if primary would be Lydian)
2. Set chord type to `7` → primary = C Mixolydian. Alternatives show: Major Pentatonic, Bebop Dominant, Minor Pentatonic, Blues Scale, Altered, Lydian Dominant
3. Set chord type to `m7` → primary = C Dorian. Alternatives: Minor Pentatonic, Phrygian Dominant, Melodic Minor (Dorian filtered — it's the primary)
4. Set chord type to `dim7` → primary = C Locrian. Alternatives: Locrian #2, Diminished Half-Whole
5. Click "C Lydian Augmented" → switches to Scales tab with C Lydian Augmented selected and shown on fretboard
6. Click "C Bebop Dominant" → switches to Scales tab with C Bebop Dominant selected
7. Click "C Phrygian Dominant" → switches to Scales tab with C Phrygian Dominant selected

**Harmony tab:**
8. Select key C, click any chord block → scale alternatives update; verify new alternatives appear and click-through works

**Progressions tab:**
9. Select a progression, click a chord → verify same behaviour

- [ ] **Step 4: Commit**

```bash
git add app/(app)/reference/page.tsx
git commit -m "feat: wire click-through navigation for new solo scale alternatives"
```
