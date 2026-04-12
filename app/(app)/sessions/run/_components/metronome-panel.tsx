"use client"

import { useState } from "react"
import { btn } from "@/lib/button-styles"
import { TIME_SIGNATURES } from "@/lib/theory/time-signatures"

interface MetronomePanelProps {
  bpm: number
  isRunning: boolean
  onBpmChange: (bpm: number) => void
  onStart: () => void
  onStop: () => void
  beatsPerBar?: number
  onBeatsPerBarChange?: (beats: number) => void
}

export function MetronomePanel({
  bpm,
  isRunning,
  onBpmChange,
  onStart,
  onStop,
  beatsPerBar,
  onBeatsPerBarChange,
}: MetronomePanelProps) {
  const [inputValue, setInputValue] = useState<string>(String(bpm))

  function commit(raw: string) {
    const val = parseInt(raw, 10)
    if (!isNaN(val)) {
      onBpmChange(Math.min(300, Math.max(20, val)))
      setInputValue(String(Math.min(300, Math.max(20, val))))
    } else {
      setInputValue(String(bpm))
    }
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card">
      {beatsPerBar !== undefined && onBeatsPerBarChange && (
        <select
          value={beatsPerBar}
          onChange={e => onBeatsPerBarChange(Number(e.target.value))}
          aria-label="Time signature"
          className="h-8 bg-card border border-border rounded px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {TIME_SIGNATURES.map(sig => (
            <option key={sig.label} value={sig.beats}>{sig.label}</option>
          ))}
        </select>
      )}
      <input
        type="number"
        value={inputValue}
        min={20}
        max={300}
        onChange={e => setInputValue(e.target.value)}
        onBlur={e => commit(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
        aria-label="BPM"
        className="w-20 h-8 text-center font-medium tabular-nums text-sm bg-card border border-border rounded px-2 focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <button
        type="button"
        onClick={isRunning ? onStop : onStart}
        className={`${btn("standalone", "sm")} flex-1`}
      >
        {isRunning ? "■ Stop" : "▶\uFE0E Start"}
      </button>
    </div>
  )
}
