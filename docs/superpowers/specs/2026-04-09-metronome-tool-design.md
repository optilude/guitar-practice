# Metronome Tool Implementation Design

## Goal

Build a standalone metronome tool page at `/tools/metronome` with time signature selection and per-beat muting. Also add time signature selection to the existing simple metronome in the practice session runner.

## Architecture

Extend the existing `useMetronome` hook with enabled-beat tracking, then build a `MetronomeClient` component for the tool page that surfaces all controls. The session runner's `MetronomePanel` gets a minimal time signature dropdown only — no beat toggling.

**Tech stack:** Web Audio API (already in use), React hooks, Tailwind CSS, Next.js App Router.

---

## Files

| Action | Path |
|--------|------|
| Create | `lib/theory/time-signatures.ts` |
| Modify | `lib/hooks/use-metronome.ts` |
| Create | `app/(app)/tools/metronome/_components/metronome-client.tsx` |
| Modify | `app/(app)/tools/metronome/page.tsx` |
| Modify | `app/(app)/sessions/run/_components/metronome-panel.tsx` |
| Modify | `app/(app)/sessions/run/_components/session-runner-client.tsx` |

---

## Section 1: `time-signatures.ts`

A pure data constant, no logic. Imported by both the tool client and `MetronomePanel`.

```ts
export const TIME_SIGNATURES = [
  { label: "2/4", beats: 2 },
  { label: "3/4", beats: 3 },
  { label: "4/4", beats: 4 },  // default
  { label: "5/4", beats: 5 },
  { label: "6/8", beats: 6 },
  { label: "7/8", beats: 7 },
  { label: "9/8", beats: 9 },
  { label: "12/8", beats: 12 },
] as const

export type TimeSig = typeof TIME_SIGNATURES[number]
export const DEFAULT_BEATS_PER_BAR = 4
```

---

## Section 2: `useMetronome` hook changes

The hook imports `DEFAULT_BEATS_PER_BAR` from `time-signatures.ts` and uses it for both its `beatsPerBar` initial state and the initial `enabledBeats` set, replacing the current hardcoded `4`.

### New state

```ts
const [enabledBeats, setEnabledBeatsState] = useState<Set<number>>(
  () => new Set(Array.from({ length: DEFAULT_BEATS_PER_BAR }, (_, i) => i))
)
const enabledBeatsRef = useRef<Set<number>>(
  new Set(Array.from({ length: DEFAULT_BEATS_PER_BAR }, (_, i) => i))
)
```

### `setEnabledBeats`

Updates both state and ref (same dual-write pattern as `beatsPerBarRef`):

```ts
const setEnabledBeats = useCallback((beats: Set<number>) => {
  enabledBeatsRef.current = beats
  setEnabledBeatsState(beats)
}, [])
```

### `setBeatsPerBar` — resets enabled beats

When the bar length changes, reset to all beats enabled for the new length:

```ts
const handleSetBeatsPerBar = useCallback((val: number) => {
  beatsPerBarRef.current = val
  setBeatsPerBar(val)
  const all = new Set(Array.from({ length: val }, (_, i) => i))
  enabledBeatsRef.current = all
  setEnabledBeatsState(all)
}, [])
```

### Conditional scheduling in `scheduleAhead`

The clock advances unconditionally; the oscillator is skipped for muted beats:

```ts
const currentBeat = beatCountRef.current % beatsPerBarRef.current
if (enabledBeatsRef.current.has(currentBeat)) {
  scheduleTick(ctx, nextTickRef.current, currentBeat === 0)
}
setBeat(currentBeat)
beatCountRef.current += 1
nextTickRef.current += interval
```

### Updated return value

```ts
return {
  bpm, setBpm,
  isPlaying, beat,
  beatsPerBar, setBeatsPerBar: handleSetBeatsPerBar,
  enabledBeats, setEnabledBeats,
  start, stop,
}
```

The session runner ignores `enabledBeats` and `setEnabledBeats`.

---

## Section 3: `MetronomeClient` (standalone tool)

`"use client"` component. Calls `useMetronome()` directly — no props. Layout (top to bottom):

### Time signature selector

A compact button group — one button per entry in `TIME_SIGNATURES`. Selecting a signature calls `setBeatsPerBar(beats)`, which resets enabled beats automatically. The active signature is highlighted with the accent style.

### Beat grid

A row of `beatsPerBar` circular buttons. Each button is simultaneously a toggle and a live playback indicator:

| State | Appearance |
|-------|-----------|
| Enabled, not current beat | Filled, accent color |
| Enabled, current beat (playing) | Bright highlight / pulsed ring |
| Disabled, not current beat | Muted / gray fill |
| Disabled, current beat (playing) | Gray fill with a dim pulse ring — shows position but stays silent |
| Beat index 0 (downbeat) | Rendered as a larger circle (40px) vs regular beats (32px) |

Clicking a beat button calls `setEnabledBeats` with the updated set (toggle that index in/out). Beats can be toggled while playing or stopped.

### BPM control

Identical pattern to the existing `MetronomePanel`:
- `−` and `+` buttons (step 1, clamped 20–300)
- Centre value is click-to-type (inline input, same behaviour as existing panel)

### Start/Stop button

Same `btn("standalone", "sm")` style as the session panel.

---

## Section 4: `MetronomePanel` changes (session runner)

Two new props, both optional with defaults to preserve backwards compatibility:

```ts
interface MetronomePanelProps {
  bpm: number
  isRunning: boolean
  onBpmChange: (bpm: number) => void
  onStart: () => void
  onStop: () => void
  beatsPerBar?: number
  onBeatsPerBarChange?: (beats: number) => void
}
```

A `<select>` dropdown is inserted between the "BPM" label and the BPM control, showing all `TIME_SIGNATURES` labels. Styled consistently with the transposer's `SELECT_CLASS` pattern. If `onBeatsPerBarChange` is not provided, the selector is omitted.

`session-runner-client.tsx` passes `beatsPerBar` and `setBeatsPerBar` from `useMetronome()` down to `MetronomePanel`. No other changes to the session runner.

---

## Beat indicator behaviour notes

- `beat` from the hook updates on every beat tick, including muted beats — so the visual indicator always tracks position even when the metronome is silent on that beat.
- When stopped, `beat` resets to `0` and no beat is highlighted.
- Changing time signature while playing resets the beat count (stop + restart is acceptable; the hook already does this on BPM change).

---

## Out of scope

- Tap tempo
- Volume control
- Subdivision options (e.g. triplets)
- Different sounds per beat
- Saving metronome settings

