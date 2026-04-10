import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { SubstitutionsPanel } from "@/app/(app)/reference/_components/substitutions-panel"
import type { ChordSubstitution } from "@/lib/theory/types"

const mockSub: ChordSubstitution = {
  id: "diatonic-deg6",
  ruleName: "Diatonic Substitution",
  label: "Am7",
  effect: "vi — parallel function",
  result: { kind: "replacement", replacements: [{ index: 0, chord: { tonic: "A", type: "m7", roman: "vi", quality: "minor", degree: 6 } }] },
  sortRank: 10,
}

describe("SubstitutionsPanel — core rendering and interaction", () => {
  it("renders the chord name heading", () => {
    render(
      <SubstitutionsPanel
        substitutions={[mockSub]}
        chordName="Cmaj7"
        previewedId={null}
        onPreview={vi.fn()}
      />
    )
    expect(screen.getByText(/Cmaj7/)).toBeInTheDocument()
  })

  it("renders rule group headings", () => {
    render(
      <SubstitutionsPanel
        substitutions={[mockSub]}
        chordName="Cmaj7"
        previewedId={null}
        onPreview={vi.fn()}
      />
    )
    expect(screen.getByText("Diatonic Substitution")).toBeInTheDocument()
  })

  it("renders all substitution labels", () => {
    render(
      <SubstitutionsPanel
        substitutions={[mockSub]}
        chordName="Cmaj7"
        previewedId={null}
        onPreview={vi.fn()}
      />
    )
    expect(screen.getByText("Am7")).toBeInTheDocument()
  })

  it("calls onPreview with the sub when a row is clicked", () => {
    const onPreview = vi.fn()
    render(
      <SubstitutionsPanel
        substitutions={[mockSub]}
        chordName="Cmaj7"
        previewedId={null}
        onPreview={onPreview}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /Am7/ }))
    expect(onPreview).toHaveBeenCalledWith(mockSub)
  })

  it("calls onPreview(null) when the active sub is clicked again (toggle off)", () => {
    const onPreview = vi.fn()
    render(
      <SubstitutionsPanel
        substitutions={[mockSub]}
        chordName="Cmaj7"
        previewedId="diatonic-deg6"
        onPreview={onPreview}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /Am7/ }))
    expect(onPreview).toHaveBeenCalledWith(null)
  })

  it("shows empty message when no substitutions", () => {
    render(
      <SubstitutionsPanel
        substitutions={[]}
        chordName="Cmaj7"
        previewedId={null}
        onPreview={vi.fn()}
      />
    )
    expect(screen.getByText(/No substitutions available for Cmaj7/)).toBeInTheDocument()
  })
})

describe("SubstitutionsPanel — Apply button", () => {
  it("shows Apply button when a substitution is active and onApply is provided", () => {
    render(
      <SubstitutionsPanel
        substitutions={[mockSub]}
        chordName="Cmaj7"
        previewedId="diatonic-deg6"
        onPreview={vi.fn()}
        onApply={vi.fn()}
      />
    )
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument()
  })

  it("does not show Apply button when substitution is not active", () => {
    render(
      <SubstitutionsPanel
        substitutions={[mockSub]}
        chordName="Cmaj7"
        previewedId={null}
        onPreview={vi.fn()}
        onApply={vi.fn()}
      />
    )
    expect(screen.queryByRole("button", { name: "Apply" })).not.toBeInTheDocument()
  })

  it("clicking Apply calls onApply with the substitution", () => {
    const onApply = vi.fn()
    render(
      <SubstitutionsPanel
        substitutions={[mockSub]}
        chordName="Cmaj7"
        previewedId="diatonic-deg6"
        onPreview={vi.fn()}
        onApply={onApply}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Apply" }))
    expect(onApply).toHaveBeenCalledWith(mockSub)
  })

  it("clicking Apply does not toggle the preview off", () => {
    const onPreview = vi.fn()
    render(
      <SubstitutionsPanel
        substitutions={[mockSub]}
        chordName="Cmaj7"
        previewedId="diatonic-deg6"
        onPreview={onPreview}
        onApply={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Apply" }))
    expect(onPreview).not.toHaveBeenCalled()
  })
})
