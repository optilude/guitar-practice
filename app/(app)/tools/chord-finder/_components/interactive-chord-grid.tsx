"use client"

import { useEffect, useRef, useState } from "react"
import { SVGuitarChord, OPEN, SILENT, type Chord, BarreChordStyle } from "svguitar"

// Open-string chroma: index 0 = string 6 (low E), index 5 = string 1 (high e)
const OPEN_CHROMA = [4, 9, 2, 7, 11, 4] as const

interface InteractiveChordGridProps {
  frets: (number | null)[]       // null=muted, 0=open, N=absolute fret
  startFret: number              // first visible fret (default 1)
  numFrets?: number              // visible fret rows (default 6)
  onFretsChange: (frets: (number | null)[]) => void
  onStartFretChange: (fret: number) => void
}

// Convert our absolute-fret state to a SVGuitar Chord object.
// SVGuitar strings: 6=low E (index 0), 1=high e (index 5).
// SVGuitar fret numbers are 1-based relative to startFret.
function toSVGuitarChord(
  frets: (number | null)[],
  startFret: number,
  numFrets: number,
): Chord {
  const fingers: Chord["fingers"] = frets.map((f, i) => {
    const stringNum = 6 - i // SVGuitar string number
    if (f === null) return [stringNum, SILENT]
    if (f === 0) return [stringNum, OPEN]
    const relativeFret = f - startFret + 1
    if (relativeFret < 1 || relativeFret > numFrets) return [stringNum, SILENT]
    return [stringNum, relativeFret]
  })
  return {
    fingers,
    barres: [],
    position: startFret > 1 ? startFret : undefined,
  }
}

type HitZone = {
  stringIndex: number           // 0=low E, 5=high e
  fret: number | "header"       // absolute fret or "header" for open/muted toggle
  svgX: number
  svgY: number
  svgW: number
  svgH: number
}

// Query SVGuitar's rendered SVG to find string x-positions and fret line y-positions.
// Vertical lines (x1≈x2) → string positions. Horizontal lines (y1≈y2) → fret lines.
function computeHitZones(svgEl: SVGElement, startFret: number): HitZone[] {
  const lines = Array.from(svgEl.querySelectorAll<SVGLineElement>("line"))

  const verticalXs = lines
    .filter((l) => Math.abs(parseFloat(l.getAttribute("x1") ?? "0") - parseFloat(l.getAttribute("x2") ?? "1")) < 0.01)
    .map((l) => parseFloat(l.getAttribute("x1") ?? "0"))

  const horizontalYs = lines
    .filter((l) => Math.abs(parseFloat(l.getAttribute("y1") ?? "0") - parseFloat(l.getAttribute("y2") ?? "1")) < 0.01)
    .map((l) => parseFloat(l.getAttribute("y1") ?? "0"))

  if (verticalXs.length < 6 || horizontalYs.length < 2) return []

  const stringXs = [...new Set(verticalXs)].sort((a, b) => a - b).slice(0, 6)
  const allFretYs = [...new Set(horizontalYs)].sort((a, b) => a - b)

  const nutY = allFretYs[0]           // topmost horizontal line = nut
  const fretLineYs = allFretYs.slice(1) // remaining = fret lines (numFrets entries)

  if (fretLineYs.length === 0) return []

  const halfSpacing = (stringXs[1] - stringXs[0]) / 2
  const zones: HitZone[] = []

  // Header zone per string: y from 0 to nutY (tap to toggle open ↔ muted)
  for (let si = 0; si < 6; si++) {
    zones.push({
      stringIndex: si,
      fret: "header",
      svgX: stringXs[si] - halfSpacing,
      svgY: 0,
      svgW: halfSpacing * 2,
      svgH: nutY,
    })
  }

  // Fret cell zones: one rect per (fret row, string)
  for (let fi = 0; fi < fretLineYs.length; fi++) {
    const topY = fi === 0 ? nutY : fretLineYs[fi - 1]
    const botY = fretLineYs[fi]
    const absoluteFret = startFret + fi
    for (let si = 0; si < 6; si++) {
      zones.push({
        stringIndex: si,
        fret: absoluteFret,
        svgX: stringXs[si] - halfSpacing,
        svgY: topY,
        svgW: halfSpacing * 2,
        svgH: botY - topY,
      })
    }
  }

  return zones
}

export function InteractiveChordGrid({
  frets,
  startFret,
  numFrets = 6,
  onFretsChange,
  onStartFretChange,
}: InteractiveChordGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDark, setIsDark] = useState(false)
  const [hitZones, setHitZones] = useState<HitZone[]>([])
  const [overlayViewBox, setOverlayViewBox] = useState("0 0 400 500")
  const [inputTopPx, setInputTopPx] = useState(0)

  // Track dark mode
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"))
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark"))
    )
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])

  // Render SVGuitar and compute overlay hit zones
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const structureColor = isDark ? "#e5e7eb" : "#374151"
    const chord = toSVGuitarChord(frets, startFret, numFrets)

    const chart = new SVGuitarChord(container)
    const { width, height } = chart
      .configure({
        strings: 6,
        frets: numFrets,
        tuning: [],
        color: structureColor,
        fretLabelFontSize: 36,
        fingerSize: 0.85,
        strokeWidth: 1.5,
        barreChordStyle: BarreChordStyle.ARC,
        fixedDiagramPosition: true,
        noPosition: true,
      })
      .chord(chord)
      .draw()

    const svgEl = container.querySelector("svg")
    if (svgEl) {
      svgEl.setAttribute("viewBox", `0 0 ${width} ${height}`)
      svgEl.removeAttribute("width")
      svgEl.removeAttribute("height")
      svgEl.style.width = "100%"
      svgEl.style.maxWidth = "180px"
      svgEl.style.display = "block"

      const zones = computeHitZones(svgEl as SVGElement, startFret)
      setHitZones(zones)
      setOverlayViewBox(`0 0 ${width} ${height}`)

      // Position start fret input at the level of the first fret row center
      const nutZone = zones.find((z) => z.fret === "header")
      const firstFretZone = zones.find((z) => z.fret === startFret)
      if (nutZone && firstFretZone) {
        const firstFretCenterY = nutZone.svgH + firstFretZone.svgH / 2
        const svgRendered = svgEl.getBoundingClientRect()
        const svgViewBoxH = height
        setInputTopPx((firstFretCenterY / svgViewBoxH) * svgRendered.height)
      }
    }

    return () => chart.remove()
  }, [frets, startFret, numFrets, isDark])

  function handleZoneClick(zone: HitZone) {
    const newFrets = [...frets]
    const si = zone.stringIndex
    if (zone.fret === "header") {
      // Toggle open ↔ muted (clears any fretted position)
      newFrets[si] = frets[si] === 0 ? null : 0
    } else {
      const absoluteFret = zone.fret as number
      // Click active fret → mute; click elsewhere → set fret
      newFrets[si] = frets[si] === absoluteFret ? null : absoluteFret
    }
    onFretsChange(newFrets)
  }

  return (
    <div className="flex gap-2 items-start">
      {/* Diagram + click overlay */}
      <div style={{ position: "relative", display: "inline-block" }}>
        <div ref={containerRef} />
        {hitZones.length > 0 && (
          <svg
            viewBox={overlayViewBox}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              overflow: "visible",
            }}
          >
            {hitZones.map((zone, i) => (
              <rect
                key={i}
                x={zone.svgX}
                y={zone.svgY}
                width={zone.svgW}
                height={zone.svgH}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onClick={() => handleZoneClick(zone)}
              />
            ))}
          </svg>
        )}
      </div>

      {/* Start fret input — aligned with first fret row */}
      <input
        type="number"
        min={1}
        max={22}
        value={startFret}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10)
          if (!isNaN(v) && v >= 1 && v <= 22) onStartFretChange(v)
        }}
        style={{ marginTop: `${inputTopPx}px` }}
        className="w-10 rounded border border-border bg-card text-foreground text-sm text-center px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        aria-label="Start fret"
      />
    </div>
  )
}
