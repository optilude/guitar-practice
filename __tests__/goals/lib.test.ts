import { describe, it, expect } from "vitest"
import { computeRefKey, formatTopicName } from "@/lib/goals"

describe("computeRefKey", () => {
  it("generates a lesson key from lessonId", () => {
    expect(computeRefKey({ kind: "lesson", lessonId: "abc123" })).toBe("lesson:abc123")
  })

  it("generates a reference key from kind, subtype, and defaultKey", () => {
    expect(computeRefKey({ kind: "scale", subtype: "major", defaultKey: "C" })).toBe("scale:major:C")
  })

  it("handles missing optional fields with empty strings", () => {
    expect(computeRefKey({ kind: "scale" })).toBe("scale::")
  })

  it("handles null optional fields", () => {
    expect(computeRefKey({ kind: "chord", subtype: null, defaultKey: null })).toBe("chord::")
  })

  it("returns user_lesson:{id} for personal lessons", () => {
    expect(computeRefKey({ kind: "lesson", userLessonId: "ul-abc" })).toBe("user_lesson:ul-abc")
  })

  it("prefers userLessonId over lessonId when both are provided", () => {
    expect(computeRefKey({ kind: "lesson", userLessonId: "ul-abc", lessonId: "xyz" })).toBe("user_lesson:ul-abc")
  })
})

describe("formatTopicName", () => {
  it("formats lesson topics using the lesson title", () => {
    const topic = { kind: "lesson" as const, subtype: null, defaultKey: null, lesson: { title: "Let It Be" } }
    expect(formatTopicName(topic)).toBe("Let It Be")
  })

  it("returns Unknown lesson when lesson title is missing", () => {
    const topic = { kind: "lesson" as const, subtype: null, defaultKey: null, lesson: null }
    expect(formatTopicName(topic)).toBe("Unknown lesson")
  })

  it("formats scale topics", () => {
    const topic = { kind: "scale" as const, subtype: "major", defaultKey: "C", lesson: null }
    expect(formatTopicName(topic)).toBe("C major scale")
  })

  it("formats chord topics (no space between key and type)", () => {
    const topic = { kind: "chord" as const, subtype: "m7", defaultKey: "A", lesson: null }
    expect(formatTopicName(topic)).toBe("Am7 chord")
  })

  it("formats triad topics", () => {
    const topic = { kind: "triad" as const, subtype: "minor", defaultKey: "E", lesson: null }
    expect(formatTopicName(topic)).toBe("E minor triad")
  })

  it("formats arpeggio topics", () => {
    const topic = { kind: "arpeggio" as const, subtype: "maj7", defaultKey: "C", lesson: null }
    expect(formatTopicName(topic)).toBe("C maj7 arpeggio")
  })

  it("formats progression topics by looking up displayName in the theory library", () => {
    // "pop-standard" has displayName "Pop Axis" in lib/theory/progressions.ts
    const topic = { kind: "progression" as const, subtype: "pop-standard", defaultKey: null, lesson: null }
    expect(formatTopicName(topic)).toBe("Pop Axis")
  })

  it("falls back to subtype for unknown progression slugs", () => {
    const topic = { kind: "progression" as const, subtype: "unknown-slug", defaultKey: null, lesson: null }
    expect(formatTopicName(topic)).toBe("unknown-slug")
  })

  it("formats harmony topics", () => {
    const topic = { kind: "harmony" as const, subtype: "ionian", defaultKey: "C", lesson: null }
    expect(formatTopicName(topic)).toBe("C ionian")
  })

  it("formats personal lesson topics using the userLesson title", () => {
    const topic = {
      kind: "lesson" as const,
      subtype: null,
      defaultKey: null,
      lesson: null,
      userLesson: { title: "My Custom Lesson", url: null },
    }
    expect(formatTopicName(topic)).toBe("My Custom Lesson")
  })

  it("prefers userLesson title over lesson title when both are present", () => {
    const topic = {
      kind: "lesson" as const,
      subtype: null,
      defaultKey: null,
      lesson: { title: "Standard Lesson" },
      userLesson: { title: "Personal Override", url: null },
    }
    expect(formatTopicName(topic)).toBe("Personal Override")
  })
})
