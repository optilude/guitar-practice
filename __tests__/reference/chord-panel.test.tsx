import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

// Mock react-chords Chord component (pure SVG, no DOM deps)
vi.mock("@tombatossals/react-chords/lib/Chord", () => ({
  default: () => <svg data-testid="chord-diagram" />,
}))

// Mock theory engine
vi.mock("@/lib/theory", () => ({
  listChordTypes: () => ["maj", "m", "7", "maj7"],
  listChordDbSuffixes: () => ["major", "minor", "7", "maj7"],
  SHELL_CHORD_TYPES: ["maj7 shell", "m7 shell", "7 shell", "maj6 shell", "dim7/m6 shell"],
  getChord: (tonic: string, type: string) => ({
    tonic,
    type,
    notes: ["C", "E", "G"],
    intervals: ["1P", "3M", "5P"],
    voicings: [],
  }),
  getChordPositions: () => [
    {
      frets: [-1, 3, 2, 0, 1, 0],
      fingers: [0, 3, 2, 0, 1, 0],
      baseFret: 1,
      barres: [],
      capo: false,
      label: "Open",
    },
    {
      frets: [1, 1, 3, 3, 3, 1],
      fingers: [1, 1, 2, 3, 4, 1],
      baseFret: 3,
      barres: [1],
      capo: true,
      label: "Barre – 3fr",
    },
  ],
  getShellChordPositions: () => [
    { frets: [2, 1, 3, -1, -1, -1], fingers: [0, 0, 0, 0, 0, 0], baseFret: 7, barres: [], capo: false, label: "6th string root" },
    { frets: [-1, 2, 1, 3, -1, -1], fingers: [0, 0, 0, 0, 0, 0], baseFret: 2, barres: [], capo: false, label: "5th string root" },
    { frets: [-1, -1, 2, 1, 4, -1], fingers: [0, 0, 0, 0, 0, 0], baseFret: 9, barres: [], capo: false, label: "4th string root" },
  ],
  getChordAsScale: (_tonic: string, _type: string) => ({
    tonic: "C",
    type: "maj",
    notes: ["C", "E", "G"],
    intervals: ["1P", "3M", "5P"],
    positions: [{ label: "Position 1", positions: [{ string: 6, fret: 8, interval: "R" }] }],
  }),
}))

import { ChordPanel } from "@/app/(app)/reference/_components/chord-panel"

describe("ChordPanel", () => {
  it("renders the chord type selector with all types", () => {
    render(<ChordPanel tonic="C" />)
    const select = screen.getByLabelText(/chord type/i)
    expect(select).toBeDefined()
    expect(screen.getByRole("option", { name: "major" })).toBeDefined()
    expect(screen.getByRole("option", { name: "minor" })).toBeDefined()
    expect(screen.getByRole("option", { name: "7" })).toBeDefined()
  })

  it("shows the notes string", () => {
    render(<ChordPanel tonic="C" />)
    expect(screen.getByText(/Notes: C – E – G/)).toBeDefined()
  })

  it("renders a diagram for each voicing position", () => {
    render(<ChordPanel tonic="C" />)
    const diagrams = screen.getAllByTestId("chord-diagram")
    expect(diagrams).toHaveLength(2)
  })

  it("renders a label for each voicing", () => {
    render(<ChordPanel tonic="C" />)
    expect(screen.getByText("Open")).toBeDefined()
    expect(screen.getByText("Barre – 3fr")).toBeDefined()
  })

  it("changes chord type when selector changes", () => {
    render(<ChordPanel tonic="C" />)
    const select = screen.getByLabelText(/chord type/i) as HTMLSelectElement
    fireEvent.change(select, { target: { value: "minor" } })
    expect(select.value).toBe("minor")
  })

  it("does not render a voicing dropdown", () => {
    render(<ChordPanel tonic="C" />)
    expect(screen.queryByLabelText(/voicing/i)).toBeNull()
  })

  it("renders shell chord type options in the selector", () => {
    render(<ChordPanel tonic="C" />)
    expect(screen.getByRole("option", { name: "maj7 shell" })).toBeDefined()
    expect(screen.getByRole("option", { name: "m7 shell" })).toBeDefined()
    expect(screen.getByRole("option", { name: "7 shell" })).toBeDefined()
    expect(screen.getByRole("option", { name: "maj6 shell" })).toBeDefined()
    expect(screen.getByRole("option", { name: "dim7/m6 shell" })).toBeDefined()
  })

  it("shows formula when a shell chord type is selected", () => {
    render(<ChordPanel tonic="C" />)
    const select = screen.getByLabelText(/chord type/i) as HTMLSelectElement
    fireEvent.change(select, { target: { value: "maj7 shell" } })
    expect(screen.getByText(/Formula: 1 – 3 – 7/)).toBeDefined()
  })

  it("renders three diagrams for a shell chord type", () => {
    render(<ChordPanel tonic="C" />)
    const select = screen.getByLabelText(/chord type/i) as HTMLSelectElement
    fireEvent.change(select, { target: { value: "maj7 shell" } })
    const diagrams = screen.getAllByTestId("chord-diagram")
    expect(diagrams).toHaveLength(3)
  })

  it("renders root-string labels for shell chord voicings", () => {
    render(<ChordPanel tonic="C" />)
    const select = screen.getByLabelText(/chord type/i) as HTMLSelectElement
    fireEvent.change(select, { target: { value: "maj7 shell" } })
    expect(screen.getByText("6th string root")).toBeDefined()
    expect(screen.getByText("5th string root")).toBeDefined()
    expect(screen.getByText("4th string root")).toBeDefined()
  })

  it("renders a fretboard container in default state", () => {
    render(<ChordPanel tonic="C" />)
    // The FretboardViewer renders a div with min-h-[200px] class
    const fretboardEl = document.querySelector(".min-h-\\[200px\\]")
    expect(fretboardEl).not.toBeNull()
  })

  it("renders the show-intervals checkbox", () => {
    render(<ChordPanel tonic="C" />)
    const checkbox = screen.getByRole("checkbox", { name: /show intervals/i })
    expect(checkbox).toBeDefined()
  })
})
