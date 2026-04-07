"use client"

import { useEffect, useRef, useState } from "react"
import { SVGuitarChord, BarreChordStyle, type Chord } from "svguitar"

interface ChordDiagramProps {
  chord: Chord
  numFrets?: number
  /** Size of the finger label text. Use 26 for single-digit fingering numbers, 20 for note names / intervals. */
  fingerTextSize?: number
}

export function ChordDiagram({ chord, numFrets = 5, fingerTextSize = 22 }: ChordDiagramProps) {
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
    // light mode → gray-700 (#374151) for clear readability; dark mode → gray-200 (#e5e7eb).
    const structureColor = isDark ? "#e5e7eb" : "#374151"

    const chart = new SVGuitarChord(container)
    const { width, height } = chart
      .configure({
        strings: 6,
        frets: numFrets,
        tuning: [],
        color: structureColor,
        fretLabelFontSize: 36,
        fingerSize: 0.85,
        fingerTextSize,
        strokeWidth: 1.5,
        barreChordStyle: BarreChordStyle.ARC,
        fixedDiagramPosition: true,
      })
      .chord(chord)
      .draw()

    const svg = container.querySelector("svg")
    if (svg) {
      svg.classList.add("chord-diagram-svg")
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`)
      // Let CSS control width so the diagram scales to its container (card)
      svg.removeAttribute("width")
      svg.removeAttribute("height")
      svg.style.width = "100%"
      svg.style.maxWidth = "180px"
      svg.style.display = "block"
    }

    return () => {
      chart.remove()
    }
  }, [chord, numFrets, isDark, fingerTextSize])

  return <div ref={containerRef} className="w-full flex justify-center" />
}
