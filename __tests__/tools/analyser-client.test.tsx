import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { AnalyserClient } from "@/app/(app)/tools/progression-analysis/_components/analyser-client"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock("@/lib/theory/key-finder", () => ({
  parseChord: (s: string) => {
    if (!s) return null
    const root = s.match(/^([A-G][#b]?)/)?.[1] ?? null
    if (!root) return null
    return { root, type: s.slice(root.length), symbol: s }
  },
  applyFunctionalRomanOverrides: (analyses: unknown[]) => analyses,
  analyzeChordInKey: () => ({ degree: 1, roman: "I", role: "diatonic", score: 1.0, inputChord: {} }),
}))
vi.mock("@/lib/theory/transposer", () => ({
  analyzeProgression: () => [],
}))
vi.mock("@/lib/theory", () => ({
  getSubstitutions: () => [],
  getSoloScales: () => ({ chordTonic: "C", primary: { scaleName: "Major" }, additional: [] }),
  analyzeFunctionalContext: () => ({ romanOverride: null, scalesOverride: null }),
}))
vi.mock("@/app/(app)/reference/progressions/actions", () => ({
  createUserProgression: vi.fn().mockResolvedValue({ success: true, id: "test-id" }),
}))
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  closestCenter: vi.fn(),
  PointerSensor: class {},
  KeyboardSensor: class {},
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}))
vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  horizontalListSortingStrategy: {},
  sortableKeyboardCoordinates: {},
  arrayMove: vi.fn((arr: unknown[], from: number, to: number) => {
    const result = [...arr]
    const [item] = result.splice(from, 1)
    result.splice(to, 0, item!)
    return result
  }),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}))
vi.mock("@/lib/theory/chords", () => ({ listChordDbSuffixes: () => ["", "maj7", "m7", "7", "m7b5", "dim7"] }))

describe("AnalyserClient", () => {
  it("renders key and mode selectors", () => {
    render(<AnalyserClient />)
    expect(screen.getByLabelText("Key")).toBeInTheDocument()
    expect(screen.getByLabelText("Mode")).toBeInTheDocument()
  })

  it("renders add chord button", () => {
    render(<AnalyserClient />)
    expect(screen.getByLabelText("add chord")).toBeInTheDocument()
  })

  it("Save button is disabled when no chords entered", () => {
    render(<AnalyserClient />)
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled()
  })
})
