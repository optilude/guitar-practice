// @vitest-environment node
import { describe, it, expect } from "vitest"
import { computeStreak, resolveKeySequence } from "./sessions"
import type { SessionTopic } from "./sessions"

// ── computeStreak ──────────────────────────────────────────────────────────────

describe("computeStreak", () => {
  const today = new Date()
  function d(daysAgo: number): string {
    const dt = new Date(today)
    dt.setDate(dt.getDate() - daysAgo)
    return dt.toISOString().slice(0, 10)
  }

  it("returns 0 for empty array", () => {
    expect(computeStreak([])).toBe(0)
  })

  it("returns 1 if only today has a session", () => {
    expect(computeStreak([d(0)])).toBe(1)
  })

  it("returns 1 if only yesterday has a session (today not yet broken)", () => {
    expect(computeStreak([d(1)])).toBe(1)
  })

  it("returns 0 if most recent session is 2+ days ago", () => {
    expect(computeStreak([d(2)])).toBe(0)
  })

  it("counts consecutive days ending today", () => {
    expect(computeStreak([d(0), d(1), d(2), d(3)])).toBe(4)
  })

  it("counts consecutive days ending yesterday when today is missing", () => {
    expect(computeStreak([d(1), d(2), d(3)])).toBe(3)
  })

  it("stops at the first gap", () => {
    expect(computeStreak([d(0), d(1), d(3), d(4)])).toBe(2)
  })

  it("handles duplicate dates", () => {
    expect(computeStreak([d(0), d(0), d(1)])).toBe(2)
  })
})

// ── resolveKeySequence ─────────────────────────────────────────────────────────

function topic(overrides: Partial<SessionTopic> = {}): SessionTopic {
  return {
    kind: "scale",
    subtype: "major",
    displayName: "C major scale",
    defaultKey: "C",
    keys: [],
    practiceMode: null,
    lessonUrl: null,
    ...overrides,
  }
}

describe("resolveKeySequence", () => {
  it("returns [defaultKey] when keys is empty", () => {
    expect(resolveKeySequence(topic({ keys: [], defaultKey: "G" }))).toEqual(["G"])
  })

  it("returns [defaultKey] when keys is [defaultKey]", () => {
    expect(resolveKeySequence(topic({ keys: ["G"], defaultKey: "G" }))).toEqual(["G"])
  })

  it("falls back to C when defaultKey is null and keys is empty", () => {
    expect(resolveKeySequence(topic({ keys: [], defaultKey: null }))).toEqual(["C"])
  })

  it("returns explicit key list unchanged", () => {
    const t = topic({ keys: ["C", "F", "G"], defaultKey: "C" })
    expect(resolveKeySequence(t)).toEqual(["C", "F", "G"])
  })

  it("returns [''] for lesson topics regardless of keys", () => {
    const t = topic({ kind: "lesson", keys: ["*"], defaultKey: "C" })
    expect(resolveKeySequence(t)).toEqual([""])
  })

  it("chromatic_asc: 12 keys starting from defaultKey", () => {
    const t = topic({ keys: ["*"], defaultKey: "G", practiceMode: "chromatic_asc" })
    const result = resolveKeySequence(t)
    expect(result).toHaveLength(12)
    expect(result[0]).toBe("G")
    expect(result[1]).toBe("Ab")
    expect(result[11]).toBe("F#")
  })

  it("chromatic_desc: 12 keys descending from defaultKey", () => {
    const t = topic({ keys: ["*"], defaultKey: "G", practiceMode: "chromatic_desc" })
    const result = resolveKeySequence(t)
    expect(result).toHaveLength(12)
    expect(result[0]).toBe("G")
    expect(result[1]).toBe("F#")
  })

  it("circle_fifths_asc: 12 keys starting from defaultKey", () => {
    const t = topic({ keys: ["*"], defaultKey: "G", practiceMode: "circle_fifths_asc" })
    const result = resolveKeySequence(t)
    expect(result).toHaveLength(12)
    expect(result[0]).toBe("G")
    // G D A E B F# C# Ab Eb Bb F C
    expect(result[1]).toBe("D")
  })

  it("random: returns 12 unique chromatic keys", () => {
    const t = topic({ keys: ["*"], defaultKey: "C", practiceMode: "random" })
    const result = resolveKeySequence(t)
    expect(result).toHaveLength(12)
    expect(new Set(result).size).toBe(12)
  })
})
