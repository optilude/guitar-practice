import { describe, it, expect, vi, beforeEach } from "vitest"
import type { GuitarChord } from "@/lib/theory/types"

// Mock SVGuitar
const { mockDraw, mockConfigure, mockChord } = vi.hoisted(() => ({
  mockDraw: vi.fn(),
  mockConfigure: vi.fn(),
  mockChord: vi.fn(),
}))

vi.mock("svguitar", () => ({
  ChordStyle: { normal: "normal" },
  SVGuitarChord: class MockSVGuitarChord {
    chord(arg: unknown) { mockChord(arg); return this }
    configure(arg: unknown) { mockConfigure(arg); return this }
    draw() { mockDraw() }
  },
}))

import { renderChordDiagram } from "@/lib/rendering/chord-diagram"

const G_MAJOR: GuitarChord = {
  tonic: "G",
  type: "major",
  notes: ["G", "B", "D"],
  intervals: ["1P", "3M", "5P"],
  voicings: [
    {
      // Open G: frets[0]=3(low E), frets[1]=2(A), frets[2]=0(D), frets[3]=0(G), frets[4]=0(B), frets[5]=3(high e)
      frets: [3, 2, 0, 0, 0, 3],
      fingers: [2, 1, null, null, null, 3],
    },
  ],
}

const BARRE_CHORD: GuitarChord = {
  tonic: "F",
  type: "major",
  notes: ["F", "A", "C"],
  intervals: ["1P", "3M", "5P"],
  voicings: [
    {
      frets: [1, 1, 2, 3, 3, 1],
      fingers: [1, 1, 2, 3, 4, 1],
      barre: { fret: 1, fromString: 1, toString: 6 },
    },
  ],
}

describe("renderChordDiagram", () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement("div")
    mockDraw.mockClear()
    mockConfigure.mockClear()
    mockChord.mockClear()
  })

  it("does not throw for a valid chord and voicing", () => {
    expect(() => renderChordDiagram(container, G_MAJOR, 0)).not.toThrow()
  })

  it("does not throw when voicingIndex is out of range", () => {
    expect(() => renderChordDiagram(container, G_MAJOR, 99)).not.toThrow()
    expect(mockDraw).not.toHaveBeenCalled()
  })

  it("clears the container before rendering", () => {
    container.innerHTML = "<span>old</span>"
    renderChordDiagram(container, G_MAJOR, 0)
    expect(container.innerHTML).not.toContain("old")
  })

  it("calls chart.draw()", () => {
    renderChordDiagram(container, G_MAJOR, 0)
    expect(mockDraw).toHaveBeenCalledOnce()
  })

  it("excludes open strings (fret === 0) from fingers", () => {
    renderChordDiagram(container, G_MAJOR, 0)
    const { fingers } = mockChord.mock.calls[0][0] as { fingers: [number, number, string?][] }
    const fretsInFingers = fingers.map((f) => f[1])
    expect(fretsInFingers).not.toContain(0)
  })

  it("excludes muted strings (fret === null) from fingers", () => {
    const mutedChord: GuitarChord = {
      ...G_MAJOR,
      voicings: [{ frets: [null, 2, 2, null, null, null], fingers: [null, 1, 2, null, null, null] }],
    }
    renderChordDiagram(container, mutedChord, 0)
    const { fingers } = mockChord.mock.calls[0][0] as { fingers: [number, number, string?][] }
    expect(fingers).toHaveLength(2) // only frets[1]=2 and frets[2]=2
  })

  it("includes barre in the chord call when voicing has barre", () => {
    renderChordDiagram(container, BARRE_CHORD, 0)
    const { barres } = mockChord.mock.calls[0][0] as {
      barres: Array<{ fret: number; fromString: number; toString: number }>
    }
    expect(barres).toHaveLength(1)
    expect(barres[0].fret).toBe(1)
  })

  it("passes empty barres array when voicing has no barre", () => {
    renderChordDiagram(container, G_MAJOR, 0)
    const { barres } = mockChord.mock.calls[0][0] as { barres: unknown[] }
    expect(barres).toHaveLength(0)
  })

  it("uses barre fret as diagram position for barre chords", () => {
    renderChordDiagram(container, BARRE_CHORD, 0)
    const configArg = mockConfigure.mock.calls[0][0] as { position: number }
    expect(configArg.position).toBe(1) // barre.fret
  })
})
