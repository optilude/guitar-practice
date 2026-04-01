"use client"

import { useEffect, useRef } from "react"
import { renderFretboard } from "@/lib/rendering/fretboard"
import type { BoxSystem } from "@/lib/rendering/fretboard"
import type { GuitarScale } from "@/lib/theory/types"

interface FretboardViewerProps {
  scale: GuitarScale
  boxSystem: BoxSystem
  boxIndex: number
  labelMode: "note" | "interval"
  boxScaleType?: string  // parent scale type for CAGED/3NPS when showing an arpeggio
}

export function FretboardViewer({
  scale,
  boxSystem,
  boxIndex,
  labelMode,
  boxScaleType,
}: FretboardViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    try {
      renderFretboard(containerRef.current, scale, boxSystem, boxIndex, labelMode, boxScaleType)
    } catch {
      if (containerRef.current) {
        containerRef.current.innerHTML =
          "<p class='text-xs text-muted-foreground'>Diagram unavailable</p>"
      }
    }
  }, [scale, boxSystem, boxIndex, labelMode, boxScaleType])

  return (
    <div
      ref={containerRef}
      className="w-full overflow-x-auto rounded border border-border bg-card p-2 min-h-[200px]"
    />
  )
}
