import { describe, it, expect } from "vitest"
import { urlToCategory, slugToTitle } from "@/lib/seed-helpers"

describe("urlToCategory", () => {
  it("maps /technique/ prefix to technique", () => {
    expect(urlToCategory("https://hubguitar.com/technique/alternate-picking")).toBe("technique")
  })

  it("maps /rhythm/ prefix to technique", () => {
    expect(urlToCategory("https://hubguitar.com/rhythm/basic-strumming")).toBe("technique")
  })

  it("maps /fretboard/ prefix to fretboard-knowledge", () => {
    expect(urlToCategory("https://hubguitar.com/fretboard/five-pentatonic-patterns")).toBe("fretboard-knowledge")
  })

  it("maps /music-theory/ prefix to music-theory", () => {
    expect(urlToCategory("https://hubguitar.com/music-theory/circle-of-fifths")).toBe("music-theory")
  })

  it("maps /improvisation/ prefix to improvisation", () => {
    expect(urlToCategory("https://hubguitar.com/improvisation/blues-scale")).toBe("improvisation")
  })

  it("maps /ear-training/ prefix to ear-training", () => {
    expect(urlToCategory("https://hubguitar.com/ear-training/interval-recognition")).toBe("ear-training")
  })

  it("maps /sight-reading/ prefix to sight-reading", () => {
    expect(urlToCategory("https://hubguitar.com/sight-reading/treble-clef-basics")).toBe("sight-reading")
  })

  it("maps /pick/ prefix to songs", () => {
    expect(urlToCategory("https://hubguitar.com/pick/blue-bossa")).toBe("songs")
  })

  it("maps /fingerstyle/ prefix to songs", () => {
    expect(urlToCategory("https://hubguitar.com/fingerstyle/gymnopedie-no-1")).toBe("songs")
  })

  it("maps /songs/ prefix to songs", () => {
    expect(urlToCategory("https://hubguitar.com/songs/blackbird")).toBe("songs")
  })

  it("returns null for /boston/ prefix", () => {
    expect(urlToCategory("https://hubguitar.com/boston/gift-certificate")).toBeNull()
  })

  it("returns null for /articles/ prefix", () => {
    expect(urlToCategory("https://hubguitar.com/articles/how-long-to-learn-guitar")).toBeNull()
  })

  it("returns null for /recommended-products/ prefix", () => {
    expect(urlToCategory("https://hubguitar.com/recommended-products/all-reviews")).toBeNull()
  })

  it("returns null for root-level URLs with no second segment", () => {
    expect(urlToCategory("https://hubguitar.com/technique")).toBeNull()
  })
})

describe("slugToTitle", () => {
  it("converts a hyphenated slug to title case", () => {
    expect(slugToTitle("alternate-picking-exercise")).toBe("Alternate Picking Exercise")
  })

  it("handles a single-word slug", () => {
    expect(slugToTitle("blues")).toBe("Blues")
  })

  it("handles a slug with numbers", () => {
    expect(slugToTitle("gymnopedie-no-1")).toBe("Gymnopedie No 1")
  })
})
