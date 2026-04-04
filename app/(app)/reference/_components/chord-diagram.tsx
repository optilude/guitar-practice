"use client"

import { useEffect, useRef, useState } from "react"
import { SVGuitarChord, type Chord } from "svguitar"

interface ChordDiagramProps {
  chord: Chord
  numFrets?: number
}

export function ChordDiagram({ chord, numFrets = 5 }: ChordDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDark, setIsDark] = useState(false)

  // Track dark-mode class on <html> so the diagram re-renders when the theme changes.
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"))
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Structural elements (strings, frets, nut, X/O markers):
    // light mode → gray-500 (#6b7280); dark mode → gray-200 (#e5e7eb) for higher contrast.
    const structureColor = isDark ? "#e5e7eb" : "#6b7280"

    const chart = new SVGuitarChord(container)
    const { width, height } = chart
      .configure({
        strings: 6,
        frets: numFrets,
        tuning: [],
        color: structureColor,
        fretLabelFontSize: 28,
        fingerSize: 0.8,
        fingerTextSize: 22,
        // fretSize: 0.95,
        strokeWidth: 1.5,
      })
      .chord(chord)
      .draw()

    const svg = container.querySelector("svg")
    if (svg) {
      // viewBox preserves SVGuitar's natural coordinate space so nothing distorts.
      // Explicit width at 90 % of natural compresses the horizontal spacing;
      // height is omitted so the browser derives it from the viewBox aspect ratio,
      // keeping circles perfectly round and text proportional.
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`)
      svg.setAttribute("width", String(Math.round(width * 0.8)))
      svg.removeAttribute("height")
    }

    return () => {
      chart.remove()
    }
  }, [chord, numFrets, isDark])

  return <div ref={containerRef} className="w-full flex justify-center" />
}
