"use client"

import { useState } from "react"
import { listProgressions, getProgression, getSoloScales } from "@/lib/theory"
import { ChordQualityBlock } from "./chord-quality-block"
import { SoloScalesPanel } from "./solo-scales-panel"

interface ProgressionsTabProps {
  tonic: string
}

export function ProgressionsTab({ tonic }: ProgressionsTabProps) {
  const [progressionName, setProgressionName] = useState("pop-standard")
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const progressions = listProgressions()
  const prog = progressions.find((p) => p.name === progressionName)!
  const chords = getProgression(progressionName, tonic)

  const selectedChord = selectedIndex !== null ? chords[selectedIndex] ?? null : null
  const scales = selectedChord
    ? getSoloScales(
        { tonic: selectedChord.tonic, type: selectedChord.type, degree: selectedChord.degree },
        prog.mode
      )
    : null

  function handleIndexClick(index: number) {
    setSelectedIndex((prev) => (prev === index ? null : index))
  }

  return (
    <div className="space-y-4">
      {/* Progression selector */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="progression-select"
          className="text-xs uppercase tracking-widest text-muted-foreground whitespace-nowrap"
        >
          Progression
        </label>
        <select
          id="progression-select"
          aria-label="Progression"
          value={progressionName}
          onChange={(e) => {
            setProgressionName(e.target.value)
            setSelectedIndex(null)
          }}
          className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
        >
          {progressions.map((p) => (
            <option key={p.name} value={p.name}>
              {p.displayName} · {p.romanDisplay}
            </option>
          ))}
        </select>
      </div>

      {/* Chord blocks in order with arrows */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Chords in {tonic} · {prog.romanDisplay}
        </p>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {chords.map((chord, i) => (
            <div key={i} className="flex items-center gap-1 flex-shrink-0">
              {i > 0 && (
                <span className="text-muted-foreground text-sm flex-shrink-0">→</span>
              )}
              <ChordQualityBlock
                roman={chord.roman}
                chordName={`${chord.tonic}${chord.type}`}
                type={chord.type}
                isSelected={selectedIndex === i}
                onClick={() => handleIndexClick(i)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Per-chord scale recommendation or placeholder */}
      {scales && selectedChord ? (
        <SoloScalesPanel
          scales={scales}
          chordName={`${selectedChord.tonic}${selectedChord.type}`}
        />
      ) : (
        <p className="text-sm text-muted-foreground italic">
          Click a chord to see recommended scales for soloing.
        </p>
      )}

      {/* Progression-wide recommendation — always visible */}
      <div className="rounded-lg border border-green-800 bg-green-950/30 p-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
          Over the whole progression
        </p>
        <p className="text-sm font-semibold text-green-400">
          {tonic} {prog.recommendedScaleType}
        </p>
      </div>
    </div>
  )
}
