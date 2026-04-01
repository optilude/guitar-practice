"use client"

import { useState, useMemo } from "react"
import { getArpeggio, listChordTypes } from "@/lib/theory"
import { TabViewer } from "./tab-viewer"
import { FretboardViewer } from "./fretboard-viewer"
import { cn } from "@/lib/utils"

interface ArpeggioPanelProps {
  tonic: string
}

export function ArpeggioPanel({ tonic }: ArpeggioPanelProps) {
  const chordTypes = useMemo(() => listChordTypes(), [])
  const [chordType, setChordType] = useState(chordTypes[0] ?? "maj7")
  const [positionIndex, setPositionIndex] = useState(0)
  const [viewMode, setViewMode] = useState<"tab" | "fretboard">("tab")
  const [labelMode, setLabelMode] = useState<"note" | "interval">("interval")

  const arpeggio = useMemo(
    () => getArpeggio(tonic, chordType),
    [tonic, chordType]
  )

  const positionCount = arpeggio.positions.length
  const positionOptions = Array.from({ length: positionCount }, (_, i) => i)
  const safePositionIndex = positionIndex < positionCount ? positionIndex : 0

  return (
    <div className="space-y-4">
      {/* Selectors row */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="arpeggio-type-select">
            Chord type
          </label>
          <select
            id="arpeggio-type-select"
            value={chordType}
            onChange={(e) => {
              setChordType(e.target.value)
              setPositionIndex(0)
            }}
            className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {chordTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

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
            {positionOptions.map((i) => (
              <option key={i} value={i}>
                {arpeggio.positions[i]?.label ?? `Position ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
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

      {/* Viewer */}
      {viewMode === "tab" ? (
        <TabViewer scale={arpeggio} positionIndex={safePositionIndex} />
      ) : (
        <FretboardViewer
          scale={arpeggio}
          positionIndex={safePositionIndex}
          labelMode={labelMode}
        />
      )}

      {/* Notes display */}
      <p className="text-xs text-muted-foreground">
        Notes: {arpeggio.notes.join(" – ")}
      </p>
    </div>
  )
}
