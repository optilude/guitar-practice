import { useState, useEffect, useRef, useCallback } from "react"

export function useSessionTimer(initialSectionSecs: number, initialTotalSecs: number) {
  const [isRunning, setIsRunning] = useState(false)
  const [sectionSecondsRemaining, setSectionSecs] = useState(initialSectionSecs)
  const [totalSecondsRemaining, setTotalSecs] = useState(initialTotalSecs)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isRunning) return
    intervalRef.current = setInterval(() => {
      setSectionSecs((s) => Math.max(0, s - 1))
      setTotalSecs((t) => Math.max(0, t - 1))
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning])

  const play = useCallback(() => setIsRunning(true), [])
  const pause = useCallback(() => setIsRunning(false), [])
  const resetSection = useCallback((secs: number, total: number) => {
    setSectionSecs(secs)
    setTotalSecs(total)
  }, [])

  return { isRunning, sectionSecondsRemaining, totalSecondsRemaining, play, pause, resetSection }
}
