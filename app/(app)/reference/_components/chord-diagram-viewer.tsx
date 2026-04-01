"use client"

import { useEffect, useRef } from "react"
import { renderChordDiagram } from "@/lib/rendering/chord-diagram"
import type { GuitarChord } from "@/lib/theory/types"

interface ChordDiagramViewerProps {
  chord: GuitarChord
  voicingIndex: number
}

export function ChordDiagramViewer({ chord, voicingIndex }: ChordDiagramViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    try {
      renderChordDiagram(containerRef.current, chord, voicingIndex)
    } catch {
      if (containerRef.current) {
        containerRef.current.innerHTML = "<p class='text-xs text-muted-foreground'>Diagram unavailable</p>"
      }
    }
  }, [chord, voicingIndex])

  return (
    <div
      ref={containerRef}
      className="w-full overflow-x-auto rounded border border-border bg-card p-2 min-h-[220px]"
    />
  )
}
