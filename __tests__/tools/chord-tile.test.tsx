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
    // Click on the roman numeral (tile body area, not the chord name button)
    fireEvent.click(screen.getByText("I"))
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

  it("renders data-selected=true when isSelected", () => {
    const onSelect = vi.fn()
    const { container } = render(<ChordTile {...baseProps} onSelect={onSelect} isSelected={true} />)
    // The inner tile div should have data-selected="true"
    const selectDiv = container.querySelector("[data-selected='true']")
    expect(selectDiv).not.toBeNull()
  })
})
