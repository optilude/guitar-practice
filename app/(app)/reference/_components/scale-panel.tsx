"use client"

import { useState, useMemo, useEffect } from "react"
import { getScale, listScaleTypes } from "@/lib/theory"
import { NotesViewer } from "./notes-viewer"
import { FretboardViewer } from "./fretboard-viewer"
import { getScaleBoxSystems, CAGED_BOX_LABELS } from "@/lib/rendering/fretboard"
import type { BoxSystem } from "@/lib/rendering/fretboard"
import { cn } from "@/lib/utils"
import { AddToGoalButton } from "@/components/add-to-goal-button"

const TONAL_TO_DEGREE: Record<string, string> = {
  "1P": "1",
  "2m": "b2", "2M": "2", "2A": "#2",
  "3m": "b3", "3M": "3",
  "4P": "4", "4A": "#4",
  "5d": "b5", "5P": "5", "5A": "#5",
  "6m": "b6", "6M": "6",
  "7m": "b7", "7M": "7",
}
const tonalToDegree = (interval: string) => TONAL_TO_DEGREE[interval] ?? interval

const BOX_SYSTEM_LABELS: Record<BoxSystem, string> = {
  none:       "All notes",
  caged:      "CAGED",
  "3nps":     "3NPS",
  pentatonic: "Pentatonic boxes",
  windows:    "Position windows",
}

const MAJOR_SCALE_MODES = [
  "Major", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Aeolian", "Locrian",
]
const MELODIC_MINOR_MODES = [
  "Melodic Minor", "Dorian b2", "Lydian Augmented", "Lydian Dominant",
  "Mixolydian b6", "Locrian #2", "Altered",
]
const HARMONIC_MINOR_MODES = [
  "Harmonic Minor", "Locrian #6", "Ionian #5", "Dorian #4",
  "Phrygian Dominant", "Lydian #2", "Altered Diminished",
]
const PENTATONICS = ["Pentatonic Major", "Pentatonic Minor", "Blues"]

const ALL_GROUPED = new Set([
  ...MAJOR_SCALE_MODES,
  ...MELODIC_MINOR_MODES,
  ...HARMONIC_MINOR_MODES,
  ...PENTATONICS,
])

const ROOT_NOTES = [
  "Ab", "A", "A#", "Bb", "B", "C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#",
]

const SCALE_DISPLAY_LABELS: Record<string, string> = {
  "Major":           "Ionian (major)",
  "Aeolian":         "Aeolian (natural minor)",
  "Pentatonic Major": "Major Pentatonic",
  "Pentatonic Minor": "Minor Pentatonic",
}
const scaleLabel = (t: string) => SCALE_DISPLAY_LABELS[t] ?? t

interface ScalePanelProps {
  root: string
  onRootChange: (root: string) => void
  scaleTypeTrigger?: { type: string } | null
}

export function ScalePanel({ root, onRootChange, scaleTypeTrigger }: ScalePanelProps) {
  const scaleTypes         = useMemo(() => listScaleTypes(), [])
  const majorModeTypes     = useMemo(() => MAJOR_SCALE_MODES.filter(t => scaleTypes.includes(t)),    [scaleTypes])
  const melodicMinorTypes  = useMemo(() => MELODIC_MINOR_MODES.filter(t => scaleTypes.includes(t)),  [scaleTypes])
  const harmonicMinorTypes = useMemo(() => HARMONIC_MINOR_MODES.filter(t => scaleTypes.includes(t)), [scaleTypes])
  const pentatonicTypes    = useMemo(() => PENTATONICS.filter(t => scaleTypes.includes(t)),          [scaleTypes])
  const otherTypes         = useMemo(() => scaleTypes.filter(t => !ALL_GROUPED.has(t)),              [scaleTypes])
  const [scaleType, setScaleType] = useState(scaleTypes[0] ?? "Major")

  useEffect(() => {
    if (scaleTypeTrigger && scaleTypes.includes(scaleTypeTrigger.type)) {
      setScaleType(scaleTypeTrigger.type)
      setPositionIndex(0)
      setBoxIndex(0)
    }
  }, [scaleTypeTrigger]) // eslint-disable-line react-hooks/exhaustive-deps
  const [viewMode, setViewMode]   = useState<"notes" | "fretboard">("fretboard")
  const [labelMode, setLabelMode] = useState<"note" | "interval">("note")
  const [boxSystem, setBoxSystem] = useState<BoxSystem>("none")
  const [boxIndex, setBoxIndex]   = useState(0)
  const [positionIndex, setPositionIndex] = useState(0)

  const scale = useMemo(() => getScale(root, scaleType), [root, scaleType])

  const availableBoxSystems = useMemo(() => getScaleBoxSystems(scaleType), [scaleType])

  const boxCount = useMemo(() => {
    if (boxSystem === "caged")      return CAGED_BOX_LABELS.length  // always 5
    if (boxSystem === "3nps")       return 7
    if (boxSystem === "pentatonic") return 5
    if (boxSystem === "windows")    return scale.positions.length
    return 0
  }, [boxSystem, scale.positions.length])

  const safeBoxIndex    = boxIndex < boxCount ? boxIndex : 0
  const positionCount   = scale.positions.length
  const safePositionIndex = positionIndex < positionCount ? positionIndex : 0

  return (
    <div className="space-y-4">
      {/* Root + Scale type selectors */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="scale-root-select">
            Root
          </label>
          <select
            id="scale-root-select"
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
        <label className="text-xs text-muted-foreground" htmlFor="scale-type-select">
          Scale type
        </label>
        <select
          id="scale-type-select"
          value={scaleType}
          onChange={(e) => {
            const newType = e.target.value
            setScaleType(newType)
            setPositionIndex(0)
            setBoxIndex(0)
            // Reset box system if no longer available
            const newSystems = getScaleBoxSystems(newType)
            if (!newSystems.includes(boxSystem)) setBoxSystem("none")
          }}
          className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
        >
          <optgroup label="Modes of the Major scale">
            {majorModeTypes.map((t) => (
              <option key={t} value={t}>{scaleLabel(t)}</option>
            ))}
          </optgroup>
          <optgroup label="Modes of the Melodic Minor scale">
            {melodicMinorTypes.map((t) => (
              <option key={t} value={t}>{scaleLabel(t)}</option>
            ))}
          </optgroup>
          <optgroup label="Modes of the Harmonic Minor scale">
            {harmonicMinorTypes.map((t) => (
              <option key={t} value={t}>{scaleLabel(t)}</option>
            ))}
          </optgroup>
          <optgroup label="Pentatonics">
            {pentatonicTypes.map((t) => (
              <option key={t} value={t}>{scaleLabel(t)}</option>
            ))}
          </optgroup>
          {otherTypes.length > 0 && (
            <optgroup label="Other">
              {otherTypes.map((t) => (
                <option key={t} value={t}>{scaleLabel(t)}</option>
              ))}
            </optgroup>
          )}
        </select>
        </div>
        <div className="flex items-center h-[34px] lg:h-auto">
          <AddToGoalButton
            kind="scale"
            subtype={scaleType}
            defaultKey={root}
            displayName={`${root} ${scaleType} scale`}
          />
        </div>
      </div>

      {/* Notes + formula */}
      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>Notes: {scale.notes.join(" – ")}</p>
        <p>Formula: {scale.intervals.map(tonalToDegree).join(" – ")}</p>
      </div>

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
          onClick={() => setViewMode("notes")}
          className={cn(
            "px-3 py-1.5 transition-colors border-l border-border",
            viewMode === "notes"
              ? "bg-accent text-accent-foreground"
              : "bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          Notes
        </button>
      </div>

      {/* Position selector — shown only in notes view */}
      {viewMode === "notes" && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="scale-position-select">
            Position
          </label>
          <select
            id="scale-position-select"
            value={safePositionIndex}
            onChange={(e) => setPositionIndex(Number(e.target.value))}
            className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
          >
            {Array.from({ length: positionCount }, (_, i) => (
              <option key={i} value={i}>
                {scale.positions[i]?.label ?? `Position ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Fretboard controls — shown only in fretboard view */}
      {viewMode === "fretboard" && (
        <div className="flex flex-wrap gap-3 items-end">
          {availableBoxSystems.length > 1 && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground" htmlFor="box-system-select">
                  Highlight
                </label>
                <select
                  id="box-system-select"
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
                  <label className="text-xs text-muted-foreground" htmlFor="box-index-select">
                    Box
                  </label>
                  <select
                    id="box-index-select"
                    value={safeBoxIndex}
                    onChange={(e) => setBoxIndex(Number(e.target.value))}
                    className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    {Array.from({ length: boxCount }, (_, i) => (
                      <option key={i} value={i}>
                        {boxSystem === "caged"
                          ? `${CAGED_BOX_LABELS[i]} shape`
                          : boxSystem === "windows"
                          ? (scale.positions[i]?.label ?? `Position ${i + 1}`)
                          : `Position ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="scale-show-select">
              Show
            </label>
            <select
              id="scale-show-select"
              value={labelMode}
              onChange={(e) => setLabelMode(e.target.value as "note" | "interval")}
              className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="note">Notes</option>
              <option value="interval">Intervals</option>
            </select>
          </div>
        </div>
      )}

      {/* Viewer */}
      {viewMode === "notes" ? (
        <NotesViewer scale={scale} positionIndex={safePositionIndex} />
      ) : (
        <FretboardViewer
          scale={scale}
          boxSystem={boxSystem}
          boxIndex={safeBoxIndex}
          labelMode={labelMode}
        />
      )}
    </div>
  )
}
