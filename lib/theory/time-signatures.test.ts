import { describe, it, expect } from "vitest"
import { TIME_SIGNATURES, DEFAULT_BEATS_PER_BAR } from "./time-signatures"

describe("TIME_SIGNATURES", () => {
  it("has 8 entries", () => {
    expect(TIME_SIGNATURES).toHaveLength(8)
  })

  it("includes 4/4 with 4 beats", () => {
    const fourFour = TIME_SIGNATURES.find(s => s.label === "4/4")
    expect(fourFour).toBeDefined()
    expect(fourFour!.beats).toBe(4)
  })

  it("includes 6/8 with 6 beats", () => {
    const sixEight = TIME_SIGNATURES.find(s => s.label === "6/8")
    expect(sixEight).toBeDefined()
    expect(sixEight!.beats).toBe(6)
  })

  it("includes 12/8 with 12 beats", () => {
    const twelveEight = TIME_SIGNATURES.find(s => s.label === "12/8")
    expect(twelveEight).toBeDefined()
    expect(twelveEight!.beats).toBe(12)
  })
})

describe("DEFAULT_BEATS_PER_BAR", () => {
  it("is 4", () => {
    expect(DEFAULT_BEATS_PER_BAR).toBe(4)
  })
})
