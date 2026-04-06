// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest"
import { setupMinimalDOM } from "./test-dom-setup"

beforeAll(() => { setupMinimalDOM() })

import { renderHook, act } from "@testing-library/react"
import { useSessionNav } from "./use-session-nav"
import type { SessionSection } from "@/lib/sessions"

function makeSection(id: string, keys: string[] = [], defaultKey = "C"): SessionSection {
  return {
    id,
    title: id,
    type: "warmup",
    description: "",
    durationMinutes: 5,
    order: 0,
    topic: {
      kind: "scale",
      subtype: "major",
      displayName: id,
      defaultKey,
      keys,
      practiceMode: null,
      lessonUrl: null,
    },
  }
}

describe("useSessionNav", () => {
  it("starts at section 0, key 0", () => {
    const { result } = renderHook(() => useSessionNav([makeSection("A"), makeSection("B")]))
    expect(result.current.currentSectionIndex).toBe(0)
    expect(result.current.currentKeyIndex).toBe(0)
  })

  it("goToNextSection advances section and resets key", () => {
    const { result } = renderHook(() =>
      useSessionNav([makeSection("A", ["C", "F"]), makeSection("B")]),
    )
    act(() => { result.current.goToNextKey() })
    expect(result.current.currentKeyIndex).toBe(1)
    act(() => { result.current.goToNextSection() })
    expect(result.current.currentSectionIndex).toBe(1)
    expect(result.current.currentKeyIndex).toBe(0)
  })

  it("goToNextSection does nothing at last section", () => {
    const { result } = renderHook(() => useSessionNav([makeSection("A")]))
    act(() => { result.current.goToNextSection() })
    expect(result.current.currentSectionIndex).toBe(0)
  })

  it("goToPrevSection does nothing at first section", () => {
    const { result } = renderHook(() => useSessionNav([makeSection("A"), makeSection("B")]))
    act(() => { result.current.goToPrevSection() })
    expect(result.current.currentSectionIndex).toBe(0)
  })

  it("goToSection jumps to any section", () => {
    const { result } = renderHook(() =>
      useSessionNav([makeSection("A"), makeSection("B"), makeSection("C")]),
    )
    act(() => { result.current.goToSection(2) })
    expect(result.current.currentSectionIndex).toBe(2)
  })

  it("currentKeySequence resolves for current section", () => {
    const { result } = renderHook(() => useSessionNav([makeSection("A", ["C", "F", "G"])]))
    expect(result.current.currentKeySequence).toEqual(["C", "F", "G"])
  })

  it("goToNextKey wraps around", () => {
    const { result } = renderHook(() => useSessionNav([makeSection("A", ["C", "F"])]))
    act(() => { result.current.goToNextKey() })
    expect(result.current.currentKeyIndex).toBe(1)
    act(() => { result.current.goToNextKey() })
    expect(result.current.currentKeyIndex).toBe(0)
  })

  it("goToPrevKey wraps around", () => {
    const { result } = renderHook(() => useSessionNav([makeSection("A", ["C", "F"])]))
    act(() => { result.current.goToPrevKey() })
    expect(result.current.currentKeyIndex).toBe(1)
  })
})
