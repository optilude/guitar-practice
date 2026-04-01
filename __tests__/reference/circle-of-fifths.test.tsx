import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CircleOfFifths } from "@/app/(app)/reference/_components/circle-of-fifths"

describe("CircleOfFifths", () => {
  it("renders all 12 major key labels", () => {
    render(<CircleOfFifths selectedKey="C" onKeySelect={vi.fn()} />)
    const keys = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"]
    for (const key of keys) {
      // Each key appears at least once (also in centre label for selected key)
      const elements = screen.getAllByText(key)
      expect(elements.length).toBeGreaterThanOrEqual(1)
    }
  })

  it("renders all 12 relative minor labels", () => {
    render(<CircleOfFifths selectedKey="C" onKeySelect={vi.fn()} />)
    const minors = ["Am", "Em", "Bm", "F#m", "C#m", "G#m", "D#m", "Bbm", "Fm", "Cm", "Gm", "Dm"]
    for (const minor of minors) {
      expect(screen.getByText(minor)).toBeDefined()
    }
  })

  it("shows the selected key in the centre label", () => {
    render(<CircleOfFifths selectedKey="G" onKeySelect={vi.fn()} />)
    // The centre text element has font-size 22 — find it among all 'G' text nodes
    // We test that 'G' appears at least twice: once in slice label, once in centre
    const elements = screen.getAllByText("G")
    expect(elements.length).toBeGreaterThanOrEqual(2)
  })

  it("calls onKeySelect with the correct tonic when a key is clicked", async () => {
    const onKeySelect = vi.fn()
    render(<CircleOfFifths selectedKey="C" onKeySelect={onKeySelect} />)
    const gButton = screen.getByRole("button", { name: /Select key G/i })
    await userEvent.click(gButton)
    expect(onKeySelect).toHaveBeenCalledWith("G")
  })

  it("calls onKeySelect when F# is clicked", async () => {
    const onKeySelect = vi.fn()
    render(<CircleOfFifths selectedKey="C" onKeySelect={onKeySelect} />)
    const fSharpButton = screen.getByRole("button", { name: /Select key F#/i })
    await userEvent.click(fSharpButton)
    expect(onKeySelect).toHaveBeenCalledWith("F#")
  })

  it("marks the selected key slice as aria-pressed=true", () => {
    render(<CircleOfFifths selectedKey="D" onKeySelect={vi.fn()} />)
    const dButton = screen.getByRole("button", { name: "Select key D" })
    expect(dButton).toHaveAttribute("aria-pressed", "true")
  })

  it("marks non-selected key slices as aria-pressed=false", () => {
    render(<CircleOfFifths selectedKey="D" onKeySelect={vi.fn()} />)
    const gButton = screen.getByRole("button", { name: "Select key G" })
    expect(gButton).toHaveAttribute("aria-pressed", "false")
  })
})
