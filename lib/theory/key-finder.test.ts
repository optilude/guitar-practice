import { describe, it, expect } from "vitest"
import { parseChord, normalizeQuality } from "./key-finder"

describe("parseChord", () => {
  it("parses a minor 7th chord", () => {
    expect(parseChord("Cm7")).toEqual({ root: "C", type: "m7", symbol: "Cm7" })
  })

  it("parses a major triad (empty suffix)", () => {
    const result = parseChord("G")
    expect(result).not.toBeNull()
    expect(result!.root).toBe("G")
    expect(result!.symbol).toBe("G")
  })

  it("parses a flat root", () => {
    const result = parseChord("BbMaj7")
    expect(result).not.toBeNull()
    expect(result!.root).toBe("Bb")
  })

  it("returns null for an unrecognised symbol", () => {
    expect(parseChord("xyz")).toBeNull()
    expect(parseChord("")).toBeNull()
  })
})

describe("normalizeQuality", () => {
  it("maps empty string to 'major'", () => {
    expect(normalizeQuality("")).toBe("major")
  })
  it("maps '9' to 'major'", () => {
    expect(normalizeQuality("9")).toBe("major")
  })
  it("maps 'maj9' to 'major'", () => {
    expect(normalizeQuality("maj9")).toBe("major")
  })
  it("maps 'm7' to 'minor'", () => {
    expect(normalizeQuality("m7")).toBe("minor")
  })
  it("maps 'm7b5' to 'half-dim'", () => {
    expect(normalizeQuality("m7b5")).toBe("half-dim")
  })
  it("maps '6/9' to 'major'", () => {
    expect(normalizeQuality("6/9")).toBe("major")
  })
  it("maps 'dim7' to 'dim'", () => {
    expect(normalizeQuality("dim7")).toBe("dim")
  })
  it("maps 'aug' to 'aug'", () => {
    expect(normalizeQuality("aug")).toBe("aug")
  })
  it("maps 'sus4' to 'sus'", () => {
    expect(normalizeQuality("sus4")).toBe("sus")
  })
  it("falls back to 'major' for unknown types", () => {
    expect(normalizeQuality("unknowntype")).toBe("major")
  })
})
