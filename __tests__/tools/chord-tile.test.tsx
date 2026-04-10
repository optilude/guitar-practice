import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ChordTile } from "@/app/(app)/tools/_components/chord-tile"

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}))
vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => null } },
}))
vi.mock("@/lib/theory/chords", () => ({
  listChordDbSuffixes: () => ["", "maj7", "m7", "7", "m7b5", "dim7"],
}))

const baseProps = {
  id: "chord-1",
  symbol: "Cmaj7",
  analysis: { roman: "I", degree: 1, role: "diatonic" as const, score: 1.0, inputChord: { root: "C", type: "maj7", symbol: "Cmaj7" } },
  isEditing: false,
  onCommit: vi.fn(),
  onRemove: vi.fn(),
  onStartEdit: vi.fn(),
}

beforeEach(() => {
  baseProps.onCommit.mockClear()
  baseProps.onRemove.mockClear()
  baseProps.onStartEdit.mockClear()
})

describe("ChordTile select/edit split", () => {
  it("without onSelect, clicking tile calls onStartEdit", () => {
    render(<ChordTile {...baseProps} />)
    fireEvent.click(screen.getByText("Cmaj7"))
    expect(baseProps.onStartEdit).toHaveBeenCalled()
  })

  it("with onSelect, clicking tile body calls onSelect", () => {
    const onSelect = vi.fn()
    render(<ChordTile {...baseProps} onSelect={onSelect} />)
    const tile = screen.getByRole("button", { name: /select chord/i })
    fireEvent.click(tile)
    expect(onSelect).toHaveBeenCalled()
    expect(baseProps.onStartEdit).not.toHaveBeenCalled()
  })

  it("with onSelect, clicking chord name text calls onStartEdit", () => {
    const onSelect = vi.fn()
    const onStartEdit = vi.fn()
    render(<ChordTile {...baseProps} onSelect={onSelect} onStartEdit={onStartEdit} />)
    fireEvent.click(screen.getByText("Cmaj7"))
    expect(onStartEdit).toHaveBeenCalled()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("renders isSelected state via aria-pressed", () => {
    const onSelect = vi.fn()
    render(<ChordTile {...baseProps} onSelect={onSelect} isSelected={true} />)
    expect(screen.getByRole("button", { name: /select chord/i })).toHaveAttribute("aria-pressed", "true")
  })
})
