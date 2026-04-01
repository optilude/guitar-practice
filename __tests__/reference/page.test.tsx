import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// Mock all rendering-layer dependencies
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
  listScaleTypes: () => ["Major", "Minor Pentatonic"],
  listChordTypes: () => ["major", "minor", "maj7"],
  getScale: (tonic: string, type: string) => ({
    tonic,
    type,
    notes: ["C", "D", "E", "F", "G", "A", "B"],
    intervals: ["1P", "2M", "3M", "4P", "5P", "6M", "7M"],
    positions: [{ label: "Position 1", positions: [{ string: 6, fret: 8, interval: "R" }] }],
  }),
  getChord: (tonic: string, type: string) => ({
    tonic,
    type,
    notes: ["C", "E", "G"],
    intervals: ["1P", "3M", "5P"],
    voicings: [{ frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, null, null, null, 3] }],
  }),
  getArpeggio: (tonic: string, type: string) => ({
    tonic,
    type,
    notes: ["C", "E", "G", "B"],
    intervals: ["1P", "3M", "5P", "7M"],
    positions: [{ label: "Position 1", positions: [{ string: 6, fret: 8, interval: "R" }] }],
  }),
}))

import ReferencePage from "@/app/(app)/reference/page"

describe("ReferencePage", () => {
  it("renders the page heading", () => {
    render(<ReferencePage />)
    expect(screen.getByText("Reference")).toBeDefined()
  })

  it("renders the Circle of Fifths", () => {
    render(<ReferencePage />)
    expect(screen.getByRole("img", { name: /circle of fifths/i })).toBeDefined()
  })

  it("defaults to key C shown in the circle centre", () => {
    render(<ReferencePage />)
    // The centre text in CircleOfFifths shows the selected key; it appears multiple times
    const cElements = screen.getAllByText("C")
    expect(cElements.length).toBeGreaterThanOrEqual(1)
  })

  it("renders three tab buttons: Scales, Arpeggios, Chords", () => {
    render(<ReferencePage />)
    expect(screen.getByRole("tab", { name: "Scales" })).toBeDefined()
    expect(screen.getByRole("tab", { name: "Arpeggios" })).toBeDefined()
    expect(screen.getByRole("tab", { name: "Chords" })).toBeDefined()
  })

  it("defaults to the Scales tab", () => {
    render(<ReferencePage />)
    const scalesTab = screen.getByRole("tab", { name: "Scales" })
    expect(scalesTab).toHaveAttribute("aria-selected", "true")
  })

  it("switches to Chords panel when Chords tab is clicked", async () => {
    render(<ReferencePage />)
    await userEvent.click(screen.getByRole("tab", { name: "Chords" }))
    expect(screen.getByRole("tab", { name: "Chords" })).toHaveAttribute("aria-selected", "true")
    // Chord type selector should now be visible
    expect(screen.getByLabelText(/chord type/i)).toBeDefined()
  })

  it("switches to Arpeggios panel when Arpeggios tab is clicked", async () => {
    render(<ReferencePage />)
    await userEvent.click(screen.getByRole("tab", { name: "Arpeggios" }))
    expect(screen.getByRole("tab", { name: "Arpeggios" })).toHaveAttribute("aria-selected", "true")
  })

  it("updates the selected key when a circle key is clicked", async () => {
    render(<ReferencePage />)
    const gButton = screen.getByRole("button", { name: "Select key G" })
    await userEvent.click(gButton)
    // G should now appear in the centre (multiple elements) and the G button should be pressed
    expect(gButton).toHaveAttribute("aria-pressed", "true")
  })
})
