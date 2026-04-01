import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

// Mock rendering layer
vi.mock("vexflow", () => ({
  Renderer: class { static Backends = { SVG: "svg" }; resize = vi.fn(); getContext = vi.fn(() => ({})) },
  TabStave: class { addClef = vi.fn().mockReturnThis(); setContext = vi.fn().mockReturnThis(); draw = vi.fn() },
  TabNote: class { constructor(public c: unknown) {} },
  Formatter: { FormatAndDraw: vi.fn() },
}))
vi.mock("svguitar", () => ({
  ChordStyle: { normal: "normal" },
  SVGuitarChord: class {
    chord = vi.fn().mockReturnThis()
    configure = vi.fn().mockReturnThis()
    draw = vi.fn()
  },
}))

// Mock theory engine
vi.mock("@/lib/theory", () => ({
  listChordTypes: () => ["maj7", "m7", "dom7"],
  getArpeggio: (tonic: string, type: string) => ({
    tonic,
    type,
    notes: ["C", "E", "G", "B"],
    intervals: ["1P", "3M", "5P", "7M"],
    positions: [
      { label: "Position 1", positions: [{ string: 6, fret: 8, interval: "R" }] },
    ],
  }),
}))

import { ArpeggioPanel } from "@/app/(app)/reference/_components/arpeggio-panel"

describe("ArpeggioPanel", () => {
  it("renders the chord type selector with all types", () => {
    render(<ArpeggioPanel tonic="C" />)
    const select = screen.getByLabelText(/chord type/i)
    expect(select).toBeDefined()
    expect(screen.getByRole("option", { name: "maj7" })).toBeDefined()
    expect(screen.getByRole("option", { name: "m7" })).toBeDefined()
  })

  it("renders the position selector in tab mode", () => {
    render(<ArpeggioPanel tonic="C" />)
    // Position selector is only visible in tab mode (default is fretboard)
    fireEvent.click(screen.getByRole("button", { name: /tab/i }))
    expect(screen.getByLabelText(/position/i)).toBeDefined()
  })

  it("shows the notes string", () => {
    render(<ArpeggioPanel tonic="C" />)
    expect(screen.getByText(/Notes: C – E – G – B/)).toBeDefined()
  })

  it("defaults to fretboard view mode", () => {
    render(<ArpeggioPanel tonic="C" />)
    expect(screen.getByRole("button", { name: /fretboard/i })).toBeDefined()
  })

  it("changes chord type when selector changes", () => {
    render(<ArpeggioPanel tonic="C" />)
    const select = screen.getByLabelText(/chord type/i) as HTMLSelectElement
    fireEvent.change(select, { target: { value: "m7" } })
    expect(select.value).toBe("m7")
  })
})
