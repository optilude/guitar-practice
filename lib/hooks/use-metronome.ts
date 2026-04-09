import { useState, useRef, useCallback } from "react"
import { DEFAULT_BEATS_PER_BAR } from "@/lib/theory/time-signatures"

function buildEnabledBeats(count: number): Set<number> {
  return new Set(Array.from({ length: count }, (_, i) => i))
}

export function useMetronome() {
  const initialEnabledBeats = buildEnabledBeats(DEFAULT_BEATS_PER_BAR)
  const [bpm, setBpmState] = useState(80)
  const [isRunning, setIsRunning] = useState(false)
  const [beatsPerBar, setBeatsPerBarState] = useState(DEFAULT_BEATS_PER_BAR)
  const [beat, setBeat] = useState(0)
  const [enabledBeats, setEnabledBeatsState] = useState<Set<number>>(initialEnabledBeats)

  const ctxRef = useRef<AudioContext | null>(null)
  const nextTickRef = useRef<number>(0)
  const timerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const beatCountRef = useRef<number>(0)
  const beatsPerBarRef = useRef<number>(DEFAULT_BEATS_PER_BAR)
  const enabledBeatsRef = useRef<Set<number>>(initialEnabledBeats)

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
      if (enabledBeatsRef.current.has(currentBeat)) {
        scheduleTick(ctx, nextTickRef.current, currentBeat === 0)
      }
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
    }
  }, [isRunning, stop])

  const setBeatsPerBar = useCallback((val: number) => {
    beatsPerBarRef.current = val
    setBeatsPerBarState(val)
    const all = buildEnabledBeats(val)
    enabledBeatsRef.current = all
    setEnabledBeatsState(all)
  }, [])

  const setEnabledBeats = useCallback((beats: Set<number>) => {
    const valid = new Set([...beats].filter(b => b < beatsPerBarRef.current))
    enabledBeatsRef.current = valid
    setEnabledBeatsState(valid)
  }, [])

  const isPlaying = isRunning

  return {
    bpm, setBpm,
    isPlaying, beat,
    beatsPerBar, setBeatsPerBar,
    enabledBeats, setEnabledBeats,
    start, stop,
  }
}
