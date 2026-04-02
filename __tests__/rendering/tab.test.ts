import { describe, it, expect, vi, beforeEach } from "vitest"
import type { GuitarScale } from "@/lib/theory/types"

// ---------------------------------------------------------------------------
// Mock VexFlow before importing the module under test.
// vi.mock() is hoisted to the top of the file, so variables used inside the
// factory must be declared with vi.hoisted() to be available at hoist time.
// ---------------------------------------------------------------------------
const { mockDraw, mockFormat, mockVoiceDraw, mockVoiceAddTickables, mockVoiceSetMode, mockSetContext, mockAddClef } = vi.hoisted(() => ({
  mockDraw: vi.fn(),
  mockFormat: vi.fn(),
  mockVoiceDraw: vi.fn(),
  mockVoiceAddTickables: vi.fn().mockReturnThis(),
  mockVoiceSetMode: vi.fn().mockReturnThis(),
  mockSetContext: vi.fn().mockReturnThis(),
  mockAddClef: vi.fn().mockReturnThis(),
}))

vi.mock("vexflow", () => ({
  Renderer: class MockRenderer {
    static Backends = { SVG: "svg" }
    resize = vi.fn()
    getContext = vi.fn().mockReturnValue({})
  },
  Stave: class MockStave {
    addClef = mockAddClef
    setContext = mockSetContext
    draw = mockDraw
    getBottomLineBottomY = vi.fn(() => 100)
    getNoteStartX = vi.fn(() => 80)
    setNoteStartX = vi.fn()
  },
  StaveNote: class MockStaveNote {
    constructor(public config: unknown) {}
    setStyle = vi.fn()
    addModifier = vi.fn()
  },
  Accidental: class MockAccidental {
    constructor(public type: string) {}
  },
  TabStave: class MockTabStave {
    addClef = mockAddClef
    setContext = mockSetContext
    draw = mockDraw
    getBottomLineBottomY = vi.fn(() => 200)
    getNoteStartX = vi.fn(() => 80)
    setNoteStartX = vi.fn()
  },
  TabNote: class MockTabNote {
    constructor(public config: unknown) {}
    setStyle = vi.fn()
    getAbsoluteX = vi.fn(() => 50)
  },
  Formatter: class MockFormatter {
    format = mockFormat
  },
  Voice: class MockVoice {
    addTickables = mockVoiceAddTickables
    setMode = mockVoiceSetMode
    draw = mockVoiceDraw
  },
}))

// ---------------------------------------------------------------------------

import { renderNotesView } from "@/lib/rendering/tab"

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

describe("renderNotesView", () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement("div")
    mockDraw.mockClear()
    mockFormat.mockClear()
    mockVoiceDraw.mockClear()
    mockVoiceAddTickables.mockClear()
    mockVoiceSetMode.mockClear()
    mockAddClef.mockClear()
    mockSetContext.mockClear()
  })

  it("clears the container before rendering", () => {
    container.innerHTML = "<span>old content</span>"
    renderNotesView(container, SCALE, 0)
    // After call, innerHTML is controlled by VexFlow (mocked); container was cleared at start
    // We verify the old content is gone — VexFlow mock does not re-add any HTML
    expect(container.innerHTML).not.toContain("old content")
  })

  it("does not throw for a valid scale and positionIndex 0", () => {
    expect(() => renderNotesView(container, SCALE, 0)).not.toThrow()
  })

  it("does not throw when positionIndex is out of range", () => {
    expect(() => renderNotesView(container, SCALE, 99)).not.toThrow()
    expect(mockFormat).not.toHaveBeenCalled()
  })

  it("does not throw for an empty positions array", () => {
    const emptyScale: GuitarScale = { ...SCALE, positions: [] }
    expect(() => renderNotesView(container, emptyScale, 0)).not.toThrow()
    expect(mockFormat).not.toHaveBeenCalled()
  })

  it("uses a shared Formatter for both voices and draws each voice on its stave", () => {
    renderNotesView(container, SCALE, 0)
    // format() called once with both voices; voice.draw() called once per stave
    expect(mockFormat).toHaveBeenCalledTimes(1)
    expect(mockVoiceDraw).toHaveBeenCalledTimes(2)
  })

  it("passes tab notes sorted low-string-first to Voice, with notes from string 6 first", () => {
    renderNotesView(container, SCALE, 0)
    // addTickables is called twice: first for staveNotes, second for tabNotes
    const tabNotes: Array<{ config: { positions: Array<{ str: number; fret: string }> } }> =
      mockVoiceAddTickables.mock.calls[1][0]
    expect(tabNotes[0].config.positions[0].str).toBe(6)
  })

  it("converts fret numbers to strings in TabNote positions", () => {
    renderNotesView(container, SCALE, 0)
    // addTickables second call = tab notes
    const tabNotes: Array<{ config: { positions: Array<{ str: number; fret: string }> } }> =
      mockVoiceAddTickables.mock.calls[1][0]
    for (const note of tabNotes) {
      expect(typeof note.config.positions[0].fret).toBe("string")
    }
  })
})
