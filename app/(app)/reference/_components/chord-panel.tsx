"use client"

import { useState, useMemo, useEffect } from "react"
import {
  getChord, listChordDbSuffixes, getChordPositions,
  SHELL_CHORD_TYPES, getShellChordPositions,
  getChordAsScale,
} from "@/lib/theory"
import { Note } from "tonal"
import { type Chord as SVGChord, OPEN, SILENT, type Finger, type FingerOptions, type Barre } from "svguitar"
import { INTERVAL_DEGREE_COLORS } from "@/lib/rendering/tab"
import { ChordDiagram } from "./chord-diagram"
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
import type { ChordPosition } from "@/lib/theory/chords"

// ---------------------------------------------------------------------------
// SVGuitar conversion helpers
// ---------------------------------------------------------------------------

// Open-string chroma values (C=0 … B=11), index 0 = str6 (low E), index 5 = str1 (high e)
const OPEN_CHROMA = [4, 9, 2, 7, 11, 4] as const

const ROOT_COLOR = "#d97706" // amber-600

// Maps shell chord display types → base Tonal symbol for note/interval lookup
const SHELL_TONAL_TYPE: Record<string, string> = {
  "maj7 shell": "maj7",
  "m7 shell":   "m7",
  "7 shell":    "7",
  "maj6 shell": "6",
  "dim7/m6 shell": "m6",
}

type ShowMode = "fingers" | "notes" | "intervals"

function degreeToColor(degree: string): string {
  if (degree === "R" || degree === "1") return ROOT_COLOR
  if (degree === "3"  || degree === "b3" || degree === "#3")  return INTERVAL_DEGREE_COLORS.third
  if (degree === "5"  || degree === "b5" || degree === "#5")  return INTERVAL_DEGREE_COLORS.fifth
  if (degree === "7"  || degree === "b7")                     return INTERVAL_DEGREE_COLORS.seventh
  if (degree === "6"  || degree === "b6")                     return INTERVAL_DEGREE_COLORS.sixth
  if (degree === "9"  || degree === "b9" || degree === "#9")  return INTERVAL_DEGREE_COLORS.second
  if (degree === "11" || degree === "#11")                    return INTERVAL_DEGREE_COLORS.fourth
  if (degree === "13" || degree === "b13")                    return INTERVAL_DEGREE_COLORS.sixth
  return ROOT_COLOR
}

function toSVGChord(
  pos: ChordPosition,
  showMode: ShowMode,
  isDark: boolean,
  chordNotes: string[],
  chordIntervals: string[],
): SVGChord {
  const chordChromas = chordNotes.map((n) => Note.get(n).chroma ?? -1)
  const fingers: Finger[] = []

  pos.frets.forEach((relativeFret, idx) => {
    const str = 6 - idx

    if (relativeFret === -1) {
      fingers.push([str, SILENT])
      return
    }

    const absFret = relativeFret === 0 ? 0 : relativeFret + pos.baseFret - 1
    const chroma  = (OPEN_CHROMA[idx] + absFret) % 12
    const matchIdx = chordChromas.indexOf(chroma)

    let options: FingerOptions | undefined
    if (matchIdx >= 0) {
      const iv      = chordIntervals[matchIdx]
      const degree  = INTERVAL_TO_DEGREE[iv] ?? iv
      const color   = degreeToColor(degree)
      const text    = showMode === "notes"     ? chordNotes[matchIdx]
                    : showMode === "intervals" ? degree
                    : undefined
      const textColor = relativeFret === 0 ? (isDark ? "#f9fafb" : "#1f2937") : "#ffffff"
      // Open strings render as a hollow ring (stroke-only); set strokeColor so the
      // ring picks up the interval colour in Notes/Intervals mode.
      options = relativeFret === 0
        ? { color, strokeColor: color, textColor, text }
        : { color, textColor, text }
    }

    if (relativeFret === 0) fingers.push([str, OPEN, options])
    else                    fingers.push([str, relativeFret, options])
  })

  // Barre arcs
  const svgBarres: Barre[] = []
  for (const barreFret of pos.barres) {
    const participatingIdxs = pos.frets
      .map((f, i) => ({ f, i }))
      .filter(({ f }) => f === barreFret)
      .map(({ i }) => i)
    if (participatingIdxs.length > 1) {
      const minIdx = Math.min(...participatingIdxs)
      const maxIdx = Math.max(...participatingIdxs)
      svgBarres.push({ fret: barreFret, fromString: 6 - maxIdx, toString: 6 - minIdx })
    }
  }

  return {
    fingers,
    barres: svgBarres,
    position: pos.baseFret > 1 ? pos.baseFret : undefined,
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COMMON_TYPES = ["major", "maj7", "minor", "m7", "7", "9", "dim", "dim7", "m7b5"]

const INTERVAL_TO_DEGREE: Record<string, string> = {
  "1P": "R",
  "2m": "b9", "2M": "9",  "2A": "#9",
  "3m": "b3", "3M": "3",
  "4P": "4",  "4A": "#4",
  "5d": "b5", "5P": "5",  "5A": "#5",
  "6m": "b6", "6M": "6",
  "7m": "b7", "7M": "7",
  "8P": "8",
  "9m": "b9", "9M": "9",  "9A": "#9",
  "11P": "11", "11A": "#11",
  "13m": "b13", "13M": "13",
}

function intervalsToFormula(intervals: string[]): string {
  return intervals.map((iv) => INTERVAL_TO_DEGREE[iv] ?? iv).join(" – ")
}

const SHELL_FORMULA: Record<string, string> = {
  "maj7 shell":    "1 – 3 – 7",
  "m7 shell":      "1 – b3 – b7",
  "7 shell":       "1 – 3 – b7",
  "maj6 shell":    "1 – 3 – 6",
  "dim7/m6 shell": "1 – b3 – 6",
}

const ROOT_NOTES = [
  "Ab", "A", "A#", "Bb", "B", "C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#",
]

const BOX_SYSTEM_LABELS: Record<BoxSystem, string> = {
  none:       "All notes",
  caged:      "CAGED",
  "3nps":     "3NPS",
  pentatonic: "Pentatonic boxes",
  windows:    "Position windows",
}

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ChordPanelProps {
  root: string
  onRootChange: (root: string) => void
  chordTypeTrigger?: { type: string } | null
  onScaleSelect?: (tonic: string, scaleName: string) => void
}

export function ChordPanel({ root, onRootChange, chordTypeTrigger, onScaleSelect }: ChordPanelProps) {
  const dbSuffixes = useMemo(() => listChordDbSuffixes(), [])
  const commonSuffixes = useMemo(
    () => COMMON_TYPES.filter((t) => dbSuffixes.includes(t)),
    [dbSuffixes],
  )
  const otherSuffixes = useMemo(
    () => dbSuffixes.filter((t) => !COMMON_TYPES.includes(t)),
    [dbSuffixes],
  )
  const [chordType, setChordType] = useState(COMMON_TYPES[0])

  useEffect(() => {
    if (chordTypeTrigger) setChordType(chordTypeTrigger.type)
  }, [chordTypeTrigger]) // eslint-disable-line react-hooks/exhaustive-deps

  const [viewMode, setViewMode]
     = useState<"fretboard" | "fingerings" | "soloing">("fretboard")
  const [soloingMode, setSoloingMode] = useState(() => defaultModeForChordType(COMMON_TYPES[0]))

  useEffect(() => {
    setSoloingMode(defaultModeForChordType(chordType))
  }, [chordType]) // eslint-disable-line react-hooks/exhaustive-deps

  const [labelMode, setLabelMode] = useState<"note" | "interval">("interval")
  const [boxSystem, setBoxSystem] = useState<BoxSystem>("none")
  const [boxIndex, setBoxIndex]   = useState(0)
  const [showMode, setShowMode]   = useState<ShowMode>("fingers")
  const [isDark, setIsDark]       = useState(false)

  // Track dark-mode class on <html> so diagrams re-render when theme changes.
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"))
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  const chordScale = useMemo(
    () => getChordAsScale(root, chordType),
    [root, chordType]
  )
  const availableBoxSystems = useMemo(
    () => getArpeggioBoxSystems(chordScale.type),
    [chordScale.type]
  )
  const parentScaleType = CHORD_TYPE_TO_SCALE[chordScale.type]
  const boxCount = useMemo(() => {
    if (boxSystem === "caged")   return CAGED_BOX_LABELS.length
    if (boxSystem === "3nps")    return 7
    if (boxSystem === "windows") return chordScale.positions.length
    return 0
  }, [boxSystem, chordScale.positions.length])
  const safeBoxIndex = boxIndex < boxCount ? boxIndex : 0

  const isShell = (SHELL_CHORD_TYPES as readonly string[]).includes(chordType)

  const soloScales = useMemo(
    () => getSoloScales({ tonic: root, type: chordType, degree: 1 }, soloingMode),
    [root, chordType, soloingMode]
  )

  const chord = useMemo(
    () => isShell ? null : getChord(root, chordType),
    [root, chordType, isShell]
  )
  const positions = useMemo(
    () => isShell
      ? getShellChordPositions(root, chordType)
      : getChordPositions(root, chordType),
    [root, chordType, isShell]
  )

  // Chord tones for the Show dropdown (Notes/Intervals modes).
  // For shell types: look up the base chord via SHELL_TONAL_TYPE to get notes/intervals.
  const { chordNotes, chordIntervals } = useMemo(() => {
    if (isShell) {
      const baseType = SHELL_TONAL_TYPE[chordType]
      if (!baseType) return { chordNotes: [], chordIntervals: [] }
      const info = getChord(root, baseType)
      return { chordNotes: info.notes, chordIntervals: info.intervals }
    }
    return { chordNotes: chord?.notes ?? [], chordIntervals: chord?.intervals ?? [] }
  }, [root, chordType, isShell, chord])

  return (
    <div className="space-y-4">
      {/* Root + Chord type selectors */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="chord-root-select">
            Root
          </label>
          <select
            id="chord-root-select"
            aria-label="Root"
            value={root}
            onChange={(e) => onRootChange(e.target.value)}
            className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
          >
            {ROOT_NOTES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="chord-type-select">
            Chord type
          </label>
          <select
            id="chord-type-select"
            value={chordType}
            onChange={(e) => {
              const newType = e.target.value
              setChordType(newType)
              setBoxIndex(0)
              const newScale = getChordAsScale(root, newType)
              const newSystems = getArpeggioBoxSystems(newScale.type)
              if (!newSystems.includes(boxSystem)) setBoxSystem("none")
            }}
            className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
          >
            <optgroup label="Common">
              {commonSuffixes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </optgroup>
            <optgroup label="Shell Voicings">
              {SHELL_CHORD_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </optgroup>
            <optgroup label="Other">
              {otherSuffixes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </optgroup>
          </select>
        </div>
        <AddToGoalButton
          kind="chord"
          subtype={chordType}
          defaultKey={root}
          displayName={`${root}${chordType} chord`}
        />
      </div>

      {/* Notes + formula */}
      {isShell ? (
        <p className="text-xs text-muted-foreground">
          Formula: {SHELL_FORMULA[chordType]}
        </p>
      ) : (
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground">
            Notes: {chord?.notes.join(" – ")}
          </p>
          <p className="text-xs text-muted-foreground">
            Formula: {chord ? intervalsToFormula(chord.intervals) : ""}
          </p>
        </div>
      )}

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

      {/* Fretboard controls + viewer */}
      {viewMode === "fretboard" && (
        <>
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-wrap gap-3 items-end">
              {availableBoxSystems.length > 1 && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground" htmlFor="chord-box-system-select">
                      Highlight
                    </label>
                    <select
                      id="chord-box-system-select"
                      value={boxSystem}
                      onChange={(e) => {
                        setBoxSystem(e.target.value as BoxSystem)
                        setBoxIndex(0)
                      }}
                      className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      {availableBoxSystems.map((s) => (
                        <option key={s} value={s}>{BOX_SYSTEM_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>

                  {boxSystem !== "none" && boxCount > 0 && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground" htmlFor="chord-box-index-select">
                        Box
                      </label>
                      <select
                        id="chord-box-index-select"
                        value={safeBoxIndex}
                        onChange={(e) => setBoxIndex(Number(e.target.value))}
                        className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        {Array.from({ length: boxCount }, (_, i) => (
                          <option key={i} value={i}>
                            {boxSystem === "caged"
                              ? `${CAGED_BOX_LABELS[i]} shape`
                              : `Position ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={labelMode === "interval"}
                onChange={(e) => setLabelMode(e.target.checked ? "interval" : "note")}
                className="accent-accent"
              />
              Show intervals
            </label>
          </div>

          <FretboardViewer
            scale={chordScale}
            boxSystem={boxSystem}
            boxIndex={safeBoxIndex}
            labelMode={labelMode}
            boxScaleType={parentScaleType}
          />
        </>
      )}

      {/* Fingerings */}
      {viewMode === "fingerings" && (
        positions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No voicings available for this chord type.</p>
        ) : (
          <>
            {/* Show dropdown */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="chord-show-select">
                Show
              </label>
              <select
                id="chord-show-select"
                value={showMode}
                onChange={(e) => setShowMode(e.target.value as ShowMode)}
                className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
              >
                <option value="fingers">Fingers</option>
                <option value="notes">Notes</option>
                <option value="intervals">Intervals</option>
              </select>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-6">
              {positions.map((pos, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground text-center">{pos.label}</span>
                  <ChordDiagram
                    numFrets={4}
                    chord={toSVGChord(pos, showMode, isDark, chordNotes, chordIntervals)}
                  />
                </div>
              ))}
            </div>
          </>
        )
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
