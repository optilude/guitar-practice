import { useState, useRef, useCallback } from "react"

export function useMetronome() {
  const [bpm, setBpmState] = useState(80)
  const [isRunning, setIsRunning] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)
  const nextTickRef = useRef<number>(0)
  const timerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleTick = useCallback((ctx: AudioContext, when: number) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, when)
    gain.gain.setValueAtTime(0.3, when)
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.05)
    osc.start(when)
    osc.stop(when + 0.05)
  }, [])

  const scheduleAhead = useCallback((ctx: AudioContext, bpmVal: number) => {
    const interval = 60 / bpmVal
    const scheduleWindow = 0.1 // schedule 100ms ahead
    const checkInterval = 50 // ms

    while (nextTickRef.current < ctx.currentTime + scheduleWindow) {
      scheduleTick(ctx, nextTickRef.current)
      nextTickRef.current += interval
    }
    timerIdRef.current = setTimeout(() => scheduleAhead(ctx, bpmVal), checkInterval)
  }, [scheduleTick])

  const start = useCallback(() => {
    if (isRunning) return
    const ctx = new AudioContext()
    ctxRef.current = ctx
    nextTickRef.current = ctx.currentTime
    scheduleAhead(ctx, bpm)
    setIsRunning(true)
  }, [isRunning, bpm, scheduleAhead])

  const stop = useCallback(() => {
    if (timerIdRef.current) clearTimeout(timerIdRef.current)
    ctxRef.current?.close()
    ctxRef.current = null
    setIsRunning(false)
  }, [])

  const setBpm = useCallback((val: number) => {
    setBpmState(val)
    if (isRunning) {
      stop()
      // Caller should restart after setBpm if desired
    }
  }, [isRunning, stop])

  return { bpm, setBpm, isRunning, start, stop }
}
