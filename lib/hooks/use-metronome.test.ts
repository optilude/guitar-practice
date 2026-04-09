import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useMetronome } from "./use-metronome"

describe("useMetronome — enabledBeats", () => {
  it("starts with all beats enabled for 4 beats per bar", () => {
    const { result } = renderHook(() => useMetronome())
    expect(result.current.beatsPerBar).toBe(4)
    expect(result.current.enabledBeats).toEqual(new Set([0, 1, 2, 3]))
  })

  it("setBeatsPerBar(3) resets enabledBeats to {0,1,2}", () => {
    const { result } = renderHook(() => useMetronome())
    act(() => { result.current.setBeatsPerBar(3) })
    expect(result.current.beatsPerBar).toBe(3)
    expect(result.current.enabledBeats).toEqual(new Set([0, 1, 2]))
  })

  it("setBeatsPerBar(6) resets enabledBeats to {0,1,2,3,4,5}", () => {
    const { result } = renderHook(() => useMetronome())
    act(() => { result.current.setBeatsPerBar(6) })
    expect(result.current.enabledBeats).toEqual(new Set([0, 1, 2, 3, 4, 5]))
  })

  it("setEnabledBeats updates the set", () => {
    const { result } = renderHook(() => useMetronome())
    act(() => { result.current.setEnabledBeats(new Set([1, 3])) })
    expect(result.current.enabledBeats).toEqual(new Set([1, 3]))
  })

  it("setBeatsPerBar overrides a custom enabledBeats", () => {
    const { result } = renderHook(() => useMetronome())
    act(() => { result.current.setEnabledBeats(new Set([1])) })
    act(() => { result.current.setBeatsPerBar(5) })
    expect(result.current.enabledBeats).toEqual(new Set([0, 1, 2, 3, 4]))
  })
})
