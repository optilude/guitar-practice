"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import type { SessionSection } from "@/lib/sessions"

const TYPE_COLORS: Record<string, string> = {
  warmup: "bg-blue-500",
  technique: "bg-purple-500",
  muscle_memory: "bg-orange-500",
  theory: "bg-green-500",
  lessons: "bg-yellow-500",
  songs: "bg-pink-500",
  free_practice: "bg-gray-500",
}

interface SectionStripProps {
  sections: SessionSection[]
  currentIndex: number
  onSelect: (index: number) => void
}

export function SectionStrip({ sections, currentIndex, onSelect }: SectionStripProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const buttons = container.querySelectorAll("button")
    buttons[currentIndex]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" })
  }, [currentIndex])

  return (
    <div ref={containerRef} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {sections.map((s, i) => (
        <button
          key={s.id}
          onClick={() => onSelect(i)}
          className={cn(
            "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors",
            i === currentIndex
              ? "border-accent bg-accent/10 text-foreground"
              : i < currentIndex
              ? "border-border bg-muted/40 text-muted-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          <span className={cn("w-2 h-2 rounded-full shrink-0", TYPE_COLORS[s.type] ?? "bg-gray-500")} />
          <span>{s.title}</span>
          <span className="text-xs text-muted-foreground">{s.durationMinutes}m</span>
        </button>
      ))}
    </div>
  )
}
