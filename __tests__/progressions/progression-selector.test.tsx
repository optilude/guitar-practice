import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ProgressionSelector } from "@/app/(app)/progressions/_components/progression-selector"

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
  getProgression: () => [],
}))

vi.mock("@/components/add-to-goal-button", () => ({
  AddToGoalButton: () => <button>+</button>,
}))

const baseProps = {
  selected: "pop-standard",
  tonic: "C",
  userProgressions: [],
  onSelectionChange: vi.fn(),
  onEditMeta: vi.fn(),
}

describe("ProgressionSelector", () => {
  it("renders dropdown with progression option", () => {
    render(<ProgressionSelector {...baseProps} />)
    expect(screen.getByRole("combobox", { name: /progression/i })).toBeInTheDocument()
    expect(screen.getByText(/Pop Axis/)).toBeInTheDocument()
  })

  it("does not show My Progressions optgroup when no user progressions", () => {
    render(<ProgressionSelector {...baseProps} />)
    expect(screen.queryByText("My Progressions")).not.toBeInTheDocument()
  })

  it("shows My Progressions optgroup when user has progressions", () => {
    render(
      <ProgressionSelector
        {...baseProps}
        userProgressions={[{ id: "u1", displayName: "My Blues", mode: "major", degrees: ["I", "IV"], description: "" }]}
      />
    )
    expect(screen.getByText("My Progressions")).toBeInTheDocument()
    expect(screen.getByText("My Blues")).toBeInTheDocument()
  })

  it("calls onSelectionChange when dropdown changes", () => {
    const onSelectionChange = vi.fn()
    render(<ProgressionSelector {...baseProps} onSelectionChange={onSelectionChange} />)
    fireEvent.change(screen.getByRole("combobox", { name: /progression/i }), { target: { value: "pop-standard" } })
    expect(onSelectionChange).toHaveBeenCalledWith("pop-standard")
  })

  it("does not show pencil button for built-in progression", () => {
    render(<ProgressionSelector {...baseProps} selected="pop-standard" />)
    expect(screen.queryByRole("button", { name: /edit progression/i })).not.toBeInTheDocument()
  })

  it("shows pencil button for custom progression", () => {
    render(
      <ProgressionSelector
        {...baseProps}
        selected="u1"
        userProgressions={[{ id: "u1", displayName: "My Blues", mode: "major", degrees: ["I", "IV"], description: "" }]}
      />
    )
    expect(screen.getByRole("button", { name: /edit progression/i })).toBeInTheDocument()
  })

  it("calls onEditMeta when pencil clicked", () => {
    const onEditMeta = vi.fn()
    render(
      <ProgressionSelector
        {...baseProps}
        selected="u1"
        onEditMeta={onEditMeta}
        userProgressions={[{ id: "u1", displayName: "My Blues", mode: "major", degrees: ["I", "IV"], description: "" }]}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /edit progression/i }))
    expect(onEditMeta).toHaveBeenCalled()
  })

  it("shows info popover when ? button clicked", () => {
    render(<ProgressionSelector {...baseProps} />)
    fireEvent.click(screen.getByRole("button", { name: /progression info/i }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("closes info popover when ? button clicked again", () => {
    render(<ProgressionSelector {...baseProps} />)
    fireEvent.click(screen.getByRole("button", { name: /progression info/i }))
    fireEvent.click(screen.getByRole("button", { name: /progression info/i }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
