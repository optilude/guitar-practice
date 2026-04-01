import { describe, it, expect, vi, beforeEach } from "vitest"
import type { GuitarScale } from "@/lib/theory/types"

// ---------------------------------------------------------------------------
// Mock VexFlow before importing the module under test.
// vi.mock() is hoisted to the top of the file, so variables used inside the
// factory must be declared with vi.hoisted() to be available at hoist time.
// ---------------------------------------------------------------------------
const { mockDraw, mockFormatAndDraw, mockSetContext, mockAddClef } = vi.hoisted(() => ({
  mockDraw: vi.fn(),
  mockFormatAndDraw: vi.fn(),
  mockSetContext: vi.fn().mockReturnThis(),
  mockAddClef: vi.fn().mockReturnThis(),
}))

vi.mock("vexflow", () => ({
  Renderer: class MockRenderer {
    static Backends = { SVG: "svg" }
    resize = vi.fn()
    getContext = vi.fn().mockReturnValue({})
  },
  TabStave: class MockTabStave {
    addClef = mockAddClef
    setContext = mockSetContext
    draw = mockDraw
  },
  TabNote: class MockTabNote {
    constructor(public config: unknown) {}
  },
  Formatter: {
    FormatAndDraw: mockFormatAndDraw,
  },
}))

// ---------------------------------------------------------------------------

import { renderTab } from "@/lib/rendering/tab"

const SCALE: GuitarScale = {
  tonic: "C",
  type: "Major",
  notes: ["C", "D", "E", "F", "G", "A", "B"],
  intervals: ["1P", "2M", "3M", "4P", "5P", "6M", "7M"],
  positions: [
    {
      label: "Position 1",
      positions: [
        { string: 6, fret: 8, interval: "R" },
        { string: 6, fret: 10, interval: "2" },
        { string: 5, fret: 7, interval: "3" },
        { string: 5, fret: 8, interval: "4" },
        { string: 5, fret: 10, interval: "5" },
        { string: 4, fret: 7, interval: "6" },
        { string: 4, fret: 9, interval: "7" },
      ],
    },
  ],
}

describe("renderTab", () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement("div")
    mockDraw.mockClear()
    mockFormatAndDraw.mockClear()
    mockAddClef.mockClear()
    mockSetContext.mockClear()
  })

  it("clears the container before rendering", () => {
    container.innerHTML = "<span>old content</span>"
    renderTab(container, SCALE, 0)
    // After call, innerHTML is controlled by VexFlow (mocked); container was cleared at start
    // We verify the old content is gone — VexFlow mock does not re-add any HTML
    expect(container.innerHTML).not.toContain("old content")
  })

  it("does not throw for a valid scale and positionIndex 0", () => {
    expect(() => renderTab(container, SCALE, 0)).not.toThrow()
  })

  it("does not throw when positionIndex is out of range", () => {
    expect(() => renderTab(container, SCALE, 99)).not.toThrow()
    expect(mockFormatAndDraw).not.toHaveBeenCalled()
  })

  it("does not throw for an empty positions array", () => {
    const emptyScale: GuitarScale = { ...SCALE, positions: [] }
    expect(() => renderTab(container, emptyScale, 0)).not.toThrow()
    expect(mockFormatAndDraw).not.toHaveBeenCalled()
  })

  it("calls FormatAndDraw with notes sorted low-string-first", () => {
    renderTab(container, SCALE, 0)
    expect(mockFormatAndDraw).toHaveBeenCalledOnce()
    const notes: Array<{ config: { positions: Array<{ str: number; fret: string }> } }> =
      mockFormatAndDraw.mock.calls[0][2]
    // First note should be from string 6 (lowest)
    expect(notes[0].config.positions[0].str).toBe(6)
  })

  it("converts fret numbers to strings in TabNote positions", () => {
    renderTab(container, SCALE, 0)
    const notes: Array<{ config: { positions: Array<{ str: number; fret: string }> } }> =
      mockFormatAndDraw.mock.calls[0][2]
    for (const note of notes) {
      expect(typeof note.config.positions[0].fret).toBe("string")
    }
  })
})
