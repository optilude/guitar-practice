# Notes View — Standard Notation Stave Design

**Goal:** Add a standard notation (treble clef) stave above the existing tab stave in the "Notes" view (previously called "Tab") on the Scales and Arpeggios reference panels, with the same interval colour highlighting as the tab stave.

**Architecture:** Extend the existing single-SVG rendering approach in `lib/rendering/tab.ts`. Both staves are rendered into one `Renderer`/SVG. A single `renderNotesView` function replaces the existing `renderTab` function. The `TabViewer` component is renamed `NotesViewer`. Panel button labels change from "Tab" to "Notes".

**Tech Stack:** VexFlow 5.x (`Stave`, `StaveNote`, `Accidental`, `TabStave`, `TabNote`, `Formatter`), React, Vitest + Testing Library.

---

## Rendering approach

`renderNotesView(containerEl, scale, positionIndex)` replaces `renderTab`. It renders two staves into one SVG:

1. **Treble-clef `Stave`** at `y=10` — standard notation stave
2. **`TabStave`** at `y = notationStave.getBottomLineBottomY() + 15` — existing tab stave

Both staves use the same `x=10` and `width=490`. After drawing clefs, note-start x positions are synchronised:
```
const noteStartX = Math.max(notationStave.getNoteStartX(), tabStave.getNoteStartX())
notationStave.setNoteStartX(noteStartX)
tabStave.setNoteStartX(noteStartX)
```
This guarantees vertical alignment of noteheads between the two staves.

Notes are formatted and drawn with two separate `Formatter.FormatAndDraw` calls:
```
Formatter.FormatAndDraw(context, notationStave, staveNotes)
Formatter.FormatAndDraw(context, tabStave,      tabNotes)
```

The tab note-name and degree text labels below the tab stave are unchanged.

The existing auto-crop logic (computing `getBBox()` and setting `viewBox` + `style.height`) handles the taller combined SVG.

The renderer initial height is increased to accommodate both staves before auto-crop.

## StaveNote construction

Each fret position produces one **whole note** (`duration: "w"`) — stemless by default in VexFlow. Notes are created in the same ascending string order as the existing `TabNote` list.

```typescript
const staveNote = new StaveNote({
  clef:         "treble",
  keys:         [vexflowKey],   // e.g. "bb/3", "f#/4"
  duration:     "w",
  autoStem:     false,
})
staveNote.setStyle({ fillStyle: color, strokeStyle: color })
// Add accidental if needed:
if (noteName.includes("#")) staveNote.addModifier(new Accidental("#"), 0)
if (noteName.includes("b")) staveNote.addModifier(new Accidental("b"), 0)
```

No key signature is shown — accidentals are applied per-note.

## Pitch calculation

Fret position → MIDI → VexFlow key string:

```typescript
// Open string MIDI pitches (index 0 = string 6 low E, index 5 = string 1 high e)
const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64]

function fretToVexKey(string: number, fret: number, noteName: string): string {
  const midi   = OPEN_STRING_MIDI[6 - string] + fret
  const octave = Math.floor((midi - 12) / 12)
  const key    = noteName.toLowerCase()  // "Bb" → "bb", "F#" → "f#"
  return `${key}/${octave}`
}
```

The `noteName` is retrieved using the existing chroma-matching logic (already in `renderTab`). The octave is derived from the MIDI pitch using the VexFlow convention (`C4 = MIDI 60`, octave = `Math.floor((midi - 12) / 12)`).

## Colour coding

The same `intervalColor(interval, accentColor, mutedColor)` function determines colour for both `StaveNote` and `TabNote` objects. No new colour logic is required.

The colour key legend (R / 3·b3 / 5·b5·♯5 / 7·b7) in `NotesViewer` is unchanged.

---

## File changes

### `lib/rendering/tab.ts`

- Add `OPEN_STRING_MIDI` constant.
- Add `fretToVexKey(string, fret, noteName): string` helper.
- Import `Stave`, `StaveNote`, `Accidental` from VexFlow (destructured alongside existing imports).
- Rename exported function `renderTab` → `renderNotesView`.
- Inside the function:
  - Increase initial `renderer.resize()` height to accommodate both staves (e.g. 400px — auto-crop will reduce this).
  - Create `notationStave` (treble clef) and draw it.
  - Create `tabStave` (existing `TabStave`) offset below the notation stave.
  - Sync `noteStartX` between the two staves.
  - Build `staveNotes` (whole notes, coloured) and `tabNotes` (unchanged).
  - `Formatter.FormatAndDraw` for each stave.
  - SVG label injection and auto-crop unchanged.

### `app/(app)/reference/_components/tab-viewer.tsx`

- Rename file to `notes-viewer.tsx`.
- Rename exported component `TabViewer` → `NotesViewer`.
- Change import of `renderTab` to `renderNotesView`.
- No other changes to the component.

### `app/(app)/reference/_components/scale-panel.tsx`

- Import `NotesViewer` from `./notes-viewer`.
- Change `viewMode` type: `"tab" | "fretboard"` → `"notes" | "fretboard"`.
- Change default state from `"fretboard"` (already default) — no change needed.
- Change button label `"Tab"` → `"Notes"`.
- Change `viewMode === "tab"` guards → `viewMode === "notes"`.
- Change tab position selector `htmlFor` id for completeness.

### `app/(app)/reference/_components/arpeggio-panel.tsx`

- Same changes as `scale-panel.tsx`.

### `__tests__/reference/scale-panel.test.tsx`

- Update VexFlow mock to include `Stave`, `StaveNote`, `Voice`, `Accidental`.
- Change button queries from `/tab/i` → `/notes/i`.

### `__tests__/reference/arpeggio-panel.test.tsx`

- Same VexFlow mock update and button query update.

---

## Testing

Unit tests verify component behaviour only (rendering is mocked). Key test updates:

- VexFlow mock gains stub classes for `Stave`, `StaveNote`, and `Accidental`.
- Any test clicking the "Tab" button to enter tab/notes mode updates the button name query to `/notes/i`.
- No new test cases required — the existing position-selector and viewer tests already cover the notes view; they just need the button name updated.
- `renderNotesView` itself is not unit-tested (it runs in a real browser via `useEffect`; the VexFlow calls are covered by the mock).
