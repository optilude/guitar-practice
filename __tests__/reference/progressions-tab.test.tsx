import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("tonal", () => ({
  Scale: { get: () => ({ notes: ["C", "D", "E", "F", "G", "A", "B"] }) },
}))

vi.mock("@/lib/theory", () => ({
  listProgressions: () => [
    {
      name: "pop-standard",
      displayName: "Pop Standard",
      romanDisplay: "I – V – vi – IV",
      description: "The most common pop progression",
      degrees: ["I", "V", "vi", "IV"],
      mode: "ionian",
      recommendedScaleType: "Major Scale",
    },
    {
      name: "jazz-turnaround",
      displayName: "Jazz Turnaround",
      romanDisplay: "ii – V – I",
      description: "The most important cadence in jazz",
      degrees: ["ii", "V", "I"],
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
}))

import { ProgressionsTab } from "@/app/(app)/reference/_components/progressions-tab"

describe("ProgressionsTab", () => {
  it("renders the progression selector", () => {
    render(<ProgressionsTab tonic="C" />)
    expect(screen.getByRole("combobox", { name: /progression/i })).toBeDefined()
  })

  it("renders chord blocks for the default progression", () => {
    render(<ProgressionsTab tonic="C" />)
    // 4 chord buttons for pop-standard
    const buttons = screen.getAllByRole("button")
    expect(buttons.length).toBeGreaterThanOrEqual(4)
  })

  it("always shows the progression-wide scale recommendation", () => {
    render(<ProgressionsTab tonic="C" />)
    expect(screen.getByText(/over the whole progression/i)).toBeDefined()
    expect(screen.getByText(/major scale/i)).toBeDefined()
  })

  it("shows per-chord scale panel with Also works when chord is clicked", async () => {
    render(<ProgressionsTab tonic="C" />)
    const buttons = screen.getAllByRole("button")
    await userEvent.click(buttons[1]) // click second chord (G7)
    expect(screen.getByText(/scales to solo over/i)).toBeDefined()
    expect(screen.getByText(/also works/i)).toBeDefined()
    expect(screen.getByText(/minor pentatonic/i)).toBeDefined()
  })

  it("hides per-chord panel when same chord is clicked again", async () => {
    render(<ProgressionsTab tonic="C" />)
    const buttons = screen.getAllByRole("button")
    await userEvent.click(buttons[1])
    expect(screen.queryByText(/click a chord/i)).toBeNull()
    await userEvent.click(buttons[1])
    expect(screen.getByText(/click a chord to see recommended scales/i)).toBeDefined()
  })

  it("clears selection when progression changes", async () => {
    render(<ProgressionsTab tonic="C" />)
    const buttons = screen.getAllByRole("button")
    await userEvent.click(buttons[1])
    expect(screen.queryByText(/click a chord/i)).toBeNull()
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /progression/i }),
      "jazz-turnaround"
    )
    expect(screen.getByText(/click a chord to see recommended scales/i)).toBeDefined()
  })
})
