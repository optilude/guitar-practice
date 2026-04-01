import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

vi.mock("@tombatossals/react-chords/lib/Chord", () => ({
  default: () => <svg data-testid="chord-diagram" />,
}))

vi.mock("@/lib/theory", () => ({
  TRIAD_TYPES: ["major", "minor", "diminished", "augmented"],
  TRIAD_STRING_SETS: [
    "6-5-4", "6-5-3", "6-4-3",
    "5-4-3", "5-4-2", "5-3-2",
    "4-3-2", "4-3-1", "4-2-1",
    "3-2-1",
  ],
  getTriadAsScale: (_tonic: string, _type: string) => ({
    tonic: "C",
    type: "maj",
    notes: ["C", "E", "G"],
    intervals: ["1P", "3M", "5P"],
    positions: [{ label: "Position 1", positions: [{ string: 6, fret: 8, interval: "R" }] }],
  }),
  getTriadVoicings: (tonic: string, type: string) => {
    if (tonic !== "C" || type !== "major") return []
    return [
      {
        frets: [2, 1, 2, -1, -1, -1],
        fingers: [0, 0, 0, 0, 0, 0],
        baseFret: 7,
        barres: [],
        capo: false,
        label: "Root position",
        stringSet: "6-5-4",
        voicingType: "close",
        inversion: "root",
        minFret: 7,
      },
      {
        frets: [-1, 2, 1, 2, -1, -1],
        fingers: [0, 0, 0, 0, 0, 0],
        baseFret: 5,
        barres: [],
        capo: false,
        label: "1st inversion",
        stringSet: "5-4-3",
        voicingType: "close",
        inversion: "first",
        minFret: 5,
      },
      {
        frets: [-1, -1, 2, 1, 2, -1],
        fingers: [0, 0, 0, 0, 0, 0],
        baseFret: 9,
        barres: [],
        capo: false,
        label: "2nd inversion",
        stringSet: "4-3-2",
        voicingType: "close",
        inversion: "second",
        minFret: 9,
      },
    ]
  },
}))

import { TriadPanel } from "@/app/(app)/reference/_components/triad-panel"

describe("TriadPanel", () => {
  it("renders the triad type selector", () => {
    render(<TriadPanel tonic="C" />)
    expect(screen.getByLabelText(/triad type/i)).toBeDefined()
  })

  it("renders all four triad type options", () => {
    render(<TriadPanel tonic="C" />)
    expect(screen.getByRole("option", { name: "major" })).toBeDefined()
    expect(screen.getByRole("option", { name: "minor" })).toBeDefined()
    expect(screen.getByRole("option", { name: "diminished" })).toBeDefined()
    expect(screen.getByRole("option", { name: "augmented" })).toBeDefined()
  })

  it("renders the voicing, inversion, and string set filter selectors", () => {
    render(<TriadPanel tonic="C" />)
    expect(screen.getByLabelText(/voicing/i)).toBeDefined()
    expect(screen.getByLabelText(/inversion/i)).toBeDefined()
    expect(screen.getByLabelText(/string set/i)).toBeDefined()
  })

  it("shows the formula for the selected triad type", () => {
    render(<TriadPanel tonic="C" />)
    expect(screen.getByText(/Formula: 1 – 3 – 5/)).toBeDefined()
  })

  it("renders a chord diagram for each voicing", () => {
    render(<TriadPanel tonic="C" />)
    const diagrams = screen.getAllByTestId("chord-diagram")
    expect(diagrams).toHaveLength(3)
  })

  it("renders inversion labels", () => {
    render(<TriadPanel tonic="C" />)
    // Labels appear in both select options and voicing spans — at least 2 occurrences each
    expect(screen.getAllByText("Root position").length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText("1st inversion").length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText("2nd inversion").length).toBeGreaterThanOrEqual(2)
  })

  it("renders string-set section headings", () => {
    render(<TriadPanel tonic="C" />)
    // Each string set appears in both the select dropdown and the section heading
    expect(screen.getAllByText(/6-5-4/).length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText(/5-4-3/).length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText(/4-3-2/).length).toBeGreaterThanOrEqual(2)
  })

  it("shows no-voicings message when all voicings are filtered out", () => {
    render(<TriadPanel tonic="C" />)
    const invSelect = screen.getByLabelText(/inversion/i) as HTMLSelectElement
    // Filter to a combination that yields no results in the mock
    const voicingSelect = screen.getByLabelText(/voicing/i) as HTMLSelectElement
    fireEvent.change(voicingSelect, { target: { value: "open" } })
    expect(screen.getByText(/no voicings match/i)).toBeDefined()
  })

  it("changes triad type and updates formula", () => {
    render(<TriadPanel tonic="C" />)
    const select = screen.getByLabelText(/triad type/i) as HTMLSelectElement
    fireEvent.change(select, { target: { value: "minor" } })
    expect(select.value).toBe("minor")
    // Formula updates (minor not mocked to return voicings, but formula should update)
    expect(screen.getByText(/Formula: 1 – b3 – 5/)).toBeDefined()
  })

  it("changes inversion filter", () => {
    render(<TriadPanel tonic="C" />)
    const select = screen.getByLabelText(/inversion/i) as HTMLSelectElement
    fireEvent.change(select, { target: { value: "root" } })
    expect(select.value).toBe("root")
  })

  it("renders a fretboard container", () => {
    render(<TriadPanel tonic="C" />)
    const fretboardEl = document.querySelector(".min-h-\\[200px\\]")
    expect(fretboardEl).not.toBeNull()
  })

  it("show-intervals checkbox starts checked and toggles off", () => {
    render(<TriadPanel tonic="C" />)
    const checkbox = screen.getByRole("checkbox", { name: /show intervals/i }) as HTMLInputElement
    expect(checkbox.checked).toBe(true)
    fireEvent.click(checkbox)
    expect(checkbox.checked).toBe(false)
  })
})
