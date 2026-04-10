"use client"

import { useCallback, useMemo, useState } from "react"
import { parseChord, applyFunctionalRomanOverrides, analyzeChordInKey } from "@/lib/theory/key-finder"
import { analyzeProgression } from "@/lib/theory/transposer"
import { getSubstitutions, getSoloScales, analyzeFunctionalContext } from "@/lib/theory"
import type { FunctionalAnalysis, ChordContext } from "@/lib/theory"
import { ALL_KEY_MODES } from "@/lib/theory/commonality-tiers"
import { ChordInputRow } from "@/app/(app)/tools/_components/chord-input-row"
import { ChordQualityBlock, targetDegreeFromRoman } from "@/app/(app)/reference/_components/chord-quality-block"
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

  const { previewChords, highlightIndices } = useMemo(() => {
    if (!previewedSub || progressionChords.length === 0) {
      return { previewChords: progressionChords.map(chordToPreview), highlightIndices: new Set<number>() }
    }
    return applyPreview(progressionChords, previewedSub)
  }, [progressionChords, previewedSub])

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
    if (!selectedChord || selectedIndex === null) return null
    return functionalAnalyses[selectedIndex]?.scalesOverride ??
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

  const handleChordClick = useCallback((i: number) => {
    setPreviewedSub(null)
    setSelectedIndex(prev => prev === i ? null : i)
  }, [])

  function handleApplyPermanently() {
    if (!previewedSub) return
    const { previewChords: applied } = applyPreview(progressionChords, previewedSub)
    setChords(applied.map(c => ({ id: crypto.randomUUID(), symbol: `${c.tonic}${c.type}` })))
    setPreviewedSub(null)
    setSelectedIndex(null)
    setEditingId(null)
  }

  const hasParsedChords = parsedChords.length > 0

  return (
    <div className="flex flex-col gap-6">

      {/* Key + Mode */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs uppercase tracking-widest text-muted-foreground whitespace-nowrap">Key</span>
        <select
          value={key}
          onChange={e => setKey(e.target.value)}
          aria-label="Key"
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
              {group.modes.map(m => {
                const idx = ALL_KEY_MODES.findIndex(km => km.modeName === m.modeName)
                return <option key={m.modeName} value={idx}>{m.displayName}</option>
              })}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Title</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="My progression"
          className="w-full rounded border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          placeholder="Describe this progression… (supports markdown)"
          className="w-full rounded border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-y"
        />
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
        />
      </div>

      {/* Analysed chord tiles — selectable; mirrors progressions-tab chord display */}
      {hasParsedChords && (
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Analysis in {key} {mode.displayName}
          </p>
          <div role="group" aria-label="Analysed chords" className="flex flex-wrap items-center gap-1">
            {previewChords.map((chord, i) => {
              const displayRoman = !previewedSub && selectedIndex !== null
                ? (functionalAnalyses[i]?.romanOverride ?? chord.roman)
                : chord.roman
              const targetDegree = targetDegreeFromRoman(displayRoman)
              const inputChord = parseChord(`${chord.tonic}${chord.type}`)
              const keyAnalysis = inputChord ? analyzeChordInKey(inputChord, key, mode.modeName) : null
              const role = keyAnalysis?.role ?? "non-diatonic"
              const effectiveDegree = targetDegree ?? keyAnalysis?.degree ?? chord.degree ?? 1
              const effectiveVariant = targetDegree !== null
                ? "borrowed"
                : role === "diatonic" ? "diatonic"
                : role === "borrowed" ? "borrowed"
                : "non-diatonic"
              return (
                <div key={i} className="flex items-center gap-1 flex-shrink-0">
                  {i > 0 && <span className="text-muted-foreground text-sm flex-shrink-0">→</span>}
                  <ChordQualityBlock
                    roman={displayRoman}
                    chordName={`${chord.tonic}${chord.type}`}
                    degree={effectiveDegree}
                    isSelected={!previewedSub && selectedIndex === i}
                    onClick={() => handleChordClick(i)}
                    variant={effectiveVariant}
                    isSubstitutionPreview={highlightIndices.has(i)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!hasParsedChords && (
        <p className="text-sm text-muted-foreground">Add chords above to see harmonic analysis.</p>
      )}

      {/* Per-chord tabs — shown when a chord is selected */}
      {selectedChord && (
        <div className="space-y-3">
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
            <div className="space-y-3">
              <SubstitutionsPanel
                substitutions={substitutions}
                chordName={`${selectedChord.tonic}${selectedChord.type}`}
                previewedId={previewedSub?.id ?? null}
                onPreview={setPreviewedSub}
              />
              {previewedSub && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={handleApplyPermanently}
                    className={btn("primary", "sm")}
                  >
                    Apply permanently
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewedSub(null)}
                    className={btn("standalone", "sm")}
                  >
                    Cancel preview
                  </button>
                </div>
              )}
            </div>
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

      {/* Save button */}
      <div className="pt-2 border-t border-border">
        <button
          type="button"
          disabled={!hasParsedChords}
          onClick={() => setSaveModalOpen(true)}
          className={btn("primary")}
        >
          Save to My Progressions
        </button>
      </div>

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
