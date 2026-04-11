import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// Mock all rendering-layer dependencies
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
vi.mock("tonal", () => ({
  Scale: { get: () => ({ notes: ["C", "D", "E", "F", "G", "A", "B"] }) },
}))

// Mock AddToGoalButton to avoid next-auth import chain
vi.mock("@/components/add-to-goal-button", () => ({
  AddToGoalButton: () => null,
}))

// Mock theory engine
vi.mock("@/lib/theory", () => ({
  listScaleTypes: () => ["Major", "Minor Pentatonic"],
  listChordTypes: () => ["major", "minor", "maj7"],
  listChordDbSuffixes: () => ["major", "minor", "maj7"],
  SHELL_CHORD_TYPES: ["maj7 shell", "m7 shell", "7 shell", "maj6 shell", "dim7/m6 shell"],
  getShellChordPositions: () => [],
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
    voicings: [],
  }),
  getChordPositions: () => [
    { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], baseFret: 1, barres: [], capo: false, label: "Open" },
  ],
  getArpeggio: (tonic: string, type: string) => ({
    tonic,
    type,
    notes: ["C", "E", "G", "B"],
    intervals: ["1P", "3M", "5P", "7M"],
    positions: [{ label: "Position 1", positions: [{ string: 6, fret: 8, interval: "R" }] }],
  }),
  getChordAsScale: (_tonic: string, _type: string) => ({
    tonic: "C",
    type: "maj",
    notes: ["C", "E", "G"],
    intervals: ["1P", "3M", "5P"],
    positions: [{ label: "Position 1", positions: [{ string: 6, fret: 8, interval: "R" }] }],
  }),
  // Harmony Study functions
  SOLO_MODE_OPTION_GROUPS: [
    { label: "Major Scale Modes", options: [
      { value: "ionian",     label: "Ionian (major)" },
      { value: "dorian",     label: "Dorian" },
      { value: "phrygian",   label: "Phrygian" },
      { value: "lydian",     label: "Lydian" },
      { value: "mixolydian", label: "Mixolydian" },
      { value: "aeolian",    label: "Aeolian (natural minor)" },
      { value: "locrian",    label: "Locrian" },
    ]},
  ],
  getDiatonicChords: () => [
    { degree: 1, roman: "I",  tonic: "C", type: "maj7", quality: "major",    nashville: "1" },
    { degree: 5, roman: "V",  tonic: "G", type: "7",    quality: "dominant", nashville: "5" },
    { degree: 6, roman: "vi", tonic: "A", type: "m7",   quality: "minor",    nashville: "6" },
  ],
  getSoloScales: () => ({
    chordTonic: "G",
    primary: { scaleName: "Mixolydian" },
    additional: [],
  }),
  getSubstitutions: () => [],
  analyzeFunctionalContext: () => ({ romanOverride: null, scalesOverride: null }),
  INVERSION_TYPES: ["major", "minor", "dim", "aug", "maj7", "m7", "7"],
}))

import { ReferencePageClient } from "@/app/(app)/reference/_components/reference-page-client"

describe("ReferencePage", () => {
  it("renders the page heading", () => {
    render(<ReferencePageClient />)
    expect(screen.getByText("Reference")).toBeDefined()
  })

  it("renders the Circle of Fifths", () => {
    render(<ReferencePageClient />)
    expect(screen.getByRole("img", { name: /circle of fifths/i })).toBeDefined()
  })

  it("defaults to key C shown in the circle centre", () => {
    render(<ReferencePageClient />)
    const cElements = screen.getAllByText("C")
    expect(cElements.length).toBeGreaterThanOrEqual(1)
  })

  it("renders Study Tools tab buttons: Scales, Arpeggios, Chords, Inversions", () => {
    render(<ReferencePageClient />)
    expect(screen.getByRole("tab", { name: "Scales" })).toBeDefined()
    expect(screen.getByRole("tab", { name: "Arpeggios" })).toBeDefined()
    expect(screen.getByRole("tab", { name: "Chords" })).toBeDefined()
    expect(screen.getByRole("tab", { name: "Inversions" })).toBeDefined()
  })

  it("defaults to the Scales tab", () => {
    render(<ReferencePageClient />)
    const scalesTab = screen.getByRole("tab", { name: "Scales" })
    expect(scalesTab).toHaveAttribute("aria-selected", "true")
  })

  it("switches to Chords panel when Chords tab is clicked", async () => {
    render(<ReferencePageClient />)
    await userEvent.click(screen.getByRole("tab", { name: "Chords" }))
    expect(screen.getByRole("tab", { name: "Chords" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByLabelText(/chord type/i)).toBeDefined()
  })

  it("switches to Arpeggios panel when Arpeggios tab is clicked", async () => {
    render(<ReferencePageClient />)
    await userEvent.click(screen.getByRole("tab", { name: "Arpeggios" }))
    expect(screen.getByRole("tab", { name: "Arpeggios" })).toHaveAttribute("aria-selected", "true")
  })

  it("updates the selected key when a circle key is clicked", async () => {
    render(<ReferencePageClient />)
    const gButton = screen.getByRole("button", { name: "Select key G" })
    await userEvent.click(gButton)
    expect(gButton).toHaveAttribute("aria-pressed", "true")
  })
})
