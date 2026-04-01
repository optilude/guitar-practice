"use client"

import { useState, useMemo } from "react"
import { getScale, listScaleTypes } from "@/lib/theory"
import { TabViewer } from "./tab-viewer"
import { FretboardViewer } from "./fretboard-viewer"
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

interface ScalePanelProps {
  tonic: string
}

export function ScalePanel({ tonic }: ScalePanelProps) {
  const scaleTypes = useMemo(() => listScaleTypes(), [])
  const [scaleType, setScaleType] = useState(scaleTypes[0] ?? "Major")
  const [positionIndex, setPositionIndex] = useState(0)
  const [viewMode, setViewMode] = useState<"tab" | "fretboard">("tab")
  const [labelMode, setLabelMode] = useState<"note" | "interval">("interval")

  const scale = useMemo(
    () => getScale(tonic, scaleType),
    [tonic, scaleType]
  )

  const positionCount = scale.positions.length
  const positionOptions = Array.from({ length: positionCount }, (_, i) => i)

  // Reset position when scale changes and current index is out of range
  const safePositionIndex = positionIndex < positionCount ? positionIndex : 0

  return (
    <div className="space-y-4">
      {/* Selectors row */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="scale-type-select">
            Scale type
          </label>
          <select
            id="scale-type-select"
            value={scaleType}
            onChange={(e) => {
              setScaleType(e.target.value)
              setPositionIndex(0)
            }}
            className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {scaleTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="scale-position-select">
            Position
          </label>
          <select
            id="scale-position-select"
            value={safePositionIndex}
            onChange={(e) => setPositionIndex(Number(e.target.value))}
            className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {positionOptions.map((i) => (
              <option key={i} value={i}>
                {scale.positions[i]?.label ?? `Position ${i + 1}`}
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
        <TabViewer scale={scale} positionIndex={safePositionIndex} />
      ) : (
        <FretboardViewer
          scale={scale}
          positionIndex={safePositionIndex}
          labelMode={labelMode}
        />
      )}

      {/* Notes + formula display */}
      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>Notes: {scale.notes.join(" – ")}</p>
        <p>Formula: {scale.intervals.map(tonalToDegree).join(" – ")}</p>
      </div>
    </div>
  )
}
