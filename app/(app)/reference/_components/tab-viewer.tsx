"use client"

import { useEffect, useRef } from "react"
import { renderTab } from "@/lib/rendering/tab"
import type { GuitarScale } from "@/lib/theory/types"

interface TabViewerProps {
  scale: GuitarScale
  positionIndex: number
}

export function TabViewer({ scale, positionIndex }: TabViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    try {
      renderTab(containerRef.current, scale, positionIndex)
    } catch {
      // VexFlow may throw in test environments without a real canvas
      if (containerRef.current) {
        containerRef.current.innerHTML = "<p class='text-xs text-muted-foreground'>Tab unavailable</p>"
      }
    }
  }, [scale, positionIndex])

  return (
    <div
      ref={containerRef}
      className="w-full overflow-x-auto rounded border border-border bg-card p-2 min-h-[130px]"
    />
  )
}
