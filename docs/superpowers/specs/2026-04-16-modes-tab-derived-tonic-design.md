# Modes Tab — Derived Tonic Design

**Date:** 2026-04-16  
**Status:** Approved  
**Files touched:** `harmony-tab.tsx`, `reference-page-client.tsx`

---

## Problem

The HarmonyTab currently calls `getDiatonicChords(tonic, mode)` where `tonic` is the raw Circle of Fifths selection. Selecting C + Dorian shows **C Dorian** (the mode rooted on C), but the musically correct meaning of "Dorian mode of C" is **D Dorian** — D is the second degree of the C major scale, and Dorian is the second mode. The Circle of Fifths is the *parent key context*, not the modal root.

---

## Goal

- Selecting C + Dorian → chord tiles show **D Dorian**; Circle stays on C
- Selecting C + Phrygian → chord tiles show **E Phrygian**; Circle stays on C
- For harmonic/melodic minor families, the parent is the **relative minor** of the circle key (A for C), so selecting C + Phrygian Dominant → chord tiles show **E Phrygian Dominant** (mode 5 of A harmonic minor)
- The Scales panel below auto-updates to the derived tonic+mode whenever circle key or mode changes
- A "Over the whole mode" hint in the Soloing panel shows the derived scale and lets the user navigate to the Scales tab

---

## derivedTonic computation

```ts
computeDerivedTonic(circleKey: string, mode: string): string
```

**Major family** (Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian):

```
derivedTonic = Scale.get(`${circleKey} major`).notes[modeOffset]
```

Where `modeOffset` is 0-indexed: Ionian=0, Dorian=1, Phrygian=2, Lydian=3, Mixolydian=4, Aeolian=5, Locrian=6. Ionian is the identity (offset 0 → circleKey).

**Harmonic minor family** (Harmonic Minor, Locrian #6, Ionian #5, Dorian #4, Phrygian Dominant, Lydian #2, Altered Diminished):

```
relativeMinorRoot = Note.transpose(circleKey, "-3m")
derivedTonic = Scale.get(`${relativeMinorRoot} harmonic minor`).notes[modeOffset]
```

Offset: Harmonic Minor=0 (→ relativeMinorRoot), Locrian #6=1, Ionian #5=2, Dorian #4=3, Phrygian Dominant=4, Lydian #2=5, Altered Diminished=6.

**Melodic minor family** (Melodic Minor, Dorian b2, Lydian Augmented, Lydian Dominant, Mixolydian b6, Locrian #2, Altered):

```
relativeMinorRoot = Note.transpose(circleKey, "-3m")
derivedTonic = Scale.get(`${relativeMinorRoot} melodic minor`).notes[modeOffset]
```

Offset: Melodic Minor=0 (→ relativeMinorRoot), Dorian b2=1, Lydian Augmented=2, Lydian Dominant=3, Mixolydian b6=4, Locrian #2=5, Altered=6.

`Note.transpose(circleKey, "-3m")` is equivalent to the relative minor root: C→A, G→E, D→B, etc.

---

## Changes to `harmony-tab.tsx`

### New constants

```ts
// Extends the existing major-only MODE_DEGREE_OFFSET to all 21 modes
const ALL_MODE_DEGREE_OFFSET: Record<string, number> = {
  ionian: 0, dorian: 1, phrygian: 2, lydian: 3, mixolydian: 4, aeolian: 5, locrian: 6,
  "melodic minor": 0, "dorian b2": 1, "lydian augmented": 2, "lydian dominant": 3,
  "mixolydian b6": 4, "locrian #2": 5, "altered": 6,
  "harmonic minor": 0, "locrian #6": 1, "ionian #5": 2, "dorian #4": 3,
  "phrygian dominant": 4, "lydian #2": 5, "altered diminished": 6,
}

const MELODIC_MINOR_MODE_SET = new Set([
  "melodic minor", "dorian b2", "lydian augmented", "lydian dominant",
  "mixolydian b6", "locrian #2", "altered",
])

const HARMONIC_MINOR_MODE_SET = new Set([
  "harmonic minor", "locrian #6", "ionian #5", "dorian #4",
  "phrygian dominant", "lydian #2", "altered diminished",
])
```

### computeDerivedTonic (module-level pure function)

```ts
function computeDerivedTonic(circleKey: string, mode: string): string {
  const offset = ALL_MODE_DEGREE_OFFSET[mode] ?? 0
  if (MAJOR_MODE_SET.has(mode)) {
    if (offset === 0) return circleKey
    return Scale.get(`${circleKey} major`).notes[offset] ?? circleKey
  }
  const relMinor = Note.transpose(circleKey, "-3m")
  if (MELODIC_MINOR_MODE_SET.has(mode)) {
    if (offset === 0) return relMinor
    return Scale.get(`${relMinor} melodic minor`).notes[offset] ?? relMinor
  }
  // Harmonic minor family
  if (offset === 0) return relMinor
  return Scale.get(`${relMinor} harmonic minor`).notes[offset] ?? relMinor
}
```

Add `Scale` to the `import { Note } from "tonal"` line.

### Chord computation

```ts
// Before
const chords = getDiatonicChords(tonic, mode)

// After
const derivedTonic = computeDerivedTonic(tonic, mode)
const chords = getDiatonicChords(derivedTonic, mode)
```

`derivedTonic` is a render-time `const` (no state needed).

### Auto-notify parent on tonic/mode changes

The existing mount-only effect (currently `[]`) becomes `[tonic]`, and a parallel effect watches `[mode]`. Both call `onChordSelect` with degree-1 chord details (derived tonic, chord type, chord quality, primary scale name). This updates `panelRoot` and the study panel triggers in `reference-page-client` **without switching the active tab**.

```ts
// Fires on mount and whenever tonic (circle key) changes
useEffect(() => {
  const chord = chords.find(c => c.degree === 1)
  if (chord) {
    const soloScales = getSoloScales({ tonic: chord.tonic, type: chord.type, degree: chord.degree }, mode)
    onChordSelect?.(chord.tonic, chord.type, chord.quality, soloScales.primary.scaleName)
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [tonic])

// Fires whenever mode changes (after mount)
useEffect(() => {
  const chord = chords.find(c => c.degree === 1)
  if (chord) {
    const soloScales = getSoloScales({ tonic: chord.tonic, type: chord.type, degree: chord.degree }, mode)
    onChordSelect?.(chord.tonic, chord.type, chord.quality, soloScales.primary.scaleName)
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [mode])
```

Note: `chords` in the closure is computed from `derivedTonic` which is up-to-date at render time, so effects read the correct value.

### "Parent" label

Replace the current backward-direction "parent: Bb major" label with a forward-direction label showing the parent context:

| Mode | Circle = C | Label |
|------|-----------|-------|
| Ionian | C | *(none)* |
| Dorian | C | "mode 2 of C major" |
| Phrygian | C | "mode 3 of C major" |
| Harmonic Minor | C | "relative minor of C" |
| Locrian #6 | C | "mode 2 of A harmonic minor" |
| Phrygian Dominant | C | "mode 5 of A harmonic minor" |
| Melodic Minor | C | "relative minor of C" |
| Dorian b2 | C | "mode 2 of A melodic minor" |

Ordinals: 1st, 2nd, 3rd, 4th, 5th, 6th, 7th.

The `parentKey` and `parentLabel` variables and the `MODE_PARENT_INFO` constant are removed; the label is computed from `ALL_MODE_DEGREE_OFFSET` and family membership instead.

### "Over the whole mode" hint

Added in the Soloing panel area, shown when no chord is selected (same pattern as Progressions page). Uses `Scale` (already imported) to compute the notes.

```ts
const modeDisplayName = MODE_DISPLAY[mode] ?? mode  // e.g. "Dorian"
const modeScaleNotes = Scale.get(`${derivedTonic} ${TONAL_SCALE_NAME[mode] ?? mode}`).notes.join(" ")
```

Where `TONAL_SCALE_NAME` maps internal mode identifiers to TonalJS scale names (most are identical; "ionian" → "major", "aeolian" → "minor" as needed — check against existing `SCALE_TONAL_NAMES` in `solo-scales.ts`).

Rendered as a clickable button calling `onScaleSelect?.(derivedTonic, modeDisplayName)`, which switches to the Scales tab. Non-clickable fallback (plain text) if `onScaleSelect` is not provided.

### AddToGoalButton

```ts
// Before
displayName={`${tonic} ${mode}`}
defaultKey={tonic}

// After
displayName={`${derivedTonic} ${modeDisplayName}`}
defaultKey={derivedTonic}
```

### "Relative" checkbox

No logic change — `relativeRoman(degree)` maps modal degrees to parent-scale degrees using `modeOffset`. In the new design this correctly maps D Dorian's degrees back to C major degrees (e.g. degree 1 of D Dorian → ii of C major). Remains visible for major family modes only.

---

## Changes to `reference-page-client.tsx`

Remove `setPanelRoot(key)` from `handleKeySelect`:

```ts
// Before
function handleKeySelect(key: string) {
  setSelectedKey(key)
  setPanelRoot(key)       // ← remove
}

// After
function handleKeySelect(key: string) {
  setSelectedKey(key)
}
```

HarmonyTab's `[tonic]` effect fires after the circle key changes and calls `onChordSelect(derivedTonic, ...)`, which sets `panelRoot` to the derived value. No other changes.

---

## Data flow summary

```
Circle click → setSelectedKey(C)
  → HarmonyTab receives tonic="C"
  → computeDerivedTonic("C", "dorian") = "D"
  → getDiatonicChords("D", "dorian") → D Dorian chord tiles
  → useEffect[tonic] fires → onChordSelect("D", ...) → panelRoot="D", Scales tab primed for D

Mode dropdown → setMode("dorian")
  → computeDerivedTonic("C", "dorian") = "D"
  → getDiatonicChords("D", "dorian") → D Dorian chord tiles
  → useEffect[mode] fires → onChordSelect("D", ...) → panelRoot="D"

"Over the whole mode" click
  → onScaleSelect("D", "Dorian") → panelRoot="D", activeTab="scales"
```

---

## Out of scope

- No changes to Circle of Fifths component
- No changes to `HarmonyStudy` wrapper
- No changes to `SoloScalesPanel`, `SubstitutionsPanel`, or any study panel
- No new server actions or DB changes
