import { detectChords } from "@/lib/theory/chord-finder"

// Open-string chroma reference: [4,9,2,7,11,4] = low-E, A, D, G, B, high-e
// Index 0=low-E(str6), 5=high-e(str1)

describe("detectChords", () => {
  it("returns empty array when all strings are muted", () => {
    expect(detectChords([null, null, null, null, null, null])).toEqual([])
  })

  it("detects C major from x-3-2-0-1-0 shape", () => {
    // str5(A):3→C, str4(D):2→E, str3(G):0→G, str2(B):1→C, str1(e):0→E
    const frets = [null, 3, 2, 0, 1, 0]
    const results = detectChords(frets)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].root).toBe("C")
    expect(results[0].isRootPosition).toBe(true)
  })

  it("detects Am from x-0-2-2-1-0 shape", () => {
    // str5(A):0→A, str4(D):2→E, str3(G):2→A, str2(B):1→C, str1(e):0→E
    const frets = [null, 0, 2, 2, 1, 0]
    const results = detectChords(frets)
    expect(results.length).toBeGreaterThan(0)
    const am = results.find(r => r.root === "A" && r.quality === "m")
    expect(am).toBeDefined()
    expect(am!.isRootPosition).toBe(true)
  })

  it("uses flat-preferred note names (Bb not A#)", () => {
    // str3(G): fret 3 → chroma (7+3)%12=10 → should be "Bb" not "A#"
    const frets = [null, null, null, 3, null, null]
    const results = detectChords(frets)
    const allSymbols = results.map(r => r.symbol).join(" ")
    expect(allSymbols).not.toMatch(/A#/)
  })

  it("places root-position chords before inversions", () => {
    // G major open: 3-2-0-0-3-3
    // str6(E):3→G, str5(A):2→B, str4(D):0→D, str3(G):0→G, str2(B):3→D, str1(e):3→G
    const frets = [3, 2, 0, 0, 3, 3]
    const results = detectChords(frets)
    expect(results.length).toBeGreaterThan(0)
    // First result should be root position
    expect(results[0].isRootPosition).toBe(true)
    // All root-position results should come before any inversions
    const firstInversionIdx = results.findIndex(r => !r.isRootPosition)
    const lastRootPositionIdx = results.map(r => r.isRootPosition).lastIndexOf(true)
    if (firstInversionIdx !== -1 && lastRootPositionIdx !== -1) {
      expect(lastRootPositionIdx).toBeLessThan(firstInversionIdx)
    }
  })

  it("places triads before seventh chords among same inversion type", () => {
    // A major: x-0-2-2-2-0
    // str5(A):0→A, str4(D):2→E, str3(G):2→A, str2(B):2→Db(C#), str1(e):0→E
    const frets = [null, 0, 2, 2, 2, 0]
    const results = detectChords(frets)
    const aTriadIdx = results.findIndex(r => r.root === "A" && (r.quality === "M" || r.quality === "" || r.quality === "maj"))
    const aSeventhIdx = results.findIndex(r => r.root === "A" && /7/.test(r.quality))
    if (aTriadIdx !== -1 && aSeventhIdx !== -1) {
      expect(aTriadIdx).toBeLessThan(aSeventhIdx)
    }
  })

  it("adds degreeLabel when both key and scaleType are provided", () => {
    // Em open: 0-2-2-0-0-0 — diatonic to C major (iii chord, E is 3rd degree)
    const frets = [0, 2, 2, 0, 0, 0]
    const results = detectChords(frets, { key: "C", scaleType: "Major" })
    expect(results.length).toBeGreaterThan(0)
    const em = results.find(r => r.root === "E" && r.quality === "m")
    expect(em?.degreeLabel).toBe("iii")
  })

  it("filters out non-diatonic chords when key+scale active", () => {
    // Em open: 0-2-2-0-0-0 — notes E, B, G
    // In C major (E G B = vi). But if we set key=F# major, E minor is not diatonic.
    const frets = [0, 2, 2, 0, 0, 0]
    const inCMajor = detectChords(frets, { key: "C", scaleType: "Major" })
    const inFSharpMajor = detectChords(frets, { key: "F#", scaleType: "Major" })
    // F# major notes: F#, G#, A#, B, C#, D#, E# — E natural is not in F# major
    expect(inFSharpMajor.length).toBeLessThan(inCMajor.length)
  })

  it("does not filter when only key is provided (no scaleType)", () => {
    const frets = [null, 0, 2, 2, 1, 0]
    const unfiltered = detectChords(frets)
    const withKeyOnly = detectChords(frets, { key: "C" })
    expect(withKeyOnly.length).toBe(unfiltered.length)
  })

  it("does not filter when only scaleType is provided (no key)", () => {
    const frets = [null, 0, 2, 2, 1, 0]
    const unfiltered = detectChords(frets)
    const withScaleOnly = detectChords(frets, { scaleType: "Major" })
    expect(withScaleOnly.length).toBe(unfiltered.length)
  })
})
