"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { detectChords, buildChromaMap, type DetectedChord } from "@/lib/theory/chord-finder"
import { listScaleTypes, getScale } from "@/lib/theory/scales"
import { InteractiveChordGrid, type GridMetrics } from "./interactive-chord-grid"
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

const TONAL_TO_DEGREE: Record<string, string> = {
  "1P": "1", "2m": "b2", "2M": "2", "2A": "#2",
  "3m": "b3", "3M": "3", "4P": "4", "4A": "#4",
  "5d": "b5", "5P": "5", "5A": "#5",
  "6m": "b6", "6M": "6", "7m": "b7", "7M": "7",
}
const intervalToDegree = (iv: string) => TONAL_TO_DEGREE[iv] ?? iv

const INITIAL_FRETS: (number | null)[] = [null, null, null, null, null, null]
const INITIAL_METRICS: GridMetrics = { inputTopPx: 0, buttonOffsetPx: 0, buttonWidthPx: 0, nutTopPx: 0 }

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

function chordName(chord: DetectedChord): string {
  return `${chord.root} ${qualityDescription(chord)}`
}

function positionLabel(chord: DetectedChord): string {
  if (chord.isRootPosition) return "root position"
  const ordinals = ["root position", "1st inversion", "2nd inversion", "3rd inversion", "4th inversion"]
  return ordinals[chord.inversionNumber] ?? `${chord.inversionNumber}th inversion`
}

export function ChordFinderClient() {
  const [frets, setFrets] = useState<(number | null)[]>(INITIAL_FRETS)
  const [startFret, setStartFret] = useState(1)
  const [metrics, setMetrics] = useState<GridMetrics>(INITIAL_METRICS)
  const [resultsPaddingTop, setResultsPaddingTop] = useState(0)
  const [filterKey, setFilterKey] = useState("")
  const [filterScale, setFilterScale] = useState("")

  const diagramRef = useRef<HTMLDivElement>(null)
  const rightColRef = useRef<HTMLDivElement>(null)

  const scaleTypes = useMemo(() => listScaleTypes(), [])
  const majorModes = useMemo(() => MAJOR_SCALE_MODES.filter((t) => scaleTypes.includes(t)), [scaleTypes])
  const melodicMinorModes = useMemo(() => MELODIC_MINOR_MODES.filter((t) => scaleTypes.includes(t)), [scaleTypes])
  const harmonicMinorModes = useMemo(() => HARMONIC_MINOR_MODES.filter((t) => scaleTypes.includes(t)), [scaleTypes])
  const pentatonics = useMemo(() => PENTATONICS.filter((t) => scaleTypes.includes(t)), [scaleTypes])
  const otherTypes = useMemo(() => scaleTypes.filter((t) => !ALL_GROUPED.has(t)), [scaleTypes])

  const scaleInfo = useMemo(() => {
    if (!filterKey || !filterScale) return null
    try { return getScale(filterKey, filterScale) } catch { return null }
  }, [filterKey, filterScale])

  const chromaToNote = useMemo(() => buildChromaMap(scaleInfo?.notes ?? null), [scaleInfo])

  const chords = useMemo(
    () => detectChords(frets, { key: filterKey || undefined, scaleType: filterScale || undefined }),
    [frets, filterKey, filterScale],
  )

  // Align results column top with the nut line on the diagram
  useEffect(() => {
    if (!diagramRef.current || !rightColRef.current || metrics.nutTopPx === 0) return
    const diagramTop = diagramRef.current.getBoundingClientRect().top
    const rightTop = rightColRef.current.getBoundingClientRect().top
    setResultsPaddingTop(Math.max(0, diagramTop - rightTop + metrics.nutTopPx - 10))
  }, [metrics])

  const allMuted = frets.every((f) => f === null)

  function handleClear() {
    setFrets(INITIAL_FRETS)
    setStartFret(1)
    setFilterKey("")
    setFilterScale("")
  }

  const buttonStyle = metrics.buttonWidthPx > 0
    ? { marginLeft: `${metrics.buttonOffsetPx}px`, width: `${metrics.buttonWidthPx}px` }
    : undefined

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-16">
      {/* Left column: shrink-wrapped to content */}
      <div className="flex flex-col gap-3 shrink-0">
        {/* Key/scale filter */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="cf-root-select">
              Key
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
        </div>

        {/* Notes + Formula — always rendered to reserve space, hidden when no scale selected */}
        <div className={`text-xs text-muted-foreground space-y-0.5 ${scaleInfo ? "" : "invisible"}`}>
          <p><span className="text-foreground font-medium">Notes</span>&ensp;{scaleInfo?.notes.join("  ") ?? ""}</p>
          <p><span className="text-foreground font-medium">Formula</span>&ensp;{scaleInfo?.intervals.map(intervalToDegree).join(" – ") ?? ""}</p>
        </div>

        {/* Chord grid + clear button, fret input alongside */}
        <div ref={diagramRef} className="flex items-start gap-1">
          <div className="w-fit flex flex-col gap-2">
            <InteractiveChordGrid
              frets={frets}
              startFret={startFret}
              chromaToNote={chromaToNote}
              onFretsChange={setFrets}
              onMetricsChange={setMetrics}
            />
            <button
              type="button"
              onClick={handleClear}
              style={buttonStyle}
              className={btn("destructive", "sm")}
            >
              Clear
            </button>
          </div>
          <input
            type="number"
            min={1}
            max={22}
            value={startFret}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10)
              if (!isNaN(v) && v >= 1 && v <= 22) setStartFret(v)
            }}
            style={{ marginTop: `${Math.max(0, metrics.inputTopPx - 19)}px`, marginLeft: "15px" }}
            className="w-14 rounded border border-border bg-card text-foreground text-sm text-center px-1 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
            aria-label="Start fret"
          />
        </div>
      </div>

      {/* Right column: fixed width, top-aligned with the chord diagram's nut line */}
      <div ref={rightColRef} aria-live="polite" className="w-56 shrink-0" style={{ paddingTop: `${resultsPaddingTop}px` }}>
        {allMuted ? (
          <p className="text-sm text-muted-foreground">Place dots on the chord box to identify chord names.</p>
        ) : chords.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No chords found{filterKey && filterScale ? ` in ${filterKey} ${filterScale}` : ""}.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {chords.map((chord) => (
              <div key={chord.symbol} className="flex items-baseline gap-2 py-1.5">
                <span className="font-medium text-foreground text-sm">{chordName(chord)}</span>
                <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1.5">
                  {positionLabel(chord)}
                  {chord.degreeLabel && (
                    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-mono font-medium bg-accent/10 text-accent border border-accent/20">
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
  )
}
