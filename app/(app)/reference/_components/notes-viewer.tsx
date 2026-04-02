"use client"

import { useEffect, useRef } from "react"
import { renderNotesView, INTERVAL_DEGREE_COLORS } from "@/lib/rendering/tab"
import type { GuitarScale } from "@/lib/theory/types"

interface NotesViewerProps {
  scale: GuitarScale
  positionIndex: number
}

const COLOR_KEY = [
  { label: "R",            color: "var(--accent)" },
  { label: "3 / b3",       color: INTERVAL_DEGREE_COLORS.third },
  { label: "5 / b5 / ♯5", color: INTERVAL_DEGREE_COLORS.fifth },
  { label: "7 / b7",       color: INTERVAL_DEGREE_COLORS.seventh },
]

export function NotesViewer({ scale, positionIndex }: NotesViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    try {
      renderNotesView(containerRef.current, scale, positionIndex)
    } catch {
      if (containerRef.current) {
        containerRef.current.innerHTML = "<p class='text-xs text-muted-foreground'>Notes view unavailable</p>"
      }
    }
  }, [scale, positionIndex])

  return (
    <div className="rounded border border-border bg-card p-2">
      <div
        ref={containerRef}
        className="w-full overflow-x-auto"
      />
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 px-1">
        {COLOR_KEY.map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1 text-xs" style={{ color }}>
            <span aria-hidden>●</span>
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
