import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { SubstitutionsPanel } from "@/app/(app)/reference/_components/substitutions-panel"
import type { ChordSubstitution } from "@/lib/theory/types"

function makeSub(id: string, ruleName: string, label: string, sortRank = 10): ChordSubstitution {
  return {
    id,
    ruleName,
    label,
    effect: `Effect for ${label}`,
    result: { kind: "replacement", replacements: [{ index: 0, chord: { tonic: "E", type: "m7", roman: "iii", quality: "minor" } }] },
    sortRank,
  }
}

const subs: ChordSubstitution[] = [
  makeSub("diatonic-deg6", "Diatonic Substitution", "Am7",  10),
  makeSub("diatonic-deg3", "Diatonic Substitution", "Em7",  11),
  makeSub("tritone",        "Tritone Substitution",  "Db7",  20),
]

describe("SubstitutionsPanel", () => {
  it("renders the chord name heading", () => {
    render(<SubstitutionsPanel substitutions={subs} chordName="Cmaj7" previewedId={null} onPreview={vi.fn()} />)
    expect(screen.getByText(/substitutions for cmaj7/i)).toBeDefined()
  })

  it("renders rule group headings", () => {
    render(<SubstitutionsPanel substitutions={subs} chordName="Cmaj7" previewedId={null} onPreview={vi.fn()} />)
    expect(screen.getByText("Diatonic Substitution")).toBeDefined()
    expect(screen.getByText("Tritone Substitution")).toBeDefined()
  })

  it("renders all substitution labels", () => {
    render(<SubstitutionsPanel substitutions={subs} chordName="Cmaj7" previewedId={null} onPreview={vi.fn()} />)
    expect(screen.getByText("Am7")).toBeDefined()
    expect(screen.getByText("Em7")).toBeDefined()
    expect(screen.getByText("Db7")).toBeDefined()
  })

  it("calls onPreview with the sub when a row is clicked", () => {
    const onPreview = vi.fn()
    render(<SubstitutionsPanel substitutions={subs} chordName="Cmaj7" previewedId={null} onPreview={onPreview} />)
    fireEvent.click(screen.getByText("Am7"))
    expect(onPreview).toHaveBeenCalledWith(subs[0])
  })

  it("calls onPreview(null) when the active sub is clicked again (toggle off)", () => {
    const onPreview = vi.fn()
    render(<SubstitutionsPanel substitutions={subs} chordName="Cmaj7" previewedId="diatonic-deg6" onPreview={onPreview} />)
    fireEvent.click(screen.getByText("Am7"))
    expect(onPreview).toHaveBeenCalledWith(null)
  })

  it("shows empty message when no substitutions", () => {
    render(<SubstitutionsPanel substitutions={[]} chordName="Cmaj7" previewedId={null} onPreview={vi.fn()} />)
    expect(screen.getByText(/no substitutions available/i)).toBeDefined()
  })
})
