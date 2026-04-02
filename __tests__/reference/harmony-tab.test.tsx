import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// Mock tonal (used by SoloScalesPanel)
vi.mock("tonal", () => ({
  Scale: { get: () => ({ notes: ["G", "A", "B", "C", "D", "E", "F"] }) },
}))

// Mock theory engine
vi.mock("@/lib/theory", () => ({
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
    const buttons = screen.getAllByRole("button")
    expect(buttons.length).toBeGreaterThanOrEqual(7)
  })

  it("shows placeholder when no chord is selected", () => {
    render(<HarmonyTab tonic="C" />)
    expect(screen.getByText(/click a chord to see recommended scales/i)).toBeDefined()
  })

  it("shows solo scales panel when a chord is clicked", async () => {
    render(<HarmonyTab tonic="C" />)
    const gButton = screen.getAllByRole("button").find(
      (b) => b.textContent?.includes("G7") || b.textContent?.includes("G")
    )!
    await userEvent.click(gButton)
    expect(screen.getByText(/scales to solo over/i)).toBeDefined()
  })

  it("hides solo scales panel when same chord is clicked again (toggle)", async () => {
    render(<HarmonyTab tonic="C" />)
    const buttons = screen.getAllByRole("button")
    const g7Button = buttons[4] // degree 5 (G7), same index as the mode-change test
    await userEvent.click(g7Button)
    expect(screen.queryByText(/click a chord/i)).toBeNull()
    await userEvent.click(g7Button)
    expect(screen.getByText(/click a chord to see recommended scales/i)).toBeDefined()
  })

  it("clears selection when mode changes", async () => {
    render(<HarmonyTab tonic="C" />)
    const buttons = screen.getAllByRole("button")
    await userEvent.click(buttons[4]) // click V chord
    expect(screen.queryByText(/click a chord/i)).toBeNull()
    // Change mode
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /mode/i }), "dorian")
    expect(screen.getByText(/click a chord to see recommended scales/i)).toBeDefined()
  })
})
