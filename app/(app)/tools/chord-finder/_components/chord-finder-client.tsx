"use client"

import { useState, useMemo } from "react"
import { detectChords, type DetectedChord } from "@/lib/theory/chord-finder"
import { listScaleTypes } from "@/lib/theory/scales"
import { InteractiveChordGrid } from "./interactive-chord-grid"
import { btn } from "@/lib/button-styles"

const ROOT_NOTES = ["Ab", "A", "Bb", "B", "C", "Db", "D", "Eb", "E", "F", "Gb", "G"] as const

const MAJOR_SCALE_MODES = ["Major", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Aeolian", "Locrian"]
const MELODIC_MINOR_MODES = ["Melodic Minor", "Dorian b2", "Lydian Augmented", "Lydian Dominant", "Mixolydian b6", "Locrian #2", "Altered"]
const HARMONIC_MINOR_MODES = ["Harmonic Minor", "Locrian #6", "Ionian #5", "Dorian #4", "Phrygian Dominant", "Lydian #2", "Altered Diminished"]
const PENTATONICS = ["Pentatonic Major", "Pentatonic Minor", "Blues"]
const ALL_GROUPED = new Set([...MAJOR_SCALE_MODES, ...MELODIC_MINOR_MODES, ...HARMONIC_MINOR_MODES, ...PENTATONICS])

const SCALE_LABEL: Record<string, string> = {
  "Major": "Ionian (major)",
  "Aeolian": "Aeolian (natural minor)",
  "Pentatonic Major": "Major Pentatonic",
  "Pentatonic Minor": "Minor Pentatonic",
}

const INITIAL_FRETS: (number | null)[] = [null, null, null, null, null, null]

function qualityDescription(chord: DetectedChord): string {
  const q = chord.quality
  if (!q || q === "M") return "major"
  if (q === "m" || q === "min" || q === "-") return "minor"
  if (q === "dim" || q === "o" || q === "°") return "diminished"
  if (q === "aug" || q === "+") return "augmented"
  if (q === "maj7" || q === "M7" || q === "Δ7") return "major 7th"
  if (q === "m7" || q === "min7" || q === "-7") return "minor 7th"
  if (q === "7" || q === "dom") return "dominant 7th"
  if (q === "dim7" || q === "o7") return "diminished 7th"
  if (q === "m7b5" || q === "ø" || q === "ø7") return "half diminished"
  return q
}

function positionLabel(chord: DetectedChord): string {
  if (chord.isRootPosition) return "root position"
  const ordinals = ["root position", "1st inversion", "2nd inversion", "3rd inversion", "4th inversion"]
  return ordinals[chord.inversionNumber] ?? `${chord.inversionNumber}th inversion`
}

export function ChordFinderClient() {
  const [frets, setFrets] = useState<(number | null)[]>(INITIAL_FRETS)
  const [startFret, setStartFret] = useState(1)
  const [filterKey, setFilterKey] = useState("")
  const [filterScale, setFilterScale] = useState("")

  const scaleTypes = useMemo(() => listScaleTypes(), [])
  const majorModes = useMemo(() => MAJOR_SCALE_MODES.filter((t) => scaleTypes.includes(t)), [scaleTypes])
  const melodicMinorModes = useMemo(() => MELODIC_MINOR_MODES.filter((t) => scaleTypes.includes(t)), [scaleTypes])
  const harmonicMinorModes = useMemo(() => HARMONIC_MINOR_MODES.filter((t) => scaleTypes.includes(t)), [scaleTypes])
  const pentatonics = useMemo(() => PENTATONICS.filter((t) => scaleTypes.includes(t)), [scaleTypes])
  const otherTypes = useMemo(() => scaleTypes.filter((t) => !ALL_GROUPED.has(t)), [scaleTypes])

  const chords = useMemo(
    () =>
      detectChords(frets, {
        key: filterKey || undefined,
        scaleType: filterScale || undefined,
      }),
    [frets, filterKey, filterScale],
  )

  const allMuted = frets.every((f) => f === null)

  return (
    <div className="space-y-4">
      {/* Key/scale filter — always visible */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="cf-root-select">
            Root
          </label>
          <select
            id="cf-root-select"
            value={filterKey}
            onChange={(e) => setFilterKey(e.target.value)}
            className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
          >
            <option value="">Any</option>
            {ROOT_NOTES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="cf-scale-select">
            Scale
          </label>
          <select
            id="cf-scale-select"
            value={filterScale}
            onChange={(e) => setFilterScale(e.target.value)}
            className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
          >
            <option value="">Any</option>
            <optgroup label="Modes of the Major scale">
              {majorModes.map((t) => <option key={t} value={t}>{SCALE_LABEL[t] ?? t}</option>)}
            </optgroup>
            <optgroup label="Modes of the Melodic Minor scale">
              {melodicMinorModes.map((t) => <option key={t} value={t}>{SCALE_LABEL[t] ?? t}</option>)}
            </optgroup>
            <optgroup label="Modes of the Harmonic Minor scale">
              {harmonicMinorModes.map((t) => <option key={t} value={t}>{SCALE_LABEL[t] ?? t}</option>)}
            </optgroup>
            <optgroup label="Pentatonics">
              {pentatonics.map((t) => <option key={t} value={t}>{SCALE_LABEL[t] ?? t}</option>)}
            </optgroup>
            {otherTypes.length > 0 && (
              <optgroup label="Other">
                {otherTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </optgroup>
            )}
          </select>
        </div>

        {(filterKey || filterScale) && (
          <button
            onClick={() => { setFilterKey(""); setFilterScale("") }}
            className={btn("standalone", "sm")}
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Main: grid left, results right */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left: chord diagram + clear button */}
        <div className="flex-shrink-0 flex flex-col gap-3">
          <InteractiveChordGrid
            frets={frets}
            startFret={startFret}
            onFretsChange={setFrets}
            onStartFretChange={setStartFret}
          />
          <button onClick={() => setFrets(INITIAL_FRETS)} className={btn("standalone", "sm")}>
            Clear
          </button>
        </div>

        {/* Right: results */}
        <div className="flex-1 min-w-0 pt-1">
          {allMuted ? (
            <p className="text-sm text-muted-foreground">Place dots on the diagram to identify chords.</p>
          ) : chords.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No chords found{filterKey && filterScale ? ` in ${filterKey} ${filterScale}` : ""}.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {chords.map((chord, i) => (
                <div key={i} className="flex items-baseline gap-2 py-2">
                  <span className="font-medium text-foreground text-sm w-16 shrink-0">{chord.symbol}</span>
                  <span className="text-xs text-muted-foreground">{qualityDescription(chord)}</span>
                  <span className="text-xs text-muted-foreground ml-auto shrink-0">
                    {positionLabel(chord)}
                    {chord.degreeLabel && (
                      <span className="ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-xs font-mono font-medium bg-accent/10 text-accent border border-accent/20">
                        {chord.degreeLabel}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
