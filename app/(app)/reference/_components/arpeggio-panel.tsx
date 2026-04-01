"use client"

import { useState, useMemo } from "react"
import { getArpeggio, listChordTypes } from "@/lib/theory"
import { TabViewer } from "./tab-viewer"
import { FretboardViewer } from "./fretboard-viewer"
import {
  getArpeggioBoxSystems,
  CHORD_TYPE_TO_SCALE,
  CAGED_BOX_LABELS,
} from "@/lib/rendering/fretboard"
import type { BoxSystem } from "@/lib/rendering/fretboard"
import { cn } from "@/lib/utils"

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

interface ArpeggioPanelProps {
  tonic: string
}

export function ArpeggioPanel({ tonic }: ArpeggioPanelProps) {
  const chordTypes = useMemo(() => listChordTypes(), [])
  const [chordType, setChordType] = useState(chordTypes[0] ?? "maj7")
  const [viewMode, setViewMode]   = useState<"tab" | "fretboard">("fretboard")
  const [labelMode, setLabelMode] = useState<"note" | "interval">("interval")
  const [boxSystem, setBoxSystem] = useState<BoxSystem>("none")
  const [boxIndex, setBoxIndex]   = useState(0)
  const [positionIndex, setPositionIndex] = useState(0)

  const arpeggio = useMemo(() => getArpeggio(tonic, chordType), [tonic, chordType])

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
      {/* Chord type selector */}
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
          className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {chordTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* View mode toggle + label mode */}
      <div className="flex items-center gap-4">
        <div className="flex rounded border border-border overflow-hidden text-sm">
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
            onClick={() => setViewMode("tab")}
            className={cn(
              "px-3 py-1.5 transition-colors border-l border-border",
              viewMode === "tab"
                ? "bg-accent text-accent-foreground"
                : "bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            Tab
          </button>
        </div>

        {viewMode === "fretboard" && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={labelMode === "interval"}
              onChange={(e) => setLabelMode(e.target.checked ? "interval" : "note")}
              className="accent-accent"
            />
            Show intervals
          </label>
        )}
      </div>

      {/* Tab position selector — shown only in tab view */}
      {viewMode === "tab" && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="arpeggio-position-select">
            Position
          </label>
          <select
            id="arpeggio-position-select"
            value={safePositionIndex}
            onChange={(e) => setPositionIndex(Number(e.target.value))}
            className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {Array.from({ length: positionCount }, (_, i) => (
              <option key={i} value={i}>
                {arpeggio.positions[i]?.label ?? `Position ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Fretboard box controls */}
      {viewMode === "fretboard" && availableBoxSystems.length > 1 && (
        <div className="flex flex-wrap gap-3 items-end">
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
        </div>
      )}

      {/* Viewer */}
      {viewMode === "tab" ? (
        <TabViewer scale={arpeggio} positionIndex={safePositionIndex} />
      ) : (
        <FretboardViewer
          scale={arpeggio}
          boxSystem={boxSystem}
          boxIndex={safeBoxIndex}
          labelMode={labelMode}
          boxScaleType={parentScaleType}
        />
      )}

      {/* Notes + formula */}
      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>Notes: {arpeggio.notes.join(" – ")}</p>
        <p>Formula: {arpeggio.intervals.map(tonalToDegree).join(" – ")}</p>
      </div>
    </div>
  )
}
