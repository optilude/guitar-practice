"use client"

import { useCallback, useMemo, useState } from "react"
import { parseChord, applyFunctionalRomanOverrides } from "@/lib/theory/key-finder"
import { analyzeProgression } from "@/lib/theory/transposer"
import { getSubstitutions, getSoloScales, analyzeFunctionalContext } from "@/lib/theory"
import type { FunctionalAnalysis, ChordContext } from "@/lib/theory"
import { ALL_KEY_MODES } from "@/lib/theory/commonality-tiers"
import { ChordInputRow } from "@/app/(app)/tools/_components/chord-input-row"
import { targetDegreeFromRoman } from "@/app/(app)/reference/_components/chord-quality-block"
import { SubstitutionsPanel } from "@/app/(app)/reference/_components/substitutions-panel"
import { SoloScalesPanel } from "@/app/(app)/reference/_components/solo-scales-panel"
import { buildProgressionChords } from "../_lib/build-progression-chords"
import { SaveModal } from "./save-modal"
import { btn } from "@/lib/button-styles"
import { cn } from "@/lib/utils"
import type { ChordSubstitution, PreviewChord, ProgressionChord } from "@/lib/theory/types"

const ROOT_NOTES = [
  "Ab", "A", "A#", "Bb", "B", "C", "C#", "Db", "D", "D#", "Eb", "E",
  "F", "F#", "Gb", "G", "G#",
] as const

const MODE_GROUPS = [
  { label: "Common",   modes: ALL_KEY_MODES.filter(m => m.tier === 1) },
  { label: "Modal",    modes: ALL_KEY_MODES.filter(m => m.tier === 2 || m.tier === 3) },
  { label: "Advanced", modes: ALL_KEY_MODES.filter(m => m.tier >= 4) },
]

const SELECT_CLASS =
  "bg-card border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent w-fit"

type ChordEntry = { id: string; symbol: string }

// ---------------------------------------------------------------------------
// Preview helpers (mirrors progressions-tab.tsx — intentional parallel copy)
// ---------------------------------------------------------------------------

function chordToPreview(c: ProgressionChord): PreviewChord {
  return { tonic: c.tonic, type: c.type, roman: c.roman, quality: c.quality, degree: c.degree }
}

function applyPreview(
  chords: ProgressionChord[],
  sub: ChordSubstitution,
): { previewChords: PreviewChord[]; highlightIndices: Set<number> } {
  const base = chords.map(chordToPreview)
  const { result } = sub

  if (result.kind === "replacement") {
    const preview = [...base]
    const indices = new Set<number>()
    for (const { index, chord } of result.replacements) {
      preview[index] = chord
      indices.add(index)
    }
    return { previewChords: preview, highlightIndices: indices }
  }

  if (result.kind === "insertion") {
    const preview = [
      ...base.slice(0, result.insertBefore),
      ...result.chords,
      ...base.slice(result.insertBefore),
    ]
    const count = result.chords.length
    const indices = new Set(
      Array.from({ length: count + 1 }, (_, i) => result.insertBefore + i),
    )
    return { previewChords: preview, highlightIndices: indices }
  }

  // range_replacement
  const preview = [
    ...base.slice(0, result.startIndex),
    ...result.chords,
    ...base.slice(result.endIndex + 1),
  ]
  const indices = new Set(
    Array.from({ length: result.chords.length }, (_, i) => result.startIndex + i),
  )
  return { previewChords: preview, highlightIndices: indices }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AnalyserClient() {
  const [key, setKey]         = useState("C")
  const [modeIdx, setModeIdx] = useState(0)
  const [title, setTitle]     = useState("")
  const [description, setDescription] = useState("")
  const [chords, setChords]   = useState<ChordEntry[]>([])
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [previewedSub, setPreviewedSub]   = useState<ChordSubstitution | null>(null)
  const [activeTab, setActiveTab]         = useState<"substitutions" | "soloing">("substitutions")
  const [saveModalOpen, setSaveModalOpen] = useState(false)

  const mode = ALL_KEY_MODES[modeIdx]!

  const parsedChords = useMemo(
    () => chords.map(c => parseChord(c.symbol)).filter((c): c is NonNullable<typeof c> => c !== null),
    [chords],
  )

  const chordAnalyses = useMemo(
    () => parsedChords.length > 0 ? analyzeProgression(parsedChords, key, mode.modeName) : [],
    [parsedChords, key, mode.modeName],
  )

  const displayAnalyses = useMemo(
    () => chordAnalyses.length > 0
      ? applyFunctionalRomanOverrides(chordAnalyses, key, mode.modeName)
      : [],
    [chordAnalyses, key, mode.modeName],
  )

  const progressionChords = useMemo(
    () => buildProgressionChords(parsedChords, displayAnalyses),
    [parsedChords, displayAnalyses],
  )

  const functionalAnalyses = useMemo(
    (): FunctionalAnalysis[] =>
      progressionChords.map((chord, i) =>
        analyzeFunctionalContext(
          { ...chord, quality: chord.quality as ChordContext["quality"] },
          progressionChords[i + 1]
            ? { ...progressionChords[i + 1]!, quality: progressionChords[i + 1]!.quality as ChordContext["quality"] }
            : null,
          key,
          mode.modeName,
        )
      ),
    [progressionChords, key, mode.modeName],
  )

  const selectedChord = selectedIndex !== null ? progressionChords[selectedIndex] ?? null : null

  const selectedDisplayRoman = selectedIndex !== null
    ? (functionalAnalyses[selectedIndex]?.romanOverride ?? progressionChords[selectedIndex]?.roman ?? null)
    : null

  const scales = useMemo(() => {
    if (!selectedChord) return null
    return functionalAnalyses[selectedIndex!]?.scalesOverride ??
      getSoloScales({ tonic: selectedChord.tonic, type: selectedChord.type, degree: selectedChord.degree }, mode.modeName)
  }, [selectedChord, selectedIndex, functionalAnalyses, mode.modeName])

  const substitutions = useMemo(
    () => selectedIndex !== null && selectedChord
      ? getSubstitutions(selectedChord, progressionChords, selectedIndex, key, mode.modeName)
      : [],
    [selectedChord, progressionChords, selectedIndex, key, mode.modeName],
  )

  const handleAdd = useCallback(() => {
    const id = crypto.randomUUID()
    setChords(prev => [...prev, { id, symbol: "" }])
    setEditingId(id)
  }, [])

  const handleCommit = useCallback((id: string, symbol: string) => {
    setEditingId(null)
    if (!symbol) setChords(prev => prev.filter(c => c.id !== id))
    else setChords(prev => prev.map(c => c.id === id ? { ...c, symbol } : c))
    setSelectedIndex(null)
    setPreviewedSub(null)
  }, [])

  const handleRemove = useCallback((id: string) => {
    setChords(prev => prev.filter(c => c.id !== id))
    setSelectedIndex(null)
    setPreviewedSub(null)
  }, [])

  const handleStartEdit = useCallback((id: string) => setEditingId(id), [])

  const handleApplyPermanently = useCallback((sub: ChordSubstitution) => {
    const { previewChords: applied } = applyPreview(progressionChords, sub)
    setChords(applied.map(c => ({ id: crypto.randomUUID(), symbol: `${c.tonic}${c.type}` })))
    setPreviewedSub(null)
    setSelectedIndex(null)
    setEditingId(null)
  }, [progressionChords])

  const hasParsedChords = parsedChords.length > 0

  const chordIdToAnalysisIdx = useMemo(() => {
    const map = new Map<string, number>()
    let idx = 0
    for (const chord of chords) {
      if (parseChord(chord.symbol) !== null) {
        map.set(chord.id, idx++)
      }
    }
    return map
  }, [chords])

  const selectedId = selectedIndex !== null ? (chords[selectedIndex]?.id ?? null) : null

  const handleSelect = useCallback((id: string) => {
    const i = chords.findIndex(c => c.id === id)
    if (i === -1) return
    setPreviewedSub(null)
    setSelectedIndex(prev => prev === i ? null : i)
  }, [chords])

  const getDisplayAnalysis = useCallback((id: string) => {
    const analysisIdx = chordIdToAnalysisIdx.get(id)
    if (analysisIdx === undefined) return null
    const pc = progressionChords[analysisIdx]
    const fa = functionalAnalyses[analysisIdx]
    if (!pc) return null
    const roman = fa?.romanOverride ?? pc.roman
    const tgtDeg = targetDegreeFromRoman(roman)
    const role = displayAnalyses[analysisIdx]?.role ?? "diatonic"
    const degree = tgtDeg ?? pc.degree
    const variant: "diatonic" | "borrowed" | "non-diatonic" = tgtDeg !== null
      ? "borrowed"
      : role === "diatonic" ? "diatonic"
      : role === "borrowed" ? "borrowed"
      : "non-diatonic"
    return { roman, degree, variant }
  }, [chordIdToAnalysisIdx, progressionChords, functionalAnalyses, displayAnalyses])

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left column */}
      <div className="flex flex-col gap-6 flex-1 min-w-0">
        {/* Title */}
        <div className="max-w-sm">
          <label className="block text-xs text-muted-foreground mb-1">Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="My progression"
            className="w-full rounded border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Description */}
        <div className="max-w-sm">
          <label className="block text-xs text-muted-foreground mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe this progression… (supports markdown)"
            className="w-full rounded border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-y"
          />
        </div>

        {/* Key + Mode */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" aria-hidden="true">Key</label>
            <select
              value={key}
              onChange={e => setKey(e.target.value)}
              aria-label="Key"
              className={SELECT_CLASS}
            >
              {ROOT_NOTES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" aria-hidden="true">Mode</label>
            <select
              value={modeIdx}
              onChange={e => setModeIdx(Number(e.target.value))}
              aria-label="Mode"
              className={SELECT_CLASS}
            >
              {MODE_GROUPS.map(group => (
                <optgroup key={group.label} label={group.label}>
                  {group.modes.map(m => {
                    const idx = ALL_KEY_MODES.findIndex(km => km.modeName === m.modeName)
                    return <option key={m.modeName} value={idx}>{m.displayName}</option>
                  })}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {/* Chord input */}
        <div>
          <label className="block text-xs text-muted-foreground mb-2">Chords</label>
          <ChordInputRow
            chords={chords}
            editingId={editingId}
            chordAnalyses={displayAnalyses}
            onChordChange={setChords}
            onCommit={handleCommit}
            onRemove={handleRemove}
            onStartEdit={handleStartEdit}
            onAdd={handleAdd}
            selectedId={selectedId}
            onSelect={handleSelect}
            getDisplayAnalysis={getDisplayAnalysis}
          />
        </div>

        {/* Save button */}
        <div>
          <button
            type="button"
            disabled={!hasParsedChords}
            onClick={() => setSaveModalOpen(true)}
            className={btn("primary")}
          >
            Save
          </button>
        </div>
      </div>

      {/* Right column — analysis panels (only when chord selected) */}
      {selectedChord && (
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex rounded border border-border overflow-hidden text-sm w-fit">
            <button
              type="button"
              onClick={() => setActiveTab("substitutions")}
              className={cn(
                "px-3 py-1.5 transition-colors",
                activeTab === "substitutions"
                  ? "bg-accent text-accent-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              Substitutions
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("soloing")}
              className={cn(
                "px-3 py-1.5 transition-colors border-l border-border",
                activeTab === "soloing"
                  ? "bg-accent text-accent-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              Soloing
            </button>
          </div>

          {activeTab === "substitutions" && (
            <SubstitutionsPanel
              substitutions={substitutions}
              chordName={`${selectedChord.tonic}${selectedChord.type}`}
              previewedId={previewedSub?.id ?? null}
              onPreview={setPreviewedSub}
              onApply={handleApplyPermanently}
            />
          )}

          {activeTab === "soloing" && scales && (
            <SoloScalesPanel
              scales={scales}
              chordName={`${selectedChord.tonic}${selectedChord.type}`}
              romanNumeral={selectedDisplayRoman ?? undefined}
            />
          )}
        </div>
      )}

      {/* Save modal */}
      {saveModalOpen && (
        <SaveModal
          parsedChords={parsedChords}
          tonic={key}
          modeName={mode.modeName}
          initialTitle={title}
          initialDescription={description}
          onClose={() => setSaveModalOpen(false)}
        />
      )}
    </div>
  )
}
