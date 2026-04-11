import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

// Mock AddToGoalButton to avoid next-auth import chain
vi.mock("@/components/add-to-goal-button", () => ({
  AddToGoalButton: () => null,
}))

vi.mock("tonal", () => ({
  Scale: { get: () => ({ notes: ["C", "D", "E", "F", "G", "A", "B"] }) },
}))

vi.mock("@/lib/theory/key-finder", () => ({
  parseChord: (symbol: string) => ({ root: "C", type: "", symbol }),
  analyzeChordInKey: () => ({ degree: 1, roman: "I", score: 1.0, role: "diatonic", inputChord: { root: "C", type: "", symbol: "C" } }),
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
  getSubstitutions: () => [],
  analyzeFunctionalContext: () => ({ romanOverride: null, scalesOverride: null }),
}))

import { HarmonyStudy } from "@/app/(app)/reference/_components/harmony-study"

describe("HarmonyStudy", () => {
  it("renders the mode selector combobox", () => {
    render(<HarmonyStudy tonic="C" />)
    expect(screen.getByRole("combobox", { name: /mode/i })).toBeDefined()
  })

  it("renders diatonic chords for the given tonic", () => {
    render(<HarmonyStudy tonic="C" />)
    expect(screen.getByText("I")).toBeDefined()
  })
})
