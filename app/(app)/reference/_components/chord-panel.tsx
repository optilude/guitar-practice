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

const GUITAR_INSTRUMENT = {
  strings: 6,
  fretsOnChord: 4,
  name: "guitar",
  keys: [] as string[],
  tunings: {
    standard: ["E", "A", "D", "G", "B", "E"],
  },
}

const COMMON_TYPES = ["major", "maj7", "minor", "m7", "7", "9", "dim", "dim7", "m7b5"]

const INTERVAL_TO_DEGREE: Record<string, string> = {
  "1P": "1",
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

interface ChordPanelProps {
  root: string
  onRootChange: (root: string) => void
  chordTypeTrigger?: { type: string } | null
}

export function ChordPanel({ root, onRootChange, chordTypeTrigger }: ChordPanelProps) {
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
  const [viewMode, setViewMode]   = useState<"fretboard" | "fingerings">("fretboard")
  const [labelMode, setLabelMode] = useState<"note" | "interval">("interval")
  const [boxSystem, setBoxSystem] = useState<BoxSystem>("none")
  const [boxIndex, setBoxIndex]   = useState(0)

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
    if (boxSystem === "caged")   return CAGED_BOX_LABELS.length  // 5
    if (boxSystem === "3nps")    return 7
    if (boxSystem === "windows") return chordScale.positions.length
    return 0
  }, [boxSystem, chordScale.positions.length])
  const safeBoxIndex = boxIndex < boxCount ? boxIndex : 0

  const isShell = (SHELL_CHORD_TYPES as readonly string[]).includes(chordType)

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
          <AddToGoalButton
            kind="chord"
            subtype={chordType}
            defaultKey={root}
            displayName={`${root}${chordType} chord`}
          />
        </div>
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
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-6">
            {positions.map((pos, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="dark:invert">
                  <Chord chord={pos} instrument={GUITAR_INSTRUMENT} lite={false} />
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
