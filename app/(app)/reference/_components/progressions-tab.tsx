"use client"

import { useState, useEffect } from "react"
import { listProgressions, getProgression, getSoloScales } from "@/lib/theory"
import { ChordQualityBlock } from "./chord-quality-block"
import { SoloScalesPanel } from "./solo-scales-panel"

interface ProgressionsTabProps {
  tonic: string
  onChordSelect?: (tonic: string, type: string, quality: string, primaryScaleName: string) => void
  onScaleSelect?: (tonic: string, scaleName: string) => void
}

export function ProgressionsTab({ tonic, onChordSelect, onScaleSelect }: ProgressionsTabProps) {
  const [progressionName, setProgressionName] = useState("pop-standard")
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0)

  const progressions = listProgressions()
  const prog = progressions.find((p) => p.name === progressionName)!
  const chords = getProgression(progressionName, tonic)

  const selectedChord = selectedIndex !== null ? chords[selectedIndex] ?? null : null

  // Notify parent of the initial auto-selected chord on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const chord = chords[0]
    if (chord) {
      const soloScales = getSoloScales({ tonic: chord.tonic, type: chord.type, degree: chord.degree }, prog.mode)
      onChordSelect?.(chord.tonic, chord.type, chord.quality, soloScales.primary.scaleName)
    }
  }, []) // intentionally empty: only on mount
  const scales = selectedChord
    ? getSoloScales(
        { tonic: selectedChord.tonic, type: selectedChord.type, degree: selectedChord.degree },
        prog.mode
      )
    : null

  function handleIndexClick(index: number) {
    if (selectedIndex !== index) {
      const chord = chords[index]
      if (chord) {
        const soloScales = getSoloScales({ tonic: chord.tonic, type: chord.type, degree: chord.degree }, prog.mode)
        onChordSelect?.(chord.tonic, chord.type, chord.quality, soloScales.primary.scaleName)
      }
    }
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
            const newName = e.target.value
            setProgressionName(newName)
            setSelectedIndex(0)
            const newChords = getProgression(newName, tonic)
            const chord0 = newChords[0]
            if (chord0) {
              const newProg = progressions.find((p) => p.name === newName)!
              const soloScales = getSoloScales({ tonic: chord0.tonic, type: chord0.type, degree: chord0.degree }, newProg.mode)
              onChordSelect?.(chord0.tonic, chord0.type, chord0.quality, soloScales.primary.scaleName)
            }
          }}
          className="bg-card border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent w-fit"
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
        <div role="group" aria-label="Progression chords" className="flex items-center gap-1 overflow-x-auto pb-2">
          {chords.map((chord, i) => (
            <div key={i} className="flex items-center gap-1 flex-shrink-0">
              {i > 0 && (
                <span className="text-muted-foreground text-sm flex-shrink-0">→</span>
              )}
              <ChordQualityBlock
                roman={chord.roman}
                chordName={`${chord.tonic}${chord.type}`}
                degree={chord.degree}
                isSelected={selectedIndex === i}
                onClick={() => handleIndexClick(i)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Per-chord scale recommendation */}
      {scales && selectedChord && (
        <SoloScalesPanel
          scales={scales}
          chordName={`${selectedChord.tonic}${selectedChord.type}`}
          onScaleSelect={onScaleSelect}
        />
      )}

      {/* Progression-wide recommendation — always visible */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
          Over the whole progression
        </p>
        <p className="text-sm font-semibold text-foreground">
          {tonic} {prog.recommendedScaleType}
        </p>
      </div>
    </div>
  )
}
