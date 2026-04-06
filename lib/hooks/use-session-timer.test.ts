// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest"
import { setupMinimalDOM } from "./test-dom-setup"

beforeAll(() => { setupMinimalDOM() })

import { renderHook, act } from "@testing-library/react"
import { useSessionTimer } from "./use-session-timer"

describe("useSessionTimer", () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it("starts paused", () => {
    const { result } = renderHook(() => useSessionTimer(60, 120))
    expect(result.current.isRunning).toBe(false)
    expect(result.current.sectionSecondsRemaining).toBe(60)
    expect(result.current.totalSecondsRemaining).toBe(120)
  })

  it("counts down when running", () => {
    const { result } = renderHook(() => useSessionTimer(60, 120))
    act(() => { result.current.play() })
    act(() => { vi.advanceTimersByTime(3000) })
    expect(result.current.sectionSecondsRemaining).toBe(57)
    expect(result.current.totalSecondsRemaining).toBe(117)
  })

  it("pauses counting", () => {
    const { result } = renderHook(() => useSessionTimer(60, 120))
    act(() => { result.current.play() })
    act(() => { vi.advanceTimersByTime(2000) })
    act(() => { result.current.pause() })
    const sec = result.current.sectionSecondsRemaining
    act(() => { vi.advanceTimersByTime(2000) })
    expect(result.current.sectionSecondsRemaining).toBe(sec)
  })

  it("does not go below 0", () => {
    const { result } = renderHook(() => useSessionTimer(2, 5))
    act(() => { result.current.play() })
    act(() => { vi.advanceTimersByTime(10000) })
    expect(result.current.sectionSecondsRemaining).toBe(0)
    expect(result.current.totalSecondsRemaining).toBe(0)
  })

  it("resetSection updates both timers", () => {
    const { result } = renderHook(() => useSessionTimer(60, 120))
    act(() => { result.current.play() })
    act(() => { vi.advanceTimersByTime(5000) })
    act(() => { result.current.resetSection(30, 90) })
    expect(result.current.sectionSecondsRemaining).toBe(30)
    expect(result.current.totalSecondsRemaining).toBe(90)
  })
})
