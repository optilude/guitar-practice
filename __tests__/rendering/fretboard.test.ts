import { describe, it, expect, vi, beforeEach } from "vitest"
import type { GuitarScale } from "@/lib/theory/types"

// ---------------------------------------------------------------------------
// Mock SVGuitar before importing the module under test.
// vi.mock() is hoisted to the top of the file, so variables used inside the
// factory must be declared with vi.hoisted() to be available at hoist time.
// ---------------------------------------------------------------------------
const { mockDraw, mockConfigure, mockChord } = vi.hoisted(() => ({
  mockDraw: vi.fn(),
  mockConfigure: vi.fn(),
  mockChord: vi.fn(),
}))

// The SVGuitar API chain: new SVGuitarChord(el).chord(...).configure(...).draw()
// chord() must return an object with configure()
// configure() must return an object with draw()
// We build this with mockReturnValue so that each call in the chain resolves correctly.
vi.mock("svguitar", () => {
  return {
    ChordStyle: { normal: "normal" },
    SVGuitarChord: class MockSVGuitarChord {
      constructor(_el: unknown) {}
      chord(...args: unknown[]) {
        mockChord(...args)
        return this
      }
      configure(...args: unknown[]) {
        mockConfigure(...args)
        return this
      }
      draw() {
        mockDraw()
      }
    },
  }
})

// ---------------------------------------------------------------------------

import { renderFretboard } from "@/lib/rendering/fretboard"

const SCALE: GuitarScale = {
  tonic: "A",
  type: "Minor Pentatonic",
  notes: ["A", "C", "D", "E", "G"],
  intervals: ["R", "b3", "4", "5", "b7"],
  positions: [
    {
      label: "Position 1",
      positions: [
        { string: 6, fret: 5, interval: "R" },
        { string: 6, fret: 8, interval: "b3" },
        { string: 5, fret: 5, interval: "4" },
        { string: 5, fret: 7, interval: "5" },
        { string: 4, fret: 5, interval: "b7" },
        { string: 4, fret: 7, interval: "R" },
      ],
    },
  ],
}

describe("renderFretboard", () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement("div")
    mockDraw.mockClear()
    mockConfigure.mockClear()
    mockChord.mockClear()
  })

  it("does not throw for a valid scale", () => {
    expect(() => renderFretboard(container, SCALE, 0, "interval")).not.toThrow()
  })

  it("does not throw for labelMode 'note'", () => {
    expect(() => renderFretboard(container, SCALE, 0, "note")).not.toThrow()
  })

  it("does not throw when positionIndex is out of range", () => {
    expect(() => renderFretboard(container, SCALE, 99, "interval")).not.toThrow()
    expect(mockDraw).not.toHaveBeenCalled()
  })

  it("clears the container before rendering", () => {
    container.innerHTML = "<span>stale</span>"
    renderFretboard(container, SCALE, 0, "interval")
    expect(container.innerHTML).not.toContain("stale")
  })

  it("calls chart.draw()", () => {
    renderFretboard(container, SCALE, 0, "interval")
    expect(mockDraw).toHaveBeenCalledOnce()
  })

  it("passes string numbers unchanged (same convention as our system)", () => {
    renderFretboard(container, SCALE, 0, "interval")
    const { fingers } = mockChord.mock.calls[0][0] as {
      fingers: [number, number, string?][]
    }
    // Our string 6 (low E) → SVGuitar string 6 (low E) — no conversion
    const firstFinger = fingers.find((f) => f[1] === 5 && f[2] === "R")
    expect(firstFinger).toBeDefined()
    expect(firstFinger![0]).toBe(6) // string 6 in both systems = low E
  })

  it("passes interval labels when labelMode is 'interval'", () => {
    renderFretboard(container, SCALE, 0, "interval")
    const { fingers } = mockChord.mock.calls[0][0] as {
      fingers: [number, number, string?][]
    }
    const labels = fingers.map((f) => f[2])
    expect(labels).toContain("R")
    expect(labels).toContain("b3")
  })

  it("passes note labels when labelMode is 'note'", () => {
    renderFretboard(container, SCALE, 0, "note")
    const { fingers } = mockChord.mock.calls[0][0] as {
      fingers: [number, number, string?][]
    }
    const labels = fingers.map((f) => f[2])
    expect(labels).toContain("A") // interval "R" → note "A"
  })

  it("sets position config to the minimum fret in the position", () => {
    renderFretboard(container, SCALE, 0, "interval")
    const configArg = mockConfigure.mock.calls[0][0] as { position: number }
    expect(configArg.position).toBe(5) // min fret in fixture
  })
})
