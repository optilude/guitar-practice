import { useState, useRef, useCallback } from "react"

export function useMetronome() {
  const [bpm, setBpmState] = useState(80)
  const [isRunning, setIsRunning] = useState(false)
  const [beatsPerBar, setBeatsPerBar] = useState(4)
  const [beat, setBeat] = useState(0)
  const ctxRef = useRef<AudioContext | null>(null)
  const nextTickRef = useRef<number>(0)
  const timerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const beatCountRef = useRef<number>(0)
  const beatsPerBarRef = useRef<number>(4)

  const scheduleTick = useCallback((ctx: AudioContext, when: number, isDownbeat: boolean) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(isDownbeat ? 1760 : 880, when)
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
      const currentBeat = beatCountRef.current % beatsPerBarRef.current
      scheduleTick(ctx, nextTickRef.current, currentBeat === 0)
      setBeat(currentBeat)
      beatCountRef.current += 1
      nextTickRef.current += interval
    }
    timerIdRef.current = setTimeout(() => scheduleAhead(ctx, bpmVal), checkInterval)
  }, [scheduleTick])

  const start = useCallback(() => {
    if (isRunning) return
    const ctx = new AudioContext()
    ctxRef.current = ctx
    nextTickRef.current = ctx.currentTime
    beatCountRef.current = 0
    scheduleAhead(ctx, bpm)
    setIsRunning(true)
  }, [isRunning, bpm, scheduleAhead])

  const stop = useCallback(() => {
    if (timerIdRef.current) clearTimeout(timerIdRef.current)
    ctxRef.current?.close()
    ctxRef.current = null
    setIsRunning(false)
    setBeat(0)
    beatCountRef.current = 0
  }, [])

  const setBpm = useCallback((val: number) => {
    setBpmState(val)
    if (isRunning) {
      stop()
      // Caller should restart after setBpm if desired
    }
  }, [isRunning, stop])

  const handleSetBeatsPerBar = useCallback((val: number) => {
    beatsPerBarRef.current = val
    setBeatsPerBar(val)
  }, [])

  const isPlaying = isRunning

  return { bpm, setBpm, isPlaying, beatsPerBar, setBeatsPerBar: handleSetBeatsPerBar, beat, start, stop }
}
