"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Note } from "tonal"
import { buildChromaMap } from "@/lib/theory/chord-finder"
import { getScale } from "@/lib/theory/scales"
import { detectScales } from "@/lib/theory/scale-finder"
import type { ScaleMatch } from "@/lib/theory/scale-finder"
import { InteractiveFretboard } from "./interactive-fretboard"
import { btn } from "@/lib/button-styles"

const ROOT_NOTES = ["Ab", "A", "Bb", "B", "C", "Db", "D", "Eb", "E", "F", "Gb", "G"] as const

export function ScaleFinderClient() {
  const [selectedChromas, setSelectedChromas] = useState<Set<number>>(new Set())
  const [filterKey, setFilterKey] = useState("")
  const [labelMode, setLabelMode] = useState<"notes" | "intervals">("notes")
  const [previewedScale, setPreviewedScale] = useState<ScaleMatch | null>(null)

  // Enharmonic-aware note names for the selected key (uses Major scale convention for spelling)
  const scaleNotes = useMemo(() => {
    if (!filterKey) return null
    try {
      return getScale(filterKey, "Major").notes
    } catch {
      return null
    }
  }, [filterKey])

  const chromaToNote = useMemo(() => buildChromaMap(scaleNotes), [scaleNotes])

  const keyChroma = useMemo(
    () => (filterKey ? (Note.chroma(filterKey) ?? null) : null),
    [filterKey],
  )

  const results = useMemo(
    () => detectScales(selectedChromas, { key: filterKey || undefined }),
    [selectedChromas, filterKey],
  )

  const handleChromaToggle = useCallback((chroma: number) => {
    setSelectedChromas((prev) => {
      const next = new Set(prev)
      if (next.has(chroma)) {
        next.delete(chroma)
      } else {
        next.add(chroma)
      }
      return next
    })
  }, [])

  // Clear preview when selection drops below 3 notes (no valid results to preview)
  useEffect(() => {
    if (selectedChromas.size < 3) setPreviewedScale(null)
  }, [selectedChromas.size])

  function handleScaleRowClick(scale: ScaleMatch) {
    setPreviewedScale((prev) =>
      prev?.displayName === scale.displayName ? null : scale,
    )
  }

  function handleClear() {
    setSelectedChromas(new Set())
    setPreviewedScale(null)
  }

  function handleKeyChange(key: string) {
    setFilterKey(key)
    setPreviewedScale(null)
    if (!key) setLabelMode("notes")
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Controls row: key centre + notes/intervals toggle */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="sf-key-select">
            Key centre
          </label>
          <select
            id="sf-key-select"
            value={filterKey}
            onChange={(e) => handleKeyChange(e.target.value)}
            className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
          >
            <option value="">Any</option>
            {ROOT_NOTES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {filterKey && (
          <div className="flex rounded border border-border overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setLabelMode("notes")}
              className={`px-3 py-1.5 transition-colors ${
                labelMode === "notes"
                  ? "bg-accent text-accent-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              Notes
            </button>
            <button
              type="button"
              onClick={() => setLabelMode("intervals")}
              className={`px-3 py-1.5 transition-colors border-l border-border ${
                labelMode === "intervals"
                  ? "bg-accent text-accent-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              Intervals
            </button>
          </div>
        )}
      </div>

      {/* Fretboard */}
      <InteractiveFretboard
        selectedChromas={selectedChromas}
        previewedScale={previewedScale}
        keyChroma={keyChroma}
        labelMode={labelMode}
        chromaToNote={chromaToNote}
        onChromaToggle={handleChromaToggle}
      />

      {/* Clear button */}
      <div>
        <button type="button" onClick={handleClear} className={btn("destructive", "sm")}>
          Clear
        </button>
      </div>

      {/* Results */}
      <div aria-live="polite">
        {selectedChromas.size < 3 ? (
          <p className="text-sm text-muted-foreground">
            Select at least 3 notes to identify scales.
          </p>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matching scales found.</p>
        ) : (
          <div className="divide-y divide-border">
            {results.map((scale) => {
              const isActive = previewedScale?.displayName === scale.displayName
              return (
                <button
                  key={scale.displayName}
                  type="button"
                  onClick={() => handleScaleRowClick(scale)}
                  className={`w-full text-left px-3 py-2 transition-colors rounded ${
                    isActive
                      ? "bg-accent/10 border border-accent/20"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="text-sm font-medium text-foreground">{scale.displayName}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {scale.notes.join("  ")}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {scale.intervals.join("  ")}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
