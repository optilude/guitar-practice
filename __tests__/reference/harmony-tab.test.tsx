import { describe, it, expect, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// Mock AddToGoalButton to avoid next-auth import chain
vi.mock("@/components/add-to-goal-button", () => ({
  AddToGoalButton: () => null,
}))

// Mock tonal (used by SoloScalesPanel)
vi.mock("tonal", () => ({
  Scale: { get: () => ({ notes: ["G", "A", "B", "C", "D", "E", "F"] }) },
  Note: { transpose: () => "Bb" },
}))

// Mock theory engine
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
    { degree: 1, roman: "I",    tonic: "C", type: "maj7", quality: "major",     nashville: "1" },
    { degree: 2, roman: "ii",   tonic: "D", type: "m7",   quality: "minor",     nashville: "2" },
    { degree: 3, roman: "iii",  tonic: "E", type: "m7",   quality: "minor",     nashville: "3" },
    { degree: 4, roman: "IV",   tonic: "F", type: "maj7", quality: "major",     nashville: "4" },
    { degree: 5, roman: "V",    tonic: "G", type: "7",    quality: "dominant",  nashville: "5" },
    { degree: 6, roman: "vi",   tonic: "A", type: "m7",   quality: "minor",     nashville: "6" },
    { degree: 7, roman: "vii°", tonic: "B", type: "m7b5", quality: "diminished",nashville: "7" },
  ],
  getSoloScales: () => ({
    chordTonic: "G",
    primary: { scaleName: "Mixolydian" },
    additional: [
      { scaleName: "Minor Pentatonic", hint: "bluesy" },
      { scaleName: "Blues Scale", hint: "adds ♭5 colour" },
    ],
  }),
  getSubstitutions: () => [],
}))

import { HarmonyTab } from "@/app/(app)/reference/_components/harmony-tab"

describe("HarmonyTab", () => {
  it("renders mode selector defaulting to Ionian (major)", () => {
    render(<HarmonyTab tonic="C" />)
    expect(screen.getByRole("combobox", { name: /mode/i })).toBeDefined()
    expect((screen.getByRole("combobox", { name: /mode/i }) as HTMLSelectElement).value).toBe("ionian")
  })

  it("renders 7 chord blocks", () => {
    render(<HarmonyTab tonic="C" />)
    const chordGroup = screen.getByRole("group", { name: /diatonic chords/i })
    const buttons = within(chordGroup).getAllByRole("button")
    expect(buttons.length).toBe(7)
  })

  it("shows Soloing and Substitutions tabs when a chord is selected (first chord auto-selected)", () => {
    render(<HarmonyTab tonic="C" />)
    expect(screen.getByRole("button", { name: /^soloing$/i })).toBeDefined()
    expect(screen.getByRole("button", { name: /^substitutions$/i })).toBeDefined()
  })

  it("does not show tabs when no chord is selected", async () => {
    render(<HarmonyTab tonic="C" />)
    const chordGroup = screen.getByRole("group", { name: /diatonic chords/i })
    const buttons = within(chordGroup).getAllByRole("button")
    await userEvent.click(buttons[0]!) // deselect the auto-selected I chord
    expect(screen.queryByRole("button", { name: /^soloing$/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /^substitutions$/i })).toBeNull()
  })

  it("shows solo scales panel by default (I chord pre-selected)", () => {
    render(<HarmonyTab tonic="C" />)
    expect(screen.getByText(/scales to solo over/i)).toBeDefined()
  })

  it("shows solo scales panel when a chord is clicked", async () => {
    render(<HarmonyTab tonic="C" />)
    const chordGroup = screen.getByRole("group", { name: /diatonic chords/i })
    const buttons = within(chordGroup).getAllByRole("button")
    await userEvent.click(buttons[4]) // degree 5 (G7)
    expect(screen.getByText(/scales to solo over/i)).toBeDefined()
  })

  it("hides solo scales panel when same chord is clicked again (toggle)", async () => {
    render(<HarmonyTab tonic="C" />)
    const chordGroup = screen.getByRole("group", { name: /diatonic chords/i })
    const buttons = within(chordGroup).getAllByRole("button")
    await userEvent.click(buttons[4]) // select G7 (degree 5)
    expect(screen.getByText(/scales to solo over/i)).toBeDefined()
    await userEvent.click(buttons[4]) // deselect
    expect(screen.queryByText(/scales to solo over/i)).toBeNull()
  })

  it("resets to I chord when mode changes", async () => {
    render(<HarmonyTab tonic="C" />)
    const chordGroup = screen.getByRole("group", { name: /diatonic chords/i })
    const buttons = within(chordGroup).getAllByRole("button")
    await userEvent.click(buttons[4]) // click V chord
    // Change mode → resets to degree 1, scales panel still visible
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /mode/i }), "dorian")
    expect(screen.getByText(/scales to solo over/i)).toBeDefined()
  })

  it("switches to Substitutions tab on click shows empty state", async () => {
    render(<HarmonyTab tonic="C" />)
    await userEvent.click(screen.getByRole("button", { name: /^substitutions$/i }))
    expect(screen.getByText(/no substitutions available/i)).toBeDefined()
  })
})
