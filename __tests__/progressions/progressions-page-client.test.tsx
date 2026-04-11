import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { ProgressionsPageClient } from "@/app/(app)/progressions/_components/progressions-page-client"

vi.mock("@/lib/theory", () => ({
  listProgressions: () => [
    {
      name: "pop-standard",
      displayName: "Pop Axis",
      category: "Pop",
      romanDisplay: "I – V – vi – IV",
      examples: "Let It Be",
      notes: "Very common",
      description: "",
      mode: "major",
      recommendedScaleType: "Major Scale",
      degrees: ["I", "V", "vi", "IV"],
    },
  ],
  getProgression: () => [
    { roman: "I", nashville: "1", tonic: "C", type: "maj7", quality: "major", degree: 1 },
    { roman: "V", nashville: "5", tonic: "G", type: "7",    quality: "dominant", degree: 5 },
  ],
  getSubstitutions: () => [],
  getSoloScales: () => ({ chordTonic: "C", primary: { scaleName: "Ionian (major)" }, additional: [] }),
  analyzeFunctionalContext: () => ({}),
  INVERSION_TYPES: [],
}))

vi.mock("@/lib/theory/transposer", () => ({
  analyzeProgression: () => [],
}))

vi.mock("@/lib/theory/key-finder", () => ({
  parseChord: vi.fn((s: string) => s ? { root: s[0], type: s.slice(1), symbol: s } : null),
  applyFunctionalRomanOverrides: vi.fn((a: unknown[]) => a),
  analyzeChordInKey: vi.fn(() => null),
}))

vi.mock("@/lib/theory/build-progression-chords", () => ({
  buildProgressionChords: vi.fn(() => [
    { roman: "I", nashville: "1", tonic: "C", type: "maj7", quality: "major", degree: 1 },
  ]),
}))

vi.mock("@/lib/theory/user-progressions", () => ({
  getUserProgressionChords: vi.fn(() => []),
}))

vi.mock("@/lib/theory/commonality-tiers", () => ({
  ALL_KEY_MODES: [{ modeName: "major", displayName: "Major (Ionian)", tier: 1 }],
}))

vi.mock("@/app/(app)/tools/_components/chord-input-row", () => ({
  ChordInputRow: () => <div data-testid="chord-input-row" />,
}))

vi.mock("@/app/(app)/progressions/_components/progression-selector", () => ({
  ProgressionSelector: ({ selected }: { selected: string }) => (
    <div data-testid="progression-selector">{selected}</div>
  ),
}))

vi.mock("@/app/(app)/reference/_components/substitutions-panel", () => ({
  SubstitutionsPanel: () => <div data-testid="substitutions-panel" />,
}))

vi.mock("@/app/(app)/reference/_components/solo-scales-panel", () => ({
  SoloScalesPanel: () => <div data-testid="solo-scales-panel" />,
}))

vi.mock("@/app/(app)/reference/_components/scale-panel", () => ({
  ScalePanel: () => <div data-testid="scale-panel" />,
}))

vi.mock("@/app/(app)/reference/_components/arpeggio-panel", () => ({
  ArpeggioPanel: () => <div data-testid="arpeggio-panel" />,
}))

vi.mock("@/app/(app)/reference/_components/chord-panel", () => ({
  ChordPanel: () => <div data-testid="chord-panel" />,
}))

vi.mock("@/app/(app)/reference/_components/inversion-panel", () => ({
  InversionPanel: () => <div data-testid="inversion-panel" />,
}))

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({ attributes: {}, listeners: {}, setNodeRef: vi.fn(), transform: null, transition: null, isDragging: false }),
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: {},
  sortableKeyboardCoordinates: {},
  arrayMove: (arr: unknown[], from: number, to: number) => arr,
}))

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PointerSensor: class {},
  KeyboardSensor: class {},
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  closestCenter: vi.fn(),
}))

describe("ProgressionsPageClient", () => {
  it("renders heading and progression selector", () => {
    render(<ProgressionsPageClient userProgressions={[]} />)
    expect(screen.getByRole("heading", { name: /progressions/i })).toBeInTheDocument()
    expect(screen.getByTestId("progression-selector")).toBeInTheDocument()
  })

  it("renders key and mode selectors", () => {
    render(<ProgressionsPageClient userProgressions={[]} />)
    expect(screen.getByRole("combobox", { name: /key/i })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: /mode/i })).toBeInTheDocument()
  })

  it("renders chord input row", () => {
    render(<ProgressionsPageClient userProgressions={[]} />)
    expect(screen.getByTestId("chord-input-row")).toBeInTheDocument()
  })

  it("hides Save button for standard (built-in) progression", () => {
    render(<ProgressionsPageClient userProgressions={[]} />)
    expect(screen.queryByRole("button", { name: /^save$/i })).not.toBeInTheDocument()
  })

  it("shows Save as button as primary for standard progression", () => {
    render(<ProgressionsPageClient userProgressions={[]} />)
    expect(screen.getByRole("button", { name: /save as/i })).toBeInTheDocument()
  })

  it("shows all three buttons for custom progression", () => {
    const userProgs = [{ id: "u1", displayName: "My Blues", mode: "major", degrees: ["I", "IV"], description: "" }]
    render(<ProgressionsPageClient userProgressions={userProgs} initialSelected="u1" />)
    expect(screen.getByRole("button", { name: /^save$/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /save as/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument()
  })

  it("renders Scales tab panel by default in study section", () => {
    render(<ProgressionsPageClient userProgressions={[]} />)
    expect(screen.getByTestId("scale-panel")).toBeInTheDocument()
  })
})
