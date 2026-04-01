"use client"

import { useEffect, useRef } from "react"
import { renderFretboard } from "@/lib/rendering/fretboard"
import type { GuitarScale } from "@/lib/theory/types"

interface FretboardViewerProps {
  scale: GuitarScale
  positionIndex: number
  labelMode: "note" | "interval"
}

export function FretboardViewer({ scale, positionIndex, labelMode }: FretboardViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    try {
      renderFretboard(containerRef.current, scale, positionIndex, labelMode)
    } catch {
      if (containerRef.current) {
        containerRef.current.innerHTML = "<p class='text-xs text-muted-foreground'>Diagram unavailable</p>"
      }
    }
  }, [scale, positionIndex, labelMode])

  return (
    <div
      ref={containerRef}
      className="w-full overflow-x-auto rounded border border-border bg-card p-2 min-h-[200px]"
    />
  )
}
