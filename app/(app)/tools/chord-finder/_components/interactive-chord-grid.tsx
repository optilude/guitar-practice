"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { SVGuitarChord, OPEN, SILENT, type Chord, BarreChordStyle } from "svguitar"

// Open-string chroma: index 0 = string 6 (low E), index 5 = string 1 (high e)
const OPEN_CHROMA = [4, 9, 2, 7, 11, 4] as const

export type GridMetrics = {
  inputTopPx: number      // vertical offset for the fret-number input
  buttonOffsetPx: number  // left offset to align Clear button with chord box
  buttonWidthPx: number   // width of the chord box (between outermost strings)
  nutTopPx: number        // vertical offset of the nut line from the rendered SVG top
}

interface InteractiveChordGridProps {
  frets: (number | null)[]       // null=muted, 0=open, N=absolute fret
  startFret: number              // first visible fret (default 1)
  numFrets?: number              // visible fret rows (default 6)
  chromaToNote?: string[]        // key-aware chroma→note map for dot labels
  onFretsChange: (frets: (number | null)[]) => void
  onMetricsChange?: (metrics: GridMetrics) => void
}

const CHROMA_TO_NOTE_FLAT = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"] as const

// Convert our absolute-fret state to a SVGuitar Chord object.
// SVGuitar strings: 6=low E (index 0), 1=high e (index 5).
// SVGuitar fret numbers are 1-based relative to startFret.
function toSVGuitarChord(
  frets: (number | null)[],
  startFret: number,
  numFrets: number,
  noteNames: string[],
): Chord {
  const fingers: Chord["fingers"] = frets.map((f, i) => {
    const stringNum = 6 - i // SVGuitar string number
    if (f === null) return [stringNum, SILENT]
    if (f === 0) {
      const noteName = noteNames[OPEN_CHROMA[i]]
      return [stringNum, OPEN, noteName]
    }
    const relativeFret = f - startFret + 1
    if (relativeFret < 1 || relativeFret > numFrets) return [stringNum, SILENT]
    const noteName = noteNames[(OPEN_CHROMA[i] + f) % 12]
    return [stringNum, relativeFret, noteName]
  })
  return {
    fingers,
    barres: [],
    // undefined → SVGuitar draws the nut; number → shows position label
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
  chromaToNote,
  onFretsChange,
  onMetricsChange,
}: InteractiveChordGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDark, setIsDark] = useState(false)
  const [hitZones, setHitZones] = useState<HitZone[]>([])
  const [overlayViewBox, setOverlayViewBox] = useState("0 0 400 500")

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
    const fingerTextColor = isDark ? "#111827" : "#ffffff"
    const noteNames = chromaToNote ?? [...CHROMA_TO_NOTE_FLAT]
    const chord = toSVGuitarChord(frets, startFret, numFrets, noteNames)

    const chart = new SVGuitarChord(container)
    const { width, height } = chart
      .configure({
        strings: 6,
        frets: numFrets,
        tuning: [],
        color: structureColor,
        fretLabelFontSize: 36,
        fingerSize: 0.9,
        fingerTextSize: 20,
        fingerTextColor,
        strokeWidth: 1.5,
        barreChordStyle: BarreChordStyle.ARC,
        fixedDiagramPosition: true,
      })
      .chord(chord)
      .draw()

    const svgEl = container.querySelector("svg")
    // Remove the position label (e.g. "2fr.") — it overlaps the numeric input.
    // The nut/position rendering is still controlled by the `position` field on the chord.
    svgEl?.querySelectorAll<SVGTextElement>("text").forEach((el) => {
      if (/fr\.?$/i.test(el.textContent ?? "")) el.remove()
    })
    if (svgEl) {
      svgEl.removeAttribute("width")
      svgEl.removeAttribute("height")
      svgEl.style.width = "100%"
      svgEl.style.display = "block"

      // Compute hit zones in original SVG coordinate space (before viewBox crop)
      const zones = computeHitZones(svgEl as SVGElement, startFret)
      setHitZones(zones)

      const headerZones = zones.filter((z) => z.fret === "header").sort((a, b) => a.svgX - b.svgX)
      const firstFretZone = zones.find((z) => z.fret === startFret)

      if (headerZones.length >= 6 && firstFretZone) {
        const nutSvgY = headerZones[0].svgH  // header zone height = distance from top to nut line
        const halfSpacing = headerZones[0].svgW / 2

        // Crop top: remove the upper half of the header dead space
        const cropY = nutSvgY / 2

        // Crop left and right: remove dead space outside the outermost strings,
        // leaving room for a full dot. Dot radius ≈ fingerSize (0.9) × halfSpacing;
        // add 4 SVG units safety margin on each side.
        const dotRadius = 0.9 * halfSpacing
        const chordBoxLeftSvg = headerZones[0].svgX + halfSpacing   // string 6 centre x
        const chordBoxRightSvg = headerZones[5].svgX + halfSpacing  // string 1 centre x
        const cropX = Math.max(0, chordBoxLeftSvg - dotRadius - 4)
        const cropRight = Math.min(width, chordBoxRightSvg + dotRadius + 4)

        const croppedViewBoxW = cropRight - cropX
        // Scale maxWidth proportionally so the chord box stays the same visual size
        svgEl.style.maxWidth = `${Math.round(240 * croppedViewBoxW / width)}px`
        const croppedViewBox = `${cropX} ${cropY} ${croppedViewBoxW} ${height - cropY}`
        svgEl.setAttribute("viewBox", croppedViewBox)
        setOverlayViewBox(croppedViewBox)

        if (onMetricsChange) {
          const chordBoxWidthSvg = chordBoxRightSvg - chordBoxLeftSvg

          // Positions relative to cropped viewBox origin
          const croppedViewBoxH = height - cropY
          const firstFretCenterY = nutSvgY + firstFretZone.svgH / 2

          requestAnimationFrame(() => {
            const svgRendered = svgEl.getBoundingClientRect()
            if (svgRendered.height > 0) {
              const scaleX = svgRendered.width / croppedViewBoxW
              const scaleY = svgRendered.height / croppedViewBoxH
              onMetricsChange({
                inputTopPx: (firstFretCenterY - cropY) * scaleY,
                // button offset/width relative to the rendered SVG left edge (post-crop)
                buttonOffsetPx: (chordBoxLeftSvg - cropX) * scaleX,
                buttonWidthPx: chordBoxWidthSvg * scaleX,
                // nut line is at nutSvgY - cropY within the cropped viewBox
                nutTopPx: (nutSvgY - cropY) * scaleY,
              })
            }
          })
        }
      } else {
        // Fallback: full viewBox
        svgEl.style.maxWidth = "240px"
        svgEl.setAttribute("viewBox", `0 0 ${width} ${height}`)
        setOverlayViewBox(`0 0 ${width} ${height}`)
      }
    }

    return () => chart.remove()
  }, [frets, startFret, numFrets, isDark, chromaToNote, onMetricsChange])

  const handleZoneClick = useCallback((zone: HitZone) => {
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
  }, [frets, onFretsChange])

  return (
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
            overflow: "hidden",
          }}
        >
          {hitZones.map((zone) => (
            <rect
              key={`${zone.stringIndex}-${String(zone.fret)}`}
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
  )
}
