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

// p-2 padding (8px each side) on the card
const CARD_PADDING = 16

export function NotesViewer({ scale, positionIndex }: NotesViewerProps) {
  const cardRef      = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const card = cardRef.current
    const el   = containerRef.current
    if (!card || !el) return

    const parent = card.parentElement
    if (!parent) return

    function render() {
      // Measure available width from the card's parent — not the card itself,
      // so that setting card.style.width below doesn't create a feedback loop.
      const parentWidth = parent!.clientWidth || 490
      const cardWidth   = Math.round(parentWidth * 2 / 3)
      card!.style.width = `${cardWidth}px`
      try {
        // Inner div is w-full → fills card content area (cardWidth minus padding)
        renderNotesView(el!, scale, positionIndex, cardWidth - CARD_PADDING)
      } catch {
        el!.innerHTML = "<p class='text-xs text-muted-foreground'>Notes view unavailable</p>"
      }
    }

    render()
    const ro = new ResizeObserver(render)
    ro.observe(parent)
    return () => ro.disconnect()
  }, [scale, positionIndex])

  return (
    <div ref={cardRef} className="rounded border border-border bg-card p-2">
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
