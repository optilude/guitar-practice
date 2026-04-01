"use client"

import { useState, useMemo } from "react"
import { getChord, listChordDbSuffixes, getChordPositions } from "@/lib/theory"
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

interface ChordPanelProps {
  tonic: string
}

export function ChordPanel({ tonic }: ChordPanelProps) {
  const chordTypes = useMemo(() => listChordDbSuffixes(), [])
  const [chordType, setChordType] = useState(chordTypes[0] ?? "major")

  const chord = useMemo(() => getChord(tonic, chordType), [tonic, chordType])
  const positions = useMemo(() => getChordPositions(tonic, chordType), [tonic, chordType])

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
          {chordTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <p className="text-xs text-muted-foreground">
        Notes: {chord.notes.join(" – ")}
      </p>

      {positions.length === 0 ? (
        <p className="text-xs text-muted-foreground">No voicings available for this chord type.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
