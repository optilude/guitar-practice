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
})
