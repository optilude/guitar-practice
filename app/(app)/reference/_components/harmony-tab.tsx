"use client"

import { useState, useEffect } from "react"
import { Note } from "tonal"
import { getDiatonicChords, getSoloScales, SOLO_MODE_OPTION_GROUPS } from "@/lib/theory"
import { ChordQualityBlock } from "./chord-quality-block"
import { SoloScalesPanel } from "./solo-scales-panel"
import { AddToGoalButton } from "@/components/add-to-goal-button"

interface HarmonyTabProps {
  tonic: string
  onChordSelect?: (tonic: string, type: string, quality: string, primaryScaleName: string) => void
  onScaleSelect?: (tonic: string, scaleName: string) => void
}

const MAJOR_MODE_SET = new Set([
  "ionian", "dorian", "phrygian", "lydian", "mixolydian", "aeolian", "locrian",
])

type ModeParentInfo = { interval: string; family: "major" | "melodic minor" | "harmonic minor" }

const MODE_PARENT_INFO: Record<string, ModeParentInfo> = {
  // Major scale modes (interval to parent major root)
  dorian:            { interval: "-2M", family: "major" },
  phrygian:          { interval: "-3M", family: "major" },
  lydian:            { interval: "-4P", family: "major" },
  mixolydian:        { interval: "-5P", family: "major" },
  aeolian:           { interval: "-6M", family: "major" },
  locrian:           { interval: "-7M", family: "major" },
  // Melodic minor modes (interval to parent melodic minor root)
  "melodic minor":    { interval: "",    family: "melodic minor" },
  "dorian b2":        { interval: "-2M", family: "melodic minor" },
  "lydian augmented": { interval: "-3m", family: "melodic minor" },
  "lydian dominant":  { interval: "-4P", family: "melodic minor" },
  "mixolydian b6":    { interval: "-5P", family: "melodic minor" },
  "locrian #2":       { interval: "-6M", family: "melodic minor" },
  "altered":          { interval: "-7M", family: "melodic minor" },
  // Harmonic minor modes (interval to parent harmonic minor root)
  "harmonic minor":     { interval: "",    family: "harmonic minor" },
  "locrian #6":         { interval: "-2M", family: "harmonic minor" },
  "ionian #5":          { interval: "-3m", family: "harmonic minor" },
  "dorian #4":          { interval: "-4P", family: "harmonic minor" },
  "phrygian dominant":  { interval: "-5P", family: "harmonic minor" },
  "lydian #2":          { interval: "-6m", family: "harmonic minor" },
  "altered diminished": { interval: "-7M", family: "harmonic minor" },
}

// How many diatonic steps above the parent major root each mode starts (0-indexed)
const MODE_DEGREE_OFFSET: Record<string, number> = {
  ionian: 0, dorian: 1, phrygian: 2, lydian: 3, mixolydian: 4, aeolian: 5, locrian: 6,
}

// Roman numerals for the 7 diatonic degrees of a major scale
const MAJOR_ROMAN: Record<number, string> = {
  1: "I", 2: "ii", 3: "iii", 4: "IV", 5: "V", 6: "vi", 7: "vii°",
}

export function HarmonyTab({ tonic, onChordSelect, onScaleSelect }: HarmonyTabProps) {
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

  // Notify parent of the initial/auto-selected chord on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const chord = chords.find((c) => c.degree === 1)
    if (chord) {
      const soloScales = getSoloScales({ tonic: chord.tonic, type: chord.type, degree: chord.degree }, "ionian")
      onChordSelect?.(chord.tonic, chord.type, chord.quality, soloScales.primary.scaleName)
    }
  }, []) // intentionally empty: only on mount

  const parentInfo = mode !== "ionian" ? MODE_PARENT_INFO[mode] : null
  const parentKey = parentInfo && parentInfo.interval
    ? Note.transpose(tonic, parentInfo.interval)
    : parentInfo && parentInfo.interval === ""
      ? tonic
      : null
  const parentLabel = parentInfo?.family ?? "major"

  const modeOffset = MODE_DEGREE_OFFSET[mode] ?? 0

  function relativeRoman(degree: number): string {
    const relDegree = ((degree - 1 + modeOffset) % 7) + 1
    return MAJOR_ROMAN[relDegree] ?? degree.toString()
  }

  function handleChordClick(degree: number) {
    if (selectedDegree !== degree) {
      const chord = chords.find((c) => c.degree === degree)
      if (chord) {
        const soloScales = getSoloScales({ tonic: chord.tonic, type: chord.type, degree: chord.degree }, mode)
        onChordSelect?.(chord.tonic, chord.type, chord.quality, soloScales.primary.scaleName)
      }
    }
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
            const newMode = e.target.value
            setMode(newMode)
            setSelectedDegree(1)
            const newChords = getDiatonicChords(tonic, newMode)
            const degree1 = newChords.find((c) => c.degree === 1)
            if (degree1) {
              const soloScales = getSoloScales({ tonic: degree1.tonic, type: degree1.type, degree: degree1.degree }, newMode)
              onChordSelect?.(degree1.tonic, degree1.type, degree1.quality, soloScales.primary.scaleName)
            }
          }}
          className="bg-card border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent w-fit"
        >
          {SOLO_MODE_OPTION_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <AddToGoalButton
          kind="harmony"
          subtype={mode}
          defaultKey={tonic}
          displayName={`${tonic} ${mode}`}
          popupAlign="right"
        />
        {parentKey && (
          <span className="text-xs text-muted-foreground">
            parent: <span className="font-medium text-foreground">{parentKey} {parentLabel}</span>
          </span>
        )}
      </div>

      {/* Diatonic chord blocks */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Diatonic 7th chords
          </p>
          {MAJOR_MODE_SET.has(mode) && mode !== "ionian" && (
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
          )}
        </div>
        <div role="group" aria-label="Diatonic chords" className="flex flex-wrap gap-2">
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
          onScaleSelect={onScaleSelect}
        />
      )}
    </div>
  )
}
