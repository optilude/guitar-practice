"use client"

import { useState, useMemo } from "react"
import { getScale, listScaleTypes } from "@/lib/theory"
import { TabViewer } from "./tab-viewer"
import { FretboardViewer } from "./fretboard-viewer"
import { getScaleBoxSystems } from "@/lib/rendering/fretboard"
import type { BoxSystem } from "@/lib/rendering/fretboard"
import SCALE_PATTERNS from "@/lib/theory/data/scale-patterns"
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

interface ScalePanelProps {
  tonic: string
}

export function ScalePanel({ tonic }: ScalePanelProps) {
  const scaleTypes = useMemo(() => listScaleTypes(), [])
  const [scaleType, setScaleType] = useState(scaleTypes[0] ?? "Major")
  const [viewMode, setViewMode]   = useState<"tab" | "fretboard">("fretboard")
  const [labelMode, setLabelMode] = useState<"note" | "interval">("interval")
  const [boxSystem, setBoxSystem] = useState<BoxSystem>("none")
  const [boxIndex, setBoxIndex]   = useState(0)
  // Tab view position selector (unchanged from original)
  const [positionIndex, setPositionIndex] = useState(0)

  const scale = useMemo(() => getScale(tonic, scaleType), [tonic, scaleType])

  const availableBoxSystems = useMemo(() => getScaleBoxSystems(scaleType), [scaleType])

  const boxCount = useMemo(() => {
    if (boxSystem === "caged")      return SCALE_PATTERNS[scaleType]?.length ?? 0
    if (boxSystem === "3nps")       return 7
    if (boxSystem === "pentatonic") return 5
    return 0
  }, [boxSystem, scaleType])

  const safeBoxIndex    = boxIndex < boxCount ? boxIndex : 0
  const positionCount   = scale.positions.length
  const safePositionIndex = positionIndex < positionCount ? positionIndex : 0

  return (
    <div className="space-y-4">
      {/* Scale type selector */}
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
          className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {scaleTypes.map((t) => (
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
          <label className="text-xs text-muted-foreground" htmlFor="scale-position-select">
            Position
          </label>
          <select
            id="scale-position-select"
            value={safePositionIndex}
            onChange={(e) => setPositionIndex(Number(e.target.value))}
            className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {Array.from({ length: positionCount }, (_, i) => (
              <option key={i} value={i}>
                {scale.positions[i]?.label ?? `Position ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Fretboard box controls — shown only in fretboard view */}
      {viewMode === "fretboard" && availableBoxSystems.length > 1 && (
        <div className="flex flex-wrap gap-3 items-end">
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
                      ? (SCALE_PATTERNS[scaleType]?.[i]?.label ?? `Position ${i + 1}`)
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
        <TabViewer scale={scale} positionIndex={safePositionIndex} />
      ) : (
        <FretboardViewer
          scale={scale}
          boxSystem={boxSystem}
          boxIndex={safeBoxIndex}
          labelMode={labelMode}
        />
      )}

      {/* Notes + formula */}
      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>Notes: {scale.notes.join(" – ")}</p>
        <p>Formula: {scale.intervals.map(tonalToDegree).join(" – ")}</p>
      </div>
    </div>
  )
}
