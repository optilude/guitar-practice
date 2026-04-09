import { describe, it, expect, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// Mock AddToGoalButton to avoid next-auth import chain
vi.mock("@/components/add-to-goal-button", () => ({
  AddToGoalButton: () => null,
}))

vi.mock("@/lib/theory/user-progressions", () => ({
  getUserProgressionChords: () => [],
}))

vi.mock("tonal", () => ({
  Scale: { get: () => ({ notes: ["C", "D", "E", "F", "G", "A", "B"] }) },
}))

vi.mock("@/lib/theory", () => ({
  listProgressions: () => [
    {
      name: "pop-standard",
      displayName: "Pop Axis",
      category: "Pop",
      romanDisplay: "I – V – vi – IV",
      description: "The most widely used progression in modern pop",
      examples: "Let It Be, No Woman No Cry, With or Without You",
      notes: "The most widely used progression in modern pop.",
      degrees: ["I", "V", "vi", "IV"],
      mode: "ionian",
      recommendedScaleType: "Major Scale",
    },
    {
      name: "jazz-turnaround",
      displayName: "Jazz Turnaround",
      category: "Jazz",
      romanDisplay: "Imaj7 – VI7 – II7 – V7",
      description: "Secondary dominants create harmonic momentum",
      examples: "Rhythm Changes endings, many standard codas",
      notes: "Secondary dominants replace diatonic chords to create harmonic momentum.",
      degrees: ["I", "VI", "II", "V"],
      mode: "ionian",
      recommendedScaleType: "Major Scale",
    },
  ],
  getProgression: (_name: string, tonic: string) => [
    { roman: "I",  nashville: "1", tonic,  type: "maj7", quality: "major",    degree: 1 },
    { roman: "V",  nashville: "5", tonic: "G", type: "7",    quality: "dominant", degree: 5 },
    { roman: "vi", nashville: "6", tonic: "A", type: "m7",   quality: "minor",    degree: 6 },
    { roman: "IV", nashville: "4", tonic: "F", type: "maj7", quality: "major",    degree: 4 },
  ],
  getSoloScales: (_chord: unknown, _mode: string) => ({
    chordTonic: "G",
    primary: { scaleName: "Mixolydian" },
    additional: [{ scaleName: "Minor Pentatonic", hint: "bluesy" }],
  }),
  getSubstitutions: () => [],
  analyzeFunctionalContext: () => ({ romanOverride: null, scalesOverride: null }),
}))

import { ProgressionsTab } from "@/app/(app)/reference/_components/progressions-tab"

describe("ProgressionsTab", () => {
  it("renders the progression selector", () => {
    render(<ProgressionsTab tonic="C" userProgressions={[]} />)
    expect(screen.getByRole("combobox", { name: /progression/i })).toBeDefined()
  })

  it("renders chord blocks for the default progression", () => {
    render(<ProgressionsTab tonic="C" userProgressions={[]} />)
    // 4 chord buttons for pop-standard
    const buttons = screen.getAllByRole("button")
    expect(buttons.length).toBeGreaterThanOrEqual(4)
  })

  it("always shows the progression-wide scale recommendation", () => {
    render(<ProgressionsTab tonic="C" userProgressions={[]} />)
    expect(screen.getByText(/over the whole progression/i)).toBeDefined()
    expect(screen.getByText(/major scale/i)).toBeDefined()
  })

  it("shows per-chord scale panel by default (first chord pre-selected)", () => {
    render(<ProgressionsTab tonic="C" userProgressions={[]} />)
    expect(screen.getByText(/scales to solo over/i)).toBeDefined()
  })

  it("shows per-chord scale panel with Also works when chord is clicked", async () => {
    render(<ProgressionsTab tonic="C" userProgressions={[]} />)
    const chordGroup = screen.getByRole("group", { name: /progression chords/i })
    const chordButtons = within(chordGroup).getAllByRole("button")
    await userEvent.click(chordButtons[1]) // click second chord (G7)
    expect(screen.getByText(/scales to solo over/i)).toBeDefined()
    expect(screen.getByText(/also works/i)).toBeDefined()
    expect(screen.getByText(/minor pentatonic/i)).toBeDefined()
  })

  it("hides per-chord panel when same chord is clicked again", async () => {
    render(<ProgressionsTab tonic="C" userProgressions={[]} />)
    const chordGroup = screen.getByRole("group", { name: /progression chords/i })
    const chordButtons = within(chordGroup).getAllByRole("button")
    await userEvent.click(chordButtons[1]) // select second chord
    expect(screen.getByText(/scales to solo over/i)).toBeDefined()
    await userEvent.click(chordButtons[1]) // deselect
    expect(screen.queryByText(/scales to solo over/i)).toBeNull()
  })

  it("resets to first chord when progression changes", async () => {
    render(<ProgressionsTab tonic="C" userProgressions={[]} />)
    const chordGroup = screen.getByRole("group", { name: /progression chords/i })
    const chordButtons = within(chordGroup).getAllByRole("button")
    await userEvent.click(chordButtons[1]) // select chord at index 1
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /progression/i }),
      "jazz-turnaround"
    )
    // Resets to index 0 of new progression — scales panel still visible
    expect(screen.getByText(/scales to solo over/i)).toBeDefined()
  })

  it("shows Soloing and Substitutions tabs when a chord is selected", () => {
    render(<ProgressionsTab tonic="C" userProgressions={[]} />)
    // First chord is auto-selected on mount; tabs should be visible
    expect(screen.getByRole("button", { name: /^soloing$/i })).toBeDefined()
    expect(screen.getByRole("button", { name: /^substitutions$/i })).toBeDefined()
  })

  it("does not show tabs when no chord is selected", async () => {
    render(<ProgressionsTab tonic="C" userProgressions={[]} />)
    // The first chord is auto-selected; click it to deselect
    const chordGroup = screen.getByRole("group", { name: /progression chords/i })
    const chordButtons = within(chordGroup).getAllByRole("button")
    await userEvent.click(chordButtons[0]!)
    expect(screen.queryByRole("button", { name: /^soloing$/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /^substitutions$/i })).toBeNull()
  })

  it("switches to Substitutions tab on click", async () => {
    render(<ProgressionsTab tonic="C" userProgressions={[]} />)
    await userEvent.click(screen.getByRole("button", { name: /^substitutions$/i }))
    // SubstitutionsPanel heading should appear (empty state since mock returns [])
    expect(screen.getByText(/no substitutions available/i)).toBeDefined()
  })
})
