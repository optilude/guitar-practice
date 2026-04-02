"use client"

import { useState } from "react"
import { getDiatonicChords, getSoloScales } from "@/lib/theory"
import { ChordQualityBlock } from "./chord-quality-block"
import { SoloScalesPanel } from "./solo-scales-panel"

interface HarmonyTabProps {
  tonic: string
}

const MODE_OPTIONS = [
  { value: "ionian",     label: "Ionian (major)" },
  { value: "dorian",     label: "Dorian" },
  { value: "phrygian",   label: "Phrygian" },
  { value: "lydian",     label: "Lydian" },
  { value: "mixolydian", label: "Mixolydian" },
  { value: "aeolian",    label: "Aeolian (natural minor)" },
  { value: "locrian",    label: "Locrian" },
]

export function HarmonyTab({ tonic }: HarmonyTabProps) {
  const [mode, setMode] = useState("ionian")
  const [selectedDegree, setSelectedDegree] = useState<number | null>(null)

  const chords = getDiatonicChords(tonic, mode)
  const selectedChord =
    selectedDegree !== null ? chords.find((c) => c.degree === selectedDegree) ?? null : null
  const scales = selectedChord
    ? getSoloScales(
        { tonic: selectedChord.tonic, type: selectedChord.type, degree: selectedChord.degree },
        mode
      )
    : null

  const modeLabel = MODE_OPTIONS.find((o) => o.value === mode)?.label ?? mode

  function handleChordClick(degree: number) {
    setSelectedDegree((prev) => (prev === degree ? null : degree))
  }

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="harmony-mode"
          className="text-xs uppercase tracking-widest text-muted-foreground whitespace-nowrap"
        >
          Mode
        </label>
        <select
          id="harmony-mode"
          aria-label="Mode"
          value={mode}
          onChange={(e) => {
            setMode(e.target.value)
            setSelectedDegree(null)
          }}
          className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
        >
          {MODE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Diatonic chord blocks */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Diatonic 7th chords · {tonic} {modeLabel}
        </p>
        <div role="group" aria-label="Diatonic chords" className="flex gap-2 overflow-x-auto pb-2">
          {chords.map((chord) => (
            <ChordQualityBlock
              key={chord.degree}
              roman={chord.roman}
              chordName={`${chord.tonic}${chord.type}`}
              type={chord.type}
              isSelected={selectedDegree === chord.degree}
              onClick={() => handleChordClick(chord.degree)}
            />
          ))}
        </div>
      </div>

      {/* Scale recommendation or placeholder */}
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
    </div>
  )
}
