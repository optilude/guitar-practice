# Chords Panel — Soloing Tab Design

## Goal

Add a "Soloing" tab to the Chords panel that lists scales a guitarist can use to solo over the currently selected chord, with click-through navigation to the Scales tab.

## Architecture

Four files change. No new files. No database or server-action changes.

| File | Change |
|---|---|
| `lib/theory/solo-scales.ts` | Add `defaultModeForChordType(chordType)` export |
| `app/(app)/reference/_components/chord-panel.tsx` | Add Soloing view mode, mode selector, wire `SoloScalesPanel` |
| `app/(app)/reference/page.tsx` | Pass `onScaleSelect` prop to `ChordPanel` |
| `app/(app)/reference/_components/solo-scales-panel.tsx` | No changes — reused as-is |

## Chord-Type to Default Mode Mapping

New export in `lib/theory/solo-scales.ts`:

```ts
export function defaultModeForChordType(chordType: string): string {
  if (["", "maj", "maj7", "maj9", "maj11", "maj13", "6", "add9", "6/9"].some(t => chordType === t)) return "ionian"
  if (["m7b5", "dim", "dim7"].some(t => chordType === t)) return "locrian"
  if (["7", "9", "11", "13", "7sus4"].some(t => chordType === t)) return "mixolydian"
  if (["mmaj7", "mmaj9"].some(t => chordType === t)) return "melodic minor"
  // default: all other minor types (m, m6, m7, m9, madd9, etc.)
  return "dorian"
}
```

"Melodic Minor" is not one of the 7 diatonic modes; it is passed to `getSoloScales` as a special case. `getSoloScales` already handles it via `ADDITIONAL_BY_TYPE`.

## UI — View Mode Toggle

The existing `[Fretboard] [Fingerings]` pill toggle gains a third button:

```
[Fretboard] [Fingerings] [Soloing]
```

Same visual pattern: `flex rounded border border-border overflow-hidden`, each button `px-3 py-1.5 transition-colors`, active state `bg-accent text-accent-foreground`, inactive `bg-card text-muted-foreground hover:bg-muted`, separators `border-l border-border`.

`viewMode` state type expands from `"fretboard" | "fingerings"` to `"fretboard" | "fingerings" | "soloing"`.

## UI — Soloing View Content

When `viewMode === "soloing"`:

- All fretboard controls (box system selector, position selector, label toggle, fretboard renderer) are hidden
- A mode selector is shown followed by `SoloScalesPanel`

**Mode selector:** A `<select>` dropdown listing the 7 modes (Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian) plus "Melodic Minor". Use the same `<select>` styling as the existing mode selector in `harmony-tab.tsx` (`bg-card border border-border rounded px-2 py-1.5 text-sm`). Default is derived from `defaultModeForChordType(chordType)`.

**Mode reset behaviour:** When `chordType` changes, the mode resets to `defaultModeForChordType(newChordType)` via `useEffect`. When the user manually selects a mode, it stays until the chord type changes again.

**`getSoloScales` call:**
```ts
getSoloScales({ tonic: root, type: chordType, degree: 1 }, selectedMode)
```
`degree: 1` treats the chord as the root/tonic of the chosen mode — consistent with how the Harmony tab handles the I chord.

**`SoloScalesPanel`** is rendered with the result, with `onScaleSelect` wired through.

## Data Flow — "Jump to Scales Tab"

`SoloScalesPanel` already renders primary and alternative scale names as clickable buttons that call `onScaleSelect(tonic, scaleName)`. The callback chain:

```
SoloScalesPanel
  → onScaleSelect(tonic, scaleName)        [chord-panel.tsx prop]
  → ReferencePage.handleScaleSelect()      [page.tsx — already exists]
      setPanelRoot(tonic)
      setPanelScaleTypeTrigger({ type: SOLO_SCALE_TO_PANEL_TYPE[scaleName] })
      setActiveTab("scales")
```

`ReferencePage` already has `handleScaleSelect`, `SOLO_SCALE_TO_PANEL_TYPE`, and passes it to `HarmonyStudy`. The only change needed in `page.tsx` is passing `onScaleSelect={handleScaleSelect}` to `ChordPanel`.

`ChordPanel` adds `onScaleSelect?: (tonic: string, scaleName: string) => void` to its props interface and passes it through to `SoloScalesPanel`.

## Edge Cases

- If `getSoloScales` returns no results (unknown chord type), `SoloScalesPanel` should gracefully show nothing or a fallback message — this is already handled by the component.
- Switching away from Soloing view and back retains the manually selected mode until chord type changes.
- The `"melodic minor"` mode string is not in the standard 7-mode list used by `getSoloScales`'s primary scale rotation. For mmaj chord types, the primary scale returned by `getSoloScales` will fall back to the chord-type alternative logic in `ADDITIONAL_BY_TYPE`. This is acceptable — melodic minor chord types are uncommon and the alternatives are musically correct.

## What Is Not In Scope

- Fretboard visualisation of the recommended scale (text-only, same as Harmony and Progressions tabs)
- Persisting the selected mode across sessions
- Changes to the Scales, Arpeggios, or Triads panels
