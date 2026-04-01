"use client"

import { useState, useMemo } from "react"
import { getChord, listChordTypes } from "@/lib/theory"
import { ChordDiagramViewer } from "./chord-diagram-viewer"

interface ChordPanelProps {
  tonic: string
}

export function ChordPanel({ tonic }: ChordPanelProps) {
  const chordTypes = useMemo(() => listChordTypes(), [])
  const [chordType, setChordType] = useState(chordTypes[0] ?? "major")
  const [voicingIndex, setVoicingIndex] = useState(0)

  const chord = useMemo(() => getChord(tonic, chordType), [tonic, chordType])

  const voicingCount = chord.voicings.length
  const voicingOptions = Array.from({ length: voicingCount }, (_, i) => i)
  const safeVoicingIndex = voicingIndex < voicingCount ? voicingIndex : 0

  return (
    <div className="space-y-4">
      {/* Selectors row */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="chord-type-select">
            Chord type
          </label>
          <select
            id="chord-type-select"
            value={chordType}
            onChange={(e) => {
              setChordType(e.target.value)
              setVoicingIndex(0)
            }}
            className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {chordTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {voicingCount > 1 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="chord-voicing-select">
              Voicing
            </label>
            <select
              id="chord-voicing-select"
              value={safeVoicingIndex}
              onChange={(e) => setVoicingIndex(Number(e.target.value))}
              className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {voicingOptions.map((i) => (
                <option key={i} value={i}>
                  {chord.voicings[i]?.label ?? `Voicing ${i + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Chord diagram */}
      <ChordDiagramViewer chord={chord} voicingIndex={safeVoicingIndex} />

      {/* Notes display */}
      <p className="text-xs text-muted-foreground">
        Notes: {chord.notes.join(" – ")}
      </p>
    </div>
  )
}
