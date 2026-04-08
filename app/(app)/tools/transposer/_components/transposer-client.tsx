"use client"

import { useCallback, useMemo, useState } from "react"
import { Note } from "tonal"
import { parseChord } from "@/lib/theory/key-finder"
import { analyzeProgression, transposeProgression } from "@/lib/theory/transposer"
import { ALL_KEY_MODES } from "@/lib/theory/commonality-tiers"
import { ChordInputRow } from "@/app/(app)/tools/_components/chord-input-row"
import { TransposedRow } from "./transposed-row"
import { btn } from "@/lib/button-styles"

const ROOT_NOTES = [
  "Ab", "A", "A#", "Bb", "B", "C", "C#", "Db", "D", "D#", "Eb", "E",
  "F", "F#", "Gb", "G", "G#",
] as const

// Group modes by commonality tier for the <optgroup> dropdown
const MODE_GROUPS = [
  { label: "Common",   modes: ALL_KEY_MODES.filter(m => m.tier === 1) },
  { label: "Modal",    modes: ALL_KEY_MODES.filter(m => m.tier === 2 || m.tier === 3) },
  { label: "Advanced", modes: ALL_KEY_MODES.filter(m => m.tier >= 4) },
]

const SELECT_CLASS =
  "bg-card border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent w-fit"

interface ChordEntry {
  id: string
  symbol: string
}

export function TransposerClient() {
  const [sourceRoot, setSourceRoot] = useState("C")
  const [modeIdx, setModeIdx]       = useState(0)          // index into ALL_KEY_MODES
  const [targetRoot, setTargetRoot] = useState("G")
  const [chords, setChords]         = useState<ChordEntry[]>([])
  const [editingId, setEditingId]   = useState<string | null>(null)

  const sourceMode = ALL_KEY_MODES[modeIdx]!

  const parsedChords = useMemo(
    () => chords.map(c => parseChord(c.symbol)).filter((c): c is NonNullable<typeof c> => c !== null),
    [chords],
  )

  // Always compute source analysis when chords are present — source key is explicit
  const chordAnalyses = useMemo(
    () => parsedChords.length > 0
      ? analyzeProgression(parsedChords, sourceRoot, sourceMode.modeName)
      : null,
    [parsedChords, sourceRoot, sourceMode.modeName],
  )

  // Transposed chords — null when source === target (by chroma)
  const transposedChords = useMemo(() => {
    if (parsedChords.length === 0) return null
    const sc = Note.chroma(sourceRoot)
    const tc = Note.chroma(targetRoot)
    if (sc === tc) return null
    return transposeProgression(parsedChords, sourceRoot, targetRoot, sourceMode.modeName)
  }, [parsedChords, sourceRoot, targetRoot, sourceMode.modeName])

  // Analyse the transposed chords in the target key
  const transposedAnalyses = useMemo(
    () => transposedChords
      ? analyzeProgression(transposedChords, targetRoot, sourceMode.modeName)
      : null,
    [transposedChords, targetRoot, sourceMode.modeName],
  )

  const handleAdd = useCallback(() => {
    const id = crypto.randomUUID()
    setChords(prev => [...prev, { id, symbol: "" }])
    setEditingId(id)
  }, [])

  const handleCommit = useCallback((id: string, symbol: string) => {
    setEditingId(null)
    if (!symbol) {
      setChords(prev => prev.filter(c => c.id !== id))
    } else {
      setChords(prev => prev.map(c => c.id === id ? { ...c, symbol } : c))
    }
  }, [])

  const handleRemove = useCallback((id: string) => {
    setChords(prev => prev.filter(c => c.id !== id))
  }, [])

  const handleStartEdit = useCallback((id: string) => {
    setEditingId(id)
  }, [])

  const handleClear = useCallback(() => {
    setChords([])
    setEditingId(null)
  }, [])

  return (
    <div className="flex flex-col gap-6">

      {/* Source key selectors */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs uppercase tracking-widest text-muted-foreground whitespace-nowrap">
          Source key
        </span>
        <select
          value={sourceRoot}
          onChange={e => setSourceRoot(e.target.value)}
          aria-label="Source root"
          className={SELECT_CLASS}
        >
          {ROOT_NOTES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={modeIdx}
          onChange={e => setModeIdx(Number(e.target.value))}
          aria-label="Mode"
          className={SELECT_CLASS}
        >
          {MODE_GROUPS.map(group => (
            <optgroup key={group.label} label={group.label}>
              {group.modes.map(mode => {
                const idx = ALL_KEY_MODES.findIndex(m => m.modeName === mode.modeName)
                return (
                  <option key={mode.modeName} value={idx}>
                    {mode.displayName}
                  </option>
                )
              })}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Chord input */}
      <ChordInputRow
        chords={chords}
        editingId={editingId}
        chordAnalyses={chordAnalyses}
        onChordChange={setChords}
        onCommit={handleCommit}
        onRemove={handleRemove}
        onStartEdit={handleStartEdit}
        onAdd={handleAdd}
      />

      {chords.length === 0 && (
        <p className="text-sm text-muted-foreground">Add chords to transpose.</p>
      )}

      {chords.length > 0 && (
        <div>
          <button type="button" onClick={handleClear} className={btn("destructive", "sm")}>
            Clear
          </button>
        </div>
      )}

      {/* Target key selector — shown once chords are entered */}
      {chords.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs uppercase tracking-widest text-muted-foreground whitespace-nowrap">
            Target key
          </span>
          <select
            value={targetRoot}
            onChange={e => setTargetRoot(e.target.value)}
            aria-label="Target root"
            className={SELECT_CLASS}
          >
            {ROOT_NOTES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {/* Static mode label — mode is always the same as source */}
          <span className="text-sm text-muted-foreground">{sourceMode.displayName}</span>
        </div>
      )}

      {/* Transposed output row */}
      {transposedChords && transposedAnalyses && (
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            In {targetRoot} {sourceMode.displayName}
          </p>
          <TransposedRow chords={transposedChords} analyses={transposedAnalyses} />
        </div>
      )}

    </div>
  )
}
