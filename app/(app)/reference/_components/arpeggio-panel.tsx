"use client"

import { useState, useMemo, useEffect } from "react"
import { getArpeggio, listChordTypes } from "@/lib/theory"
import { NotesViewer } from "./notes-viewer"
import { FretboardViewer } from "./fretboard-viewer"
import {
  getArpeggioBoxSystems,
  CHORD_TYPE_TO_SCALE,
  CAGED_BOX_LABELS,
} from "@/lib/rendering/fretboard"
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

// Tonal.js equivalents of the chord panel's COMMON_TYPES, in the same order
const ARPEGGIO_COMMON_TYPES = ["maj", "maj7", "m", "m7", "7", "9", "dim", "dim7", "m7b5"]

// Display labels to align with chord panel naming
const CHORD_TYPE_DISPLAY: Record<string, string> = { maj: "major", m: "minor" }
const displayLabel = (t: string) => CHORD_TYPE_DISPLAY[t] ?? t

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

interface ArpeggioPanelProps {
  root: string
  onRootChange: (root: string) => void
  chordTypeTrigger?: { type: string } | null
}

export function ArpeggioPanel({ root, onRootChange, chordTypeTrigger }: ArpeggioPanelProps) {
  const chordTypes   = useMemo(() => listChordTypes(), [])
  const commonTypes  = useMemo(() => ARPEGGIO_COMMON_TYPES.filter(t => chordTypes.includes(t)), [chordTypes])
  const otherTypes   = useMemo(() => chordTypes.filter(t => !ARPEGGIO_COMMON_TYPES.includes(t)), [chordTypes])
  const [chordType, setChordType] = useState(chordTypes[0] ?? "maj7")

  useEffect(() => {
    if (chordTypeTrigger && chordTypes.includes(chordTypeTrigger.type)) {
      setChordType(chordTypeTrigger.type)
      setPositionIndex(0)
      setBoxIndex(0)
    }
  }, [chordTypeTrigger]) // eslint-disable-line react-hooks/exhaustive-deps
  const [viewMode, setViewMode]   = useState<"notes" | "fretboard">("fretboard")
  const [labelMode, setLabelMode] = useState<"note" | "interval">("interval")
  const [boxSystem, setBoxSystem] = useState<BoxSystem>("none")
  const [boxIndex, setBoxIndex]   = useState(0)
  const [positionIndex, setPositionIndex] = useState(0)

  const arpeggio = useMemo(() => getArpeggio(root, chordType), [root, chordType])

  const parentScaleType     = CHORD_TYPE_TO_SCALE[chordType]
  const availableBoxSystems = useMemo(() => getArpeggioBoxSystems(chordType), [chordType])

  const boxCount = useMemo(() => {
    if (boxSystem === "caged")   return CAGED_BOX_LABELS.length  // always 5
    if (boxSystem === "3nps")    return 7
    if (boxSystem === "windows") return arpeggio.positions.length
    return 0
  }, [boxSystem, arpeggio.positions.length])

  const safeBoxIndex      = boxIndex < boxCount ? boxIndex : 0
  const positionCount     = arpeggio.positions.length
  const safePositionIndex = positionIndex < positionCount ? positionIndex : 0

  return (
    <div className="space-y-4">
      {/* Root + Chord type selectors */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="arpeggio-root-select">
            Root
          </label>
          <select
            id="arpeggio-root-select"
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
          <label className="text-xs text-muted-foreground" htmlFor="arpeggio-type-select">
            Chord type
          </label>
          <select
            id="arpeggio-type-select"
            value={chordType}
            onChange={(e) => {
              const newType = e.target.value
              setChordType(newType)
              setPositionIndex(0)
              setBoxIndex(0)
              const newSystems = getArpeggioBoxSystems(newType)
              if (!newSystems.includes(boxSystem)) setBoxSystem("none")
            }}
            className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
          >
            <optgroup label="Common">
              {commonTypes.map((t) => (
                <option key={t} value={t}>{displayLabel(t)}</option>
              ))}
            </optgroup>
            <optgroup label="Other">
              {otherTypes.map((t) => (
                <option key={t} value={t}>{displayLabel(t)}</option>
              ))}
            </optgroup>
          </select>
          <AddToGoalButton
            kind="arpeggio"
            subtype={chordType}
            defaultKey={root}
            displayName={`${root} ${chordType} arpeggio`}
          />
        </div>
      </div>

      {/* Notes + formula */}
      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>Notes: {arpeggio.notes.join(" – ")}</p>
        <p>Formula: {arpeggio.intervals.map(tonalToDegree).join(" – ")}</p>
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
          <label className="text-xs text-muted-foreground" htmlFor="arpeggio-position-select">
            Position
          </label>
          <select
            id="arpeggio-position-select"
            value={safePositionIndex}
            onChange={(e) => setPositionIndex(Number(e.target.value))}
            className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
          >
            {Array.from({ length: positionCount }, (_, i) => (
              <option key={i} value={i}>
                {arpeggio.positions[i]?.label ?? `Position ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Fretboard controls — shown only in fretboard view */}
      {viewMode === "fretboard" && (
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-wrap gap-3 items-end">
            {availableBoxSystems.length > 1 && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground" htmlFor="arp-box-system-select">
                    Highlight
                  </label>
                  <select
                    id="arp-box-system-select"
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
                    <label className="text-xs text-muted-foreground" htmlFor="arp-box-index-select">
                      Box
                    </label>
                    <select
                      id="arp-box-index-select"
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
      )}

      {/* Viewer */}
      {viewMode === "notes" ? (
        <NotesViewer scale={arpeggio} positionIndex={safePositionIndex} />
      ) : (
        <FretboardViewer
          scale={arpeggio}
          boxSystem={boxSystem}
          boxIndex={safeBoxIndex}
          labelMode={labelMode}
          boxScaleType={parentScaleType}
        />
      )}
    </div>
  )
}
