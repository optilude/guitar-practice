import type { GuitarScale } from "@/lib/theory/types"

// SVGuitar is imported via ESM so that vitest's vi.mock("svguitar") intercepts it in tests.
// Rendering only runs client-side via useEffect in viewer components.
import * as svguitar from "svguitar"

const { SVGuitarChord, ChordStyle } = svguitar as unknown as {
  SVGuitarChord: any
  ChordStyle: any
}

/**
 * Renders a scale position as a fretboard diagram into containerEl using SVGuitar.
 * Clears the container first.
 *
 * String convention: our string 1 = high e, string 6 = low E.
 * SVGuitar uses the SAME convention (string 1 = high e, string 6 = low E).
 * No conversion needed: svgString = p.string
 */
export function renderFretboard(
  containerEl: HTMLElement,
  scale: GuitarScale,
  positionIndex: number,
  labelMode: "note" | "interval"
): void {
  containerEl.innerHTML = ""

  const scalePosition = scale.positions[positionIndex]
  if (!scalePosition || scalePosition.positions.length === 0) return

  const frets = scalePosition.positions.map((p) => p.fret).filter((f) => f > 0)
  const minFret = frets.length > 0 ? Math.min(...frets) : 1

  // Map interval → note name for "note" label mode
  const intervalToNote: Record<string, string> = {}
  scale.intervals.forEach((interval, i) => {
    intervalToNote[interval] = scale.notes[i] ?? ""
  })

  // SVGuitar fingers: [svgString, fret, label?]
  // String convention is the same: p.string maps directly to SVGuitar string number
  const fingers: [number, number, string?][] = scalePosition.positions
    .filter((p) => p.fret > 0)
    .map((p) => {
      const svgString = p.string // same convention, no conversion
      const label =
        labelMode === "interval"
          ? p.interval
          : (intervalToNote[p.interval] ?? "")
      return [svgString, p.fret, label] as [number, number, string]
    })

  const chart = new SVGuitarChord(containerEl)
  chart
    .chord({ fingers, barres: [] })
    .configure({
      style: ChordStyle.normal,
      strings: 6,
      frets: 5,
      position: minFret,
      showTuning: false,
    })
    .draw()
}
