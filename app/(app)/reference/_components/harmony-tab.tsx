"use client"

import { useState } from "react"
import { Note } from "tonal"
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

// Descending interval from each mode's tonic to its parent major key tonic
const MODE_PARENT_INTERVAL: Record<string, string> = {
  dorian:     "-2M",
  phrygian:   "-3M",
  lydian:     "-4P",
  mixolydian: "-5P",
  aeolian:    "-6M",
  locrian:    "-7M",
}

// How many diatonic steps above the parent major root each mode starts (0-indexed)
const MODE_DEGREE_OFFSET: Record<string, number> = {
  ionian: 0, dorian: 1, phrygian: 2, lydian: 3, mixolydian: 4, aeolian: 5, locrian: 6,
}

// Roman numerals for the 7 diatonic degrees of a major scale
const MAJOR_ROMAN: Record<number, string> = {
  1: "I", 2: "ii", 3: "iii", 4: "IV", 5: "V", 6: "vi", 7: "vii°",
}

export function HarmonyTab({ tonic }: HarmonyTabProps) {
  const [mode, setMode] = useState("ionian")
  const [selectedDegree, setSelectedDegree] = useState<number | null>(1)
  const [relative, setRelative] = useState(false)

  const chords = getDiatonicChords(tonic, mode)
  const selectedChord =
    selectedDegree !== null ? chords.find((c) => c.degree === selectedDegree) ?? null : null
  const scales = selectedChord
    ? getSoloScales(
        { tonic: selectedChord.tonic, type: selectedChord.type, degree: selectedChord.degree },
        mode
      )
    : null

  const parentKey = mode !== "ionian"
    ? Note.transpose(tonic, MODE_PARENT_INTERVAL[mode])
    : null

  const modeOffset = MODE_DEGREE_OFFSET[mode] ?? 0

  function relativeRoman(degree: number): string {
    const relDegree = ((degree - 1 + modeOffset) % 7) + 1
    return MAJOR_ROMAN[relDegree] ?? degree.toString()
  }

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
            setSelectedDegree(1)
          }}
          className="bg-card border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent w-fit"
        >
          {MODE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {parentKey && (
          <span className="text-xs text-muted-foreground">
            parent: <span className="font-medium text-foreground">{parentKey} major</span>
          </span>
        )}
      </div>

      {/* Diatonic chord blocks */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Diatonic 7th chords
          </p>
          <label
            className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none"
            title="Show each chord's scale degree in the parent major key"
          >
            <input
              type="checkbox"
              checked={relative}
              onChange={(e) => setRelative(e.target.checked)}
              className="accent-accent"
            />
            Relative
          </label>
        </div>
        <div role="group" aria-label="Diatonic chords" className="flex gap-2 overflow-x-auto pb-2">
          {chords.map((chord) => (
            <ChordQualityBlock
              key={chord.degree}
              roman={relative ? relativeRoman(chord.degree) : chord.roman}
              chordName={`${chord.tonic}${chord.type}`}
              degree={chord.degree}
              isSelected={selectedDegree === chord.degree}
              onClick={() => handleChordClick(chord.degree)}
            />
          ))}
        </div>
      </div>

      {/* Scale recommendation */}
      {scales && selectedChord && (
        <SoloScalesPanel
          scales={scales}
          chordName={`${selectedChord.tonic}${selectedChord.type}`}
        />
      )}
    </div>
  )
}
