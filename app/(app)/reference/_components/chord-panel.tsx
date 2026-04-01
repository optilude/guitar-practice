"use client"

import { useState, useMemo } from "react"
import {
  getChord, listChordDbSuffixes, getChordPositions,
  SHELL_CHORD_TYPES, getShellChordPositions,
} from "@/lib/theory"
import Chord from "@tombatossals/react-chords/lib/Chord"

const GUITAR_INSTRUMENT = {
  strings: 6,
  fretsOnChord: 4,
  name: "guitar",
  keys: [] as string[],
  tunings: {
    standard: ["E", "A", "D", "G", "B", "E"],
  },
}

const SHELL_FORMULA: Record<string, string> = {
  "maj7 shell":    "1 – 3 – 7",
  "m7 shell":      "1 – b3 – b7",
  "7 shell":       "1 – 3 – b7",
  "maj6 shell":    "1 – 3 – 6",
  "dim7/m6 shell": "1 – b3 – 6",
}

interface ChordPanelProps {
  tonic: string
}

export function ChordPanel({ tonic }: ChordPanelProps) {
  const dbSuffixes = useMemo(() => listChordDbSuffixes(), [])
  const [chordType, setChordType] = useState(dbSuffixes[0] ?? "major")

  const isShell = (SHELL_CHORD_TYPES as readonly string[]).includes(chordType)

  const chord = useMemo(
    () => isShell ? null : getChord(tonic, chordType),
    [tonic, chordType, isShell]
  )
  const positions = useMemo(
    () => isShell
      ? getShellChordPositions(tonic, chordType)
      : getChordPositions(tonic, chordType),
    [tonic, chordType, isShell]
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground" htmlFor="chord-type-select">
          Chord type
        </label>
        <select
          id="chord-type-select"
          value={chordType}
          onChange={(e) => setChordType(e.target.value)}
          className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
        >
          <optgroup label="Shell Voicings">
            {SHELL_CHORD_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </optgroup>
          <optgroup label="All Chord Types">
            {dbSuffixes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </optgroup>
        </select>
      </div>

      {isShell ? (
        <p className="text-xs text-muted-foreground">
          Formula: {SHELL_FORMULA[chordType]}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Notes: {chord?.notes.join(" – ")}
        </p>
      )}

      {positions.length === 0 ? (
        <p className="text-xs text-muted-foreground">No voicings available for this chord type.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {positions.map((pos, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground">{pos.label}</span>
              <Chord chord={pos} instrument={GUITAR_INSTRUMENT} lite={false} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
