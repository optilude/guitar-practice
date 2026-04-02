import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// Mock rendering layer (calls VexFlow/SVGuitar which need real canvas)
vi.mock("vexflow", () => ({
  Renderer: class { static Backends = { SVG: "svg" }; resize = vi.fn(); getContext = vi.fn(() => ({})) },
  Stave: class { addClef = vi.fn().mockReturnThis(); setContext = vi.fn().mockReturnThis(); draw = vi.fn(); getBottomLineBottomY = vi.fn(() => 100); getNoteStartX = vi.fn(() => 80); setNoteStartX = vi.fn() },
  StaveNote: class { constructor(public c: unknown) {} setStyle = vi.fn(); addModifier = vi.fn() },
  Accidental: class { constructor(public type: string) {} },
  TabStave: class { addClef = vi.fn().mockReturnThis(); setContext = vi.fn().mockReturnThis(); draw = vi.fn(); getBottomLineBottomY = vi.fn(() => 200); getNoteStartX = vi.fn(() => 80); setNoteStartX = vi.fn() },
  TabNote: class { constructor(public c: unknown) {} getAbsoluteX = vi.fn(() => 50) },
  Formatter: class { format = vi.fn() },
  Voice: class { addTickables = vi.fn().mockReturnThis(); setMode = vi.fn().mockReturnThis(); draw = vi.fn() },
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
  listScaleTypes: () => ["Major", "Minor Pentatonic", "Dorian"],
  getScale: (tonic: string, type: string) => ({
    tonic,
    type,
    notes: ["C", "D", "E"],
    intervals: ["1P", "2M", "3M"],
    positions: [
      { label: "Position 1", positions: [{ string: 6, fret: 8, interval: "R" }] },
      { label: "Position 2", positions: [{ string: 5, fret: 7, interval: "R" }] },
    ],
  }),
}))

import { ScalePanel } from "@/app/(app)/reference/_components/scale-panel"

describe("ScalePanel", () => {
  it("renders the scale type selector with all types", () => {
    render(<ScalePanel tonic="C" />)
    const select = screen.getByLabelText(/scale type/i)
    expect(select).toBeDefined()
    expect(screen.getByRole("option", { name: "Ionian (major)" })).toBeDefined()
    expect(screen.getByRole("option", { name: "Minor Pentatonic" })).toBeDefined()
    expect(screen.getByRole("option", { name: "Dorian" })).toBeDefined()
  })

  it("renders the position selector in notes mode", () => {
    render(<ScalePanel tonic="C" />)
    // Position selector is only visible in notes mode (default is fretboard)
    fireEvent.click(screen.getByRole("button", { name: /notes/i }))
    const select = screen.getByLabelText(/position/i)
    expect(select).toBeDefined()
    expect(screen.getByRole("option", { name: "Position 1" })).toBeDefined()
    expect(screen.getByRole("option", { name: "Position 2" })).toBeDefined()
  })

  it("shows the notes string", () => {
    render(<ScalePanel tonic="C" />)
    expect(screen.getByText(/Notes: C – D – E/)).toBeDefined()
  })

  it("defaults to fretboard view mode", () => {
    render(<ScalePanel tonic="C" />)
    // The fretboard button should exist and be styled as active
    expect(screen.getByRole("button", { name: /fretboard/i })).toBeDefined()
  })

  it("switches to notes view when Notes button is clicked", async () => {
    render(<ScalePanel tonic="C" />)
    const tabButton = screen.getByRole("button", { name: /notes/i })
    await userEvent.click(tabButton)
    // After switching, the 'Show intervals' checkbox should disappear
    expect(screen.queryByText(/show intervals/i)).toBeNull()
  })

  it("shows interval checkbox in fretboard mode", async () => {
    render(<ScalePanel tonic="C" />)
    await userEvent.click(screen.getByRole("button", { name: /fretboard/i }))
    expect(screen.getByText(/show intervals/i)).toBeDefined()
  })

  it("changes scale type when selector changes", async () => {
    render(<ScalePanel tonic="C" />)
    const select = screen.getByLabelText(/scale type/i) as HTMLSelectElement
    fireEvent.change(select, { target: { value: "Dorian" } })
    expect(select.value).toBe("Dorian")
  })
})
