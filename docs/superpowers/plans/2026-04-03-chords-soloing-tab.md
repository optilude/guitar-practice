# Chords Panel — Soloing Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Soloing" tab to the Chords panel that lists scales for soloing over the selected chord, with mode context control and click-through navigation to the Scales tab.

**Architecture:** Three files change — `lib/theory/solo-scales.ts` gains a `defaultModeForChordType` utility; `chord-panel.tsx` expands its view-mode toggle, adds mode state, and renders `SoloScalesPanel`; `page.tsx` passes `onScaleSelect` down to `ChordPanel`. The existing `SoloScalesPanel` component is reused without modification.

**Tech Stack:** Next.js 16 App Router, React `useState`/`useEffect`/`useMemo`, TonalJS (via existing `getSoloScales`), Tailwind v4.

---

## File map

| File | Change |
|---|---|
| `lib/theory/solo-scales.ts` | Add `defaultModeForChordType` export |
| `app/(app)/reference/_components/chord-panel.tsx` | Expand view toggle, add soloingMode state + useEffect + useMemo, render SoloScalesPanel |
| `app/(app)/reference/page.tsx` | Pass `onScaleSelect={handleScaleSelect}` to ChordPanel |
| `app/(app)/reference/_components/solo-scales-panel.tsx` | No changes |

---

### Task 1: Add `defaultModeForChordType` to `lib/theory/solo-scales.ts`

**Files:**
- Modify: `lib/theory/solo-scales.ts` (append after line 104)

This is a pure function with no side effects. There is no test runner in this project — verify by reading the output in the browser after Task 3 is done. For now, just implement and confirm the logic matches the table below.

- [ ] **Step 1: Add the function**

Open `lib/theory/solo-scales.ts`. After the closing `}` of `getSoloScales` (currently line 104), append:

```ts
// ---------------------------------------------------------------------------
// Default modal context for a chord type
// Used by ChordPanel to seed the Soloing tab's mode selector
// ---------------------------------------------------------------------------
export function defaultModeForChordType(chordType: string): string {
  const t = chordType.toLowerCase()
  if (t.startsWith("mmaj")) return "melodic minor"
  if (t === "m7b5" || t.startsWith("dim")) return "locrian"
  if (t.startsWith("maj") || t === "major" || t === "6" || t === "6/9" || t === "add9") return "ionian"
  if (/^(7|9|11|13)/.test(t) || t === "7 shell" || t.includes("sus")) return "mixolydian"
  return "dorian"
}
```

The logic by priority:
1. `mmaj7`, `mmaj9` → `"melodic minor"` (melodic minor chord types)
2. `m7b5`, `dim`, `dim7`, `dim7/m6 shell` → `"locrian"`
3. `major`, `maj7`, `maj9`, `maj7 shell`, `maj6 shell`, `6`, `6/9`, `add9` → `"ionian"`
4. `7`, `9`, `11`, `13`, `7 shell`, `7sus4` → `"mixolydian"`
5. Everything else (`minor`, `m7`, `m6`, `m9`, `m7 shell`, etc.) → `"dorian"`

Expected results for key chord types:

| Input | Expected |
|---|---|
| `"major"` | `"ionian"` |
| `"maj7"` | `"ionian"` |
| `"maj7 shell"` | `"ionian"` |
| `"minor"` | `"dorian"` |
| `"m7"` | `"dorian"` |
| `"m7 shell"` | `"dorian"` |
| `"7"` | `"mixolydian"` |
| `"9"` | `"mixolydian"` |
| `"7 shell"` | `"mixolydian"` |
| `"7sus4"` | `"mixolydian"` |
| `"dim"` | `"locrian"` |
| `"dim7"` | `"locrian"` |
| `"m7b5"` | `"locrian"` |
| `"dim7/m6 shell"` | `"locrian"` |
| `"mmaj7"` | `"melodic minor"` |

- [ ] **Step 2: Commit**

```bash
git add lib/theory/solo-scales.ts
git commit -m "feat: add defaultModeForChordType utility to solo-scales"
```

---

### Task 2: Wire `onScaleSelect` from `page.tsx` to `ChordPanel`

**Files:**
- Modify: `app/(app)/reference/_components/chord-panel.tsx` (lines 70–76)
- Modify: `app/(app)/reference/page.tsx` (line 143)

- [ ] **Step 1: Add `onScaleSelect` prop to ChordPanel's interface**

In `app/(app)/reference/_components/chord-panel.tsx`, replace lines 70–74:

```tsx
interface ChordPanelProps {
  root: string
  onRootChange: (root: string) => void
  chordTypeTrigger?: { type: string } | null
}
```

With:

```tsx
interface ChordPanelProps {
  root: string
  onRootChange: (root: string) => void
  chordTypeTrigger?: { type: string } | null
  onScaleSelect?: (tonic: string, scaleName: string) => void
}
```

- [ ] **Step 2: Destructure the new prop in the function signature**

On line 76, replace:

```tsx
export function ChordPanel({ root, onRootChange, chordTypeTrigger }: ChordPanelProps) {
```

With:

```tsx
export function ChordPanel({ root, onRootChange, chordTypeTrigger, onScaleSelect }: ChordPanelProps) {
```

- [ ] **Step 3: Pass the handler in `page.tsx`**

In `app/(app)/reference/page.tsx`, replace line 143:

```tsx
          {activeTab === "chords"    && <ChordPanel    root={panelRoot} onRootChange={setPanelRoot} chordTypeTrigger={panelChordTypeTrigger} />}
```

With:

```tsx
          {activeTab === "chords"    && <ChordPanel    root={panelRoot} onRootChange={setPanelRoot} chordTypeTrigger={panelChordTypeTrigger} onScaleSelect={handleScaleSelect} />}
```

`handleScaleSelect` is already defined at line 70 of `page.tsx` — it sets `panelRoot`, `panelScaleTypeTrigger`, and switches `activeTab` to `"scales"`. No changes needed to that function.

- [ ] **Step 4: Commit**

```bash
git add app/(app)/reference/_components/chord-panel.tsx app/(app)/reference/page.tsx
git commit -m "feat: wire onScaleSelect from ReferencePage into ChordPanel"
```

---

### Task 3: Add Soloing view mode to `chord-panel.tsx`

**Files:**
- Modify: `app/(app)/reference/_components/chord-panel.tsx`

This is the main implementation task. Read the current file carefully before editing — the line numbers below are from the version read during planning.

- [ ] **Step 1: Add imports**

On line 3, the current import is:

```tsx
import { useState, useMemo, useEffect } from "react"
```

It already imports all three hooks — no change needed there.

On lines 4–18, there are existing imports. After the last import block (after line 18, which imports `{ cn } from "@/lib/utils"` and `AddToGoalButton`), add two new imports:

```tsx
import { defaultModeForChordType, getSoloScales } from "@/lib/theory/solo-scales"
import { SoloScalesPanel } from "./solo-scales-panel"
```

The full import block at the top of the file should now look like:

```tsx
"use client"

import { useState, useMemo, useEffect } from "react"
import {
  getChord, listChordDbSuffixes, getChordPositions,
  SHELL_CHORD_TYPES, getShellChordPositions,
  getChordAsScale,
} from "@/lib/theory"
import Chord from "@tombatossals/react-chords/lib/Chord"
import { FretboardViewer } from "./fretboard-viewer"
import {
  getArpeggioBoxSystems,
  CHORD_TYPE_TO_SCALE,
  CAGED_BOX_LABELS,
} from "@/lib/rendering/fretboard"
import type { BoxSystem } from "@/lib/rendering/fretboard"
import { cn } from "@/lib/utils"
import { AddToGoalButton } from "@/components/add-to-goal-button"
import { defaultModeForChordType, getSoloScales } from "@/lib/theory/solo-scales"
import { SoloScalesPanel } from "./solo-scales-panel"
```

- [ ] **Step 2: Add SOLO_MODE_OPTIONS constant**

After the `BOX_SYSTEM_LABELS` constant (currently around line 62–68) and before the `ChordPanelProps` interface (line 70), add:

```tsx
const SOLO_MODE_OPTIONS = [
  { value: "ionian",        label: "Ionian" },
  { value: "dorian",        label: "Dorian" },
  { value: "phrygian",      label: "Phrygian" },
  { value: "lydian",        label: "Lydian" },
  { value: "mixolydian",    label: "Mixolydian" },
  { value: "aeolian",       label: "Aeolian" },
  { value: "locrian",       label: "Locrian" },
  { value: "melodic minor", label: "Melodic Minor" },
]
```

- [ ] **Step 3: Expand `viewMode` type and add `soloingMode` state**

Currently on line 91:

```tsx
  const [viewMode, setViewMode]   = useState<"fretboard" | "fingerings">("fretboard")
```

Replace with:

```tsx
  const [viewMode, setViewMode]     = useState<"fretboard" | "fingerings" | "soloing">("fretboard")
  const [soloingMode, setSoloingMode] = useState(() => defaultModeForChordType(COMMON_TYPES[0]))
```

`COMMON_TYPES[0]` is `"major"`, so the initial `soloingMode` is `"ionian"`.

- [ ] **Step 4: Add `useEffect` to reset `soloingMode` when `chordType` changes**

Currently lines 88–90 handle the `chordTypeTrigger` effect:

```tsx
  useEffect(() => {
    if (chordTypeTrigger) setChordType(chordTypeTrigger.type)
  }, [chordTypeTrigger]) // eslint-disable-line react-hooks/exhaustive-deps
```

After this block, add a second effect:

```tsx
  useEffect(() => {
    setSoloingMode(defaultModeForChordType(chordType))
  }, [chordType]) // eslint-disable-line react-hooks/exhaustive-deps
```

This resets the mode selector to the canonical default whenever the chord type changes. The user can override it by changing the selector, but the override clears on the next chord type switch.

- [ ] **Step 5: Add `soloScales` useMemo**

After the existing `useMemo` calls (after the `isShell` constant around line 113), add:

```tsx
  const soloScales = useMemo(
    () => getSoloScales({ tonic: root, type: chordType, degree: 1 }, soloingMode),
    [root, chordType, soloingMode]
  )
```

- [ ] **Step 6: Add "Soloing" button to the view mode toggle**

Currently lines 204–228 render the `[Fretboard] [Fingerings]` toggle. Replace that block with:

```tsx
      {/* View mode toggle */}
      <div className="flex rounded border border-border overflow-hidden text-sm w-fit">
        <button
          onClick={() => setViewMode("fretboard")}
          className={cn(
            "px-3 py-1.5 transition-colors",
            viewMode === "fretboard"
              ? "bg-accent text-accent-foreground"
              : "bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          Fretboard
        </button>
        <button
          onClick={() => setViewMode("fingerings")}
          className={cn(
            "px-3 py-1.5 transition-colors border-l border-border",
            viewMode === "fingerings"
              ? "bg-accent text-accent-foreground"
              : "bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          Fingerings
        </button>
        <button
          onClick={() => setViewMode("soloing")}
          className={cn(
            "px-3 py-1.5 transition-colors border-l border-border",
            viewMode === "soloing"
              ? "bg-accent text-accent-foreground"
              : "bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          Soloing
        </button>
      </div>
```

- [ ] **Step 7: Add Soloing view content**

Currently the file ends with the Fingerings block closing at line 317:

```tsx
      )}
    </div>
  )
}
```

Replace those final 4 lines with:

```tsx
      )}

      {/* Soloing */}
      {viewMode === "soloing" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="chord-solo-mode-select">
              Modal context
            </label>
            <select
              id="chord-solo-mode-select"
              value={soloingMode}
              onChange={(e) => setSoloingMode(e.target.value)}
              className="bg-card border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent w-fit"
            >
              {SOLO_MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <SoloScalesPanel
            scales={soloScales}
            chordName={`${root}${chordType}`}
            onScaleSelect={onScaleSelect}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 8: Verify in browser**

Run `npm run dev` and navigate to `/reference`, click the Chords tab.

Check:
1. The toggle now shows `[Fretboard] [Fingerings] [Soloing]` — same pill style as before
2. Clicking Soloing hides the fretboard; shows the mode selector and scale list
3. With root C and chord type `major`: mode selector shows "Ionian" selected; primary scale shown is "C Ionian (major)"
4. Change chord type to `m7`: mode selector resets to "Dorian"; primary scale is "C Dorian"; alternatives include "C Minor Pentatonic"
5. Change chord type to `7`: mode resets to "Mixolydian"
6. Change chord type to `dim`: mode resets to "Locrian"
7. Manually change mode selector to "Lydian" while on `maj7`: primary scale updates to "C Lydian"; then change chord type — mode resets to "Ionian"
8. Click primary scale name (e.g. "C Ionian (major)"): page switches to Scales tab with C Major selected
9. Click an alternative scale (e.g. "C Minor Pentatonic"): page switches to Scales tab with Pentatonic Minor selected
10. Switch back to Fretboard — fretboard renders normally, Soloing selection did not affect it

- [ ] **Step 9: Commit**

```bash
git add app/(app)/reference/_components/chord-panel.tsx
git commit -m "feat: add Soloing tab to Chords panel with modal context selector and scale navigation"
```
