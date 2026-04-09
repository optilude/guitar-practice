import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// Mock AddToGoalButton to avoid next-auth import chain
vi.mock("@/components/add-to-goal-button", () => ({
  AddToGoalButton: () => null,
}))

vi.mock("tonal", () => ({
  Scale: { get: () => ({ notes: ["C", "D", "E", "F", "G", "A", "B"] }) },
}))

vi.mock("@/lib/theory", () => ({
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
  ],
  getProgression: (_name: string, tonic: string) => [
    { roman: "I", nashville: "1", tonic, type: "maj7", quality: "major", degree: 1 },
    { roman: "V", nashville: "5", tonic: "G", type: "7", quality: "dominant", degree: 5 },
  ],
}))

import { HarmonyStudy } from "@/app/(app)/reference/_components/harmony-study"

describe("HarmonyStudy", () => {
  it("renders Modes and Progressions tab buttons", () => {
    render(<HarmonyStudy tonic="C" userProgressions={[]} />)
    expect(screen.getByRole("tab", { name: "Modes" })).toBeDefined()
    expect(screen.getByRole("tab", { name: "Progressions" })).toBeDefined()
  })

  it("defaults to Modes tab active", () => {
    render(<HarmonyStudy tonic="C" userProgressions={[]} />)
    const harmonyTab = screen.getByRole("tab", { name: "Modes" })
    expect(harmonyTab).toHaveAttribute("aria-selected", "true")
  })

  it("Progressions tab is not selected by default", () => {
    render(<HarmonyStudy tonic="C" userProgressions={[]} />)
    const progressionsTab = screen.getByRole("tab", { name: "Progressions" })
    expect(progressionsTab).toHaveAttribute("aria-selected", "false")
  })

  it("clicking Progressions tab shows progressions content", async () => {
    render(<HarmonyStudy tonic="C" userProgressions={[]} />)
    await userEvent.click(screen.getByRole("tab", { name: "Progressions" }))
    expect(screen.getByRole("tab", { name: "Progressions" })).toHaveAttribute("aria-selected", "true")
    // ProgressionsTab shows a progression selector
    expect(screen.getByRole("combobox", { name: /progression/i })).toBeDefined()
  })

  it("clicking Modes tab after Progressions returns to modes content", async () => {
    render(<HarmonyStudy tonic="C" userProgressions={[]} />)
    await userEvent.click(screen.getByRole("tab", { name: "Progressions" }))
    await userEvent.click(screen.getByRole("tab", { name: "Modes" }))
    expect(screen.getByRole("tab", { name: "Modes" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("combobox", { name: /mode/i })).toBeDefined()
  })
})
