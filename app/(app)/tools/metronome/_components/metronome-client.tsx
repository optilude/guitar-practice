"use client"

import { useState } from "react"
import { useMetronome } from "@/lib/hooks/use-metronome"
import { TIME_SIGNATURES } from "@/lib/theory/time-signatures"
import { cn } from "@/lib/utils"
import { btn } from "@/lib/button-styles"

export function MetronomeClient() {
  const [inputValue, setInputValue] = useState<string | null>(null)
  const {
    bpm, setBpm,
    isPlaying, beat,
    beatsPerBar, setBeatsPerBar,
    enabledBeats, setEnabledBeats,
    start, stop,
  } = useMetronome()

  function commitInput() {
    if (inputValue === null) return
    const parsed = parseInt(inputValue, 10)
    if (!isNaN(parsed)) setBpm(Math.min(300, Math.max(20, parsed)))
    setInputValue(null)
  }

  function toggleBeat(index: number) {
    const next = new Set(enabledBeats)
    if (next.has(index)) {
      next.delete(index)
    } else {
      next.add(index)
    }
    setEnabledBeats(next)
  }

  return (
    <div className="flex flex-col gap-6 max-w-sm">
      {/* BPM control + Start/Stop + Time signature selector — shared 4-col grid */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-4 gap-2 items-center">
          {/* Tempo label + BPM control — spans 3 columns */}
          <div className="col-span-3 flex items-center gap-3">
            <span className="text-xs uppercase tracking-widest text-muted-foreground shrink-0">Tempo</span>
            <div className="flex-1 flex justify-center items-center gap-1">
              <button
                type="button"
                onClick={() => setBpm(Math.max(20, bpm - 1))}
                title="Decrease BPM (stops playback)"
                className="py-1.5 px-2.5 rounded border border-border bg-muted hover:bg-muted/80 text-sm font-medium transition-colors flex items-center justify-center"
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitInput()
                    if (e.key === "Escape") setInputValue(null)
                  }}
                  className="w-12 text-center font-medium tabular-nums text-sm bg-transparent border-b border-accent focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setInputValue(String(bpm))}
                  className="w-12 text-center font-medium tabular-nums text-sm hover:text-accent transition-colors"
                  title="Click to type a BPM"
                >
                  {bpm}
                </button>
              )}
              <button
                type="button"
                onClick={() => setBpm(Math.min(300, bpm + 1))}
                title="Increase BPM (stops playback)"
                className="py-1.5 px-2.5 rounded border border-border bg-muted hover:bg-muted/80 text-sm font-medium transition-colors flex items-center justify-center"
              >
                +
              </button>
              <span className="text-xs uppercase tracking-widest text-muted-foreground ml-2">BPM</span>
            </div>
          </div>
          {/* Start/Stop — spans 1 column, same width as time sig buttons */}
          <button
            type="button"
            onClick={isPlaying ? stop : start}
            className="rounded-md font-medium transition-colors text-sm px-2 py-1.5 bg-accent text-accent-foreground hover:opacity-90 w-full"
          >
            {isPlaying ? "■ Stop" : "▶ Start"}
          </button>
        </div>

        <span className="text-xs uppercase tracking-widest text-muted-foreground mt-2">Time Signature</span>
        <div className="grid grid-cols-4 gap-2">
          {TIME_SIGNATURES.map((sig) => (
            <button
              key={sig.label}
              type="button"
              onClick={() => setBeatsPerBar(sig.beats)}
              className={cn(
                "px-1 py-1.5 text-sm rounded border transition-colors",
                sig.beats === beatsPerBar
                  ? "border-accent bg-accent/10 text-accent font-medium"
                  : "border-border bg-muted hover:bg-muted/80 text-foreground"
              )}
            >
              {sig.label}
            </button>
          ))}
        </div>
      </div>

      {/* Beat grid */}
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Beats</span>
        <div className="flex flex-wrap gap-2 items-center">
          {Array.from({ length: beatsPerBar }, (_, i) => {
            const isEnabled = enabledBeats.has(i)
            const isCurrent = isPlaying && beat === i
            const isDownbeat = i === 0
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleBeat(i)}
                aria-pressed={isEnabled}
                className={cn(
                  "rounded-full border-2 transition-all flex items-center justify-center text-xs font-medium",
                  isDownbeat ? "w-10 h-10" : "w-8 h-8",
                  isEnabled
                    ? isCurrent
                      ? "border-accent bg-accent text-accent-foreground scale-110"
                      : "border-accent bg-accent/20 text-accent"
                    : isCurrent
                      ? "border-muted-foreground bg-muted text-muted-foreground scale-105"
                      : "border-border bg-muted/50 text-muted-foreground"
                )}
              >
                {i + 1}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
