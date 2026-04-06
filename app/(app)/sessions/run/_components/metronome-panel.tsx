"use client"

import { useState } from "react"

interface MetronomePanelProps {
  bpm: number
  isRunning: boolean
  onBpmChange: (bpm: number) => void
  onStart: () => void
  onStop: () => void
}

export function MetronomePanel({ bpm, isRunning, onBpmChange, onStart, onStop }: MetronomePanelProps) {
  const [inputValue, setInputValue] = useState<string | null>(null)

  function commitInput() {
    if (inputValue === null) return
    const parsed = parseInt(inputValue, 10)
    if (!isNaN(parsed)) onBpmChange(Math.min(300, Math.max(20, parsed)))
    setInputValue(null)
  }

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg border border-border bg-card">
      <span className="text-xs uppercase tracking-widest text-muted-foreground shrink-0">BPM</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onBpmChange(Math.max(20, bpm - 1))}
          className="w-7 h-7 rounded border border-border bg-muted hover:bg-muted/80 text-sm font-medium transition-colors flex items-center justify-center"
        >
          −
        </button>
        {inputValue !== null ? (
          <input
            autoFocus
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={commitInput}
            onKeyDown={(e) => { if (e.key === "Enter") commitInput(); if (e.key === "Escape") setInputValue(null) }}
            className="w-12 text-center font-medium tabular-nums text-sm bg-transparent border-b border-accent focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        ) : (
          <button
            onClick={() => setInputValue(String(bpm))}
            className="w-12 text-center font-medium tabular-nums text-sm hover:text-accent transition-colors"
            title="Click to type a BPM"
          >
            {bpm}
          </button>
        )}
        <button
          onClick={() => onBpmChange(Math.min(300, bpm + 1))}
          className="w-7 h-7 rounded border border-border bg-muted hover:bg-muted/80 text-sm font-medium transition-colors flex items-center justify-center"
        >
          +
        </button>
      </div>
      <button
        onClick={isRunning ? onStop : onStart}
        className="ml-auto h-7 px-3 rounded border border-border bg-muted hover:bg-muted/80 text-sm font-medium transition-colors flex items-center gap-1"
      >
        {isRunning ? "■ Stop" : "▶ Start"}
      </button>
    </div>
  )
}
