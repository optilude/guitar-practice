"use client"

import { useEffect, useRef, useState } from "react"
import { Note } from "tonal"
import { Fretboard } from "@moonwave99/fretboard.js"
import { INTERVAL_DEGREE_COLORS } from "@/lib/rendering/tab"
import type { ScaleMatch } from "@/lib/theory/scale-finder"

// Open-string chroma: index 0 = string 6 (low E), index 5 = string 1 (high e)
// Matches lib/rendering/fretboard.ts and lib/theory/scales.ts
const OPEN_CHROMA = [4, 9, 2, 7, 11, 4] as const

// Semitone distance from root → interval degree label
const SEMITONE_TO_DEGREE: Record<number, string> = {
  0: "1", 1: "b2", 2: "2", 3: "b3", 4: "3",
  5: "4", 6: "#4", 7: "5", 8: "b6", 9: "6", 10: "b7", 11: "7",
}

// Semitone distance from root → fill colour (root uses theme accent, resolved at render)
const SEMITONE_TO_COLOR: Record<number, string> = {
  0: "",  // root — use accentColor
  1: INTERVAL_DEGREE_COLORS.second,
  2: INTERVAL_DEGREE_COLORS.second,
  3: INTERVAL_DEGREE_COLORS.third,
  4: INTERVAL_DEGREE_COLORS.third,
  5: INTERVAL_DEGREE_COLORS.fourth,
  6: INTERVAL_DEGREE_COLORS.fourth,
  7: INTERVAL_DEGREE_COLORS.fifth,
  8: INTERVAL_DEGREE_COLORS.fifth,
  9: INTERVAL_DEGREE_COLORS.sixth,
  10: INTERVAL_DEGREE_COLORS.seventh,
  11: INTERVAL_DEGREE_COLORS.seventh,
}

// Precomputed: all 90 positions (6 strings × 15 frets, frets 0–14).
// Fretboard.js string numbers: 1 = high e, 6 = low E.
const ALL_POSITIONS: Array<{ string: number; fret: number; chroma: number }> = (() => {
  const out: Array<{ string: number; fret: number; chroma: number }> = []
  for (let s = 1; s <= 6; s++) {
    for (let f = 0; f <= 14; f++) {
      // OPEN_CHROMA index: 6 - s  (s=6 → idx 0 = low E, s=1 → idx 5 = high e)
      out.push({ string: s, fret: f, chroma: (OPEN_CHROMA[6 - s] + f) % 12 })
    }
  }
  return out
})()

export interface InteractiveFretboardProps {
  selectedChromas: Set<number>
  previewedScale: ScaleMatch | null
  keyChroma: number | null
  labelMode: "notes" | "intervals"
  chromaToNote: string[]  // 12-element chroma→note name map
  onChromaToggle: (chroma: number) => void
}

export function InteractiveFretboard({
  selectedChromas,
  previewedScale,
  keyChroma,
  labelMode,
  chromaToNote,
  onChromaToggle,
}: InteractiveFretboardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDark, setIsDark] = useState(false)

  // Track dark mode changes
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"))
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark"))
    )
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.innerHTML = ""

    // Theme-aware colours (matches lib/rendering/fretboard.ts convention)
    const accentColor = isDark ? "#d97706" : "#b45309"
    // Card background for hollow (preview) dot fill
    const cardBg = isDark ? "#111" : "#ffffff"

    // Build preview chroma set from the previewed scale's notes
    const previewChromas = new Set<number>()
    if (previewedScale) {
      for (const noteName of previewedScale.notes) {
        const c = Note.chroma(noteName)
        if (typeof c === "number" && Number.isFinite(c)) {
          previewChromas.add(c)
        }
      }
    }

    // Build the full dot array: one dot per position.
    // dotType drives styling; dotChroma is used by the click handler.
    // Ghost dots (invisible) ensure clicks register anywhere on the neck.
    // SVG elements with opacity:0 still capture pointer events.
    const dots = ALL_POSITIONS.map(({ string, fret, chroma }) => {
      const isSelected = selectedChromas.has(chroma)
      const isPreview = previewChromas.has(chroma) && !isSelected
      const dotType: "selected" | "preview" | "ghost" =
        isSelected ? "selected" : isPreview ? "preview" : "ghost"

      let label = ""
      if (dotType !== "ghost") {
        if (labelMode === "intervals" && keyChroma !== null) {
          const semitones = (chroma - keyChroma + 12) % 12
          label = SEMITONE_TO_DEGREE[semitones] ?? ""
        } else {
          label = chromaToNote[chroma] ?? ""
        }
      }

      return { string, fret, dotChroma: chroma, dotType, note: label }
    })

    const fretboard = new (Fretboard as any)({
      el: container,
      fretCount: 15,
      showFretNumbers: true,
      dotText: (d: any) => (d.note as string) ?? "",
    })

    fretboard.setDots(dots)
    fretboard.render()

    // Ghost dots: invisible but clickable (opacity:0 does not disable pointer events in SVG)
    fretboard.style({
      filter: (d: any) => d.dotType === "ghost",
      fill: "transparent",
      stroke: "transparent",
      fontFill: "transparent",
      opacity: 0,
    })

    // Selected dots: filled, coloured by interval degree (or accent if no key)
    if (keyChroma !== null) {
      for (let semitones = 0; semitones <= 11; semitones++) {
        const fillColor = semitones === 0 ? accentColor : (SEMITONE_TO_COLOR[semitones] ?? accentColor)
        fretboard.style({
          filter: (d: any) =>
            d.dotType === "selected" && (d.dotChroma - keyChroma + 12) % 12 === semitones,
          fill: fillColor,
          stroke: fillColor,
          text: (d: any) => d.note,
          fontFill: "#ffffff",
        })
      }
    } else {
      fretboard.style({
        filter: (d: any) => d.dotType === "selected",
        fill: accentColor,
        stroke: accentColor,
        text: (d: any) => d.note,
        fontFill: "#ffffff",
      })
    }

    // Preview dots: hollow (outline style — filled with card background, coloured stroke)
    if (keyChroma !== null) {
      for (let semitones = 0; semitones <= 11; semitones++) {
        const strokeColor = semitones === 0 ? accentColor : (SEMITONE_TO_COLOR[semitones] ?? accentColor)
        fretboard.style({
          filter: (d: any) =>
            d.dotType === "preview" && (d.dotChroma - keyChroma + 12) % 12 === semitones,
          fill: cardBg,
          stroke: strokeColor,
          text: (d: any) => d.note,
          fontFill: strokeColor,
        })
      }
    } else {
      fretboard.style({
        filter: (d: any) => d.dotType === "preview",
        fill: cardBg,
        stroke: accentColor,
        text: (d: any) => d.note,
        fontFill: accentColor,
      })
    }

    // Dark mode: colour structural SVG elements (strings, fret lines, fret numbers)
    // Matches the pattern in lib/rendering/fretboard.ts
    if (isDark) {
      const svgEl = container.querySelector<SVGSVGElement>("svg")
      if (svgEl) {
        svgEl.querySelectorAll("line").forEach((el) => el.setAttribute("stroke", "#888"))
        svgEl.querySelectorAll("text").forEach((el) => {
          if (!el.getAttribute("fill")) el.setAttribute("fill", "#888")
        })
      }
    }

    // Click handler: fires for all dots (ghost, selected, preview)
    // Fretboard.js passes the dot's data object as the first argument
    fretboard.on("click", (position: any) => {
      const chroma = position.dotChroma as number
      if (typeof chroma === "number") {
        onChromaToggle(chroma)
      }
    })

    // Mobile fix: fretboard.js only listens for "click", which fires ~300ms late
    // on mobile and is dropped when the finger moves even slightly. Forward
    // touchend as a synthetic MouseEvent so the library's handler fires
    // immediately with the correct coordinates.
    // The hoverDiv is the first (and only) div fretboard.js injects into the container.
    const hoverDiv = container.querySelector<HTMLElement>("div")
    if (hoverDiv) {
      let touchStartX = 0
      let touchStartY = 0
      const MOVE_THRESHOLD = 10 // px — ignore if the finger drifted (likely a scroll)

      const onTouchStart = (e: TouchEvent) => {
        const t = e.touches[0]
        if (!t) return
        touchStartX = t.clientX
        touchStartY = t.clientY
      }

      const onTouchEnd = (e: TouchEvent) => {
        const t = e.changedTouches[0]
        if (!t) return
        if (
          Math.abs(t.clientX - touchStartX) > MOVE_THRESHOLD ||
          Math.abs(t.clientY - touchStartY) > MOVE_THRESHOLD
        ) return
        // Prevent the browser's synthetic click (avoids a double-toggle)
        e.preventDefault()
        hoverDiv.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            clientX: t.clientX,
            clientY: t.clientY,
          })
        )
      }

      hoverDiv.addEventListener("touchstart", onTouchStart, { passive: true })
      hoverDiv.addEventListener("touchend", onTouchEnd, { passive: false })
    }

    return () => {
      container.innerHTML = ""
    }
  }, [selectedChromas, previewedScale, keyChroma, labelMode, chromaToNote, isDark, onChromaToggle])

  return (
    <div
      ref={containerRef}
      className="w-full overflow-x-auto rounded border border-border bg-card p-2"
    />
  )
}
