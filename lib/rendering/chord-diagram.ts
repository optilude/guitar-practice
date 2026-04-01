import type { GuitarChord } from "@/lib/theory/types"

// SVGuitar is imported via ESM so that vitest's vi.mock("svguitar") intercepts it in tests.
// Rendering only runs client-side via useEffect in viewer components.
import * as svguitar from "svguitar"

const { SVGuitarChord, ChordStyle } = svguitar as unknown as {
  SVGuitarChord: any
  ChordStyle: any
}

/**
 * Renders a chord voicing as a chord diagram into containerEl using SVGuitar.
 * Clears the container first.
 *
 * String convention mapping:
 *   Our ChordVoicing: frets[0] = low E (string 6), frets[5] = high e (string 1)
 *   SVGuitar fingers: string 6 = low E, string 1 = high e (same as standard guitar notation)
 *   Conversion: svgString = 6 - arrayIndex
 *     - i=0 (low E) → svgString = 6 (low E) ✓
 *     - i=5 (high e) → svgString = 1 (high e) ✓
 */
export function renderChordDiagram(
  containerEl: HTMLElement,
  chord: GuitarChord,
  voicingIndex: number
): void {
  containerEl.innerHTML = ""

  const voicing = chord.voicings[voicingIndex]
  if (!voicing) return

  // Build fingers list: only fretted (non-open, non-muted) notes
  const fingers: [number, number, string?][] = []
  voicing.frets.forEach((fret, i) => {
    if (fret === null || fret <= 0) return
    const svgString = 6 - i // frets[0]=low E → svgString=6; frets[5]=high e → svgString=1
    const finger = voicing.fingers[i]
    const label = finger != null ? String(finger) : undefined
    fingers.push([svgString, fret, label])
  })

  // Build barres
  const barres: Array<{ fret: number; fromString: number; toString: number }> = []
  if (voicing.barre) {
    barres.push({
      fret: voicing.barre.fret,
      fromString: voicing.barre.fromString,
      toString: voicing.barre.toString,
    })
  }

  // Determine diagram start position
  const frettedFrets = voicing.frets.filter((f): f is number => f !== null && f > 0)
  const minFret = frettedFrets.length > 0 ? Math.min(...frettedFrets) : 1
  const position = voicing.barre ? voicing.barre.fret : minFret

  const chart = new SVGuitarChord(containerEl)
  chart
    .chord({ fingers, barres })
    .configure({
      style: ChordStyle.normal,
      strings: 6,
      frets: 4,
      position,
    })
    .draw()
}
