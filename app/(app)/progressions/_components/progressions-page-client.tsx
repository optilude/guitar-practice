"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { parseChord, applyFunctionalRomanOverrides, analyzeChordInKey } from "@/lib/theory/key-finder"
import { analyzeProgression } from "@/lib/theory/transposer"
import { listProgressions, getProgression, getSubstitutions, getSoloScales, analyzeFunctionalContext, INVERSION_TYPES } from "@/lib/theory"
import type { FunctionalAnalysis, ChordContext } from "@/lib/theory"
import { getUserProgressionChords } from "@/lib/theory/user-progressions"
import { ALL_KEY_MODES } from "@/lib/theory/commonality-tiers"
import { buildProgressionChords } from "@/lib/theory/build-progression-chords"
import { targetDegreeFromRoman } from "@/app/(app)/reference/_components/chord-quality-block"
import { ChordInputRow, type PreviewTile } from "@/app/(app)/tools/_components/chord-input-row"
import { SubstitutionsPanel } from "@/app/(app)/reference/_components/substitutions-panel"
import { SoloScalesPanel } from "@/app/(app)/reference/_components/solo-scales-panel"
import { ScalePanel } from "@/app/(app)/reference/_components/scale-panel"
import { ArpeggioPanel } from "@/app/(app)/reference/_components/arpeggio-panel"
import { ChordPanel } from "@/app/(app)/reference/_components/chord-panel"
import { InversionPanel } from "@/app/(app)/reference/_components/inversion-panel"
import { ProgressionSelector } from "./progression-selector"
import { SaveAsModal } from "./save-as-modal"
import { EditMetaModal } from "./edit-meta-modal"
import { DeleteConfirmModal } from "./delete-confirm-modal"
import { updateUserProgression } from "@/app/(app)/progressions/actions"
import { btn } from "@/lib/button-styles"
import { cn } from "@/lib/utils"
import { Scale } from "tonal"
import { SCALE_TONAL_NAMES } from "@/lib/theory/solo-scales"
import type { ChordSubstitution, PreviewChord, ProgressionChord } from "@/lib/theory/types"
import type { UserProgressionForTab } from "@/app/(app)/reference/_components/reference-page-client"

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
  "bg-card border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"

type ChordEntry = { id: string; symbol: string }
type PanelTab = "scales" | "arpeggios" | "chords" | "inversions"

const PANEL_TABS: { id: PanelTab; label: string }[] = [
  { id: "scales",     label: "Scales" },
  { id: "arpeggios",  label: "Arpeggios" },
  { id: "chords",     label: "Chords" },
  { id: "inversions", label: "Inversions" },
]

const QUALITY_TO_INVERSION_TYPE: Record<string, string> = {
  major: "major", minor: "minor", dominant: "major", diminished: "dim", augmented: "aug",
}

const SOLO_SCALE_TO_PANEL_TYPE: Record<string, string> = {
  "Ionian (major)": "Major", "Dorian": "Dorian", "Phrygian": "Phrygian",
  "Lydian": "Lydian", "Mixolydian": "Mixolydian", "Aeolian (natural minor)": "Aeolian",
  "Locrian": "Locrian", "Major Pentatonic": "Pentatonic Major", "Minor Pentatonic": "Pentatonic Minor",
  "Blues Scale": "Blues", "Locrian #2": "Locrian #2", "Altered": "Altered",
  "Lydian Dominant": "Lydian Dominant", "Lydian Augmented": "Lydian Augmented",
  "Phrygian Dominant": "Phrygian Dominant", "Bebop Dominant": "Bebop Dominant",
  "Melodic Minor": "Melodic Minor", "Harmonic Minor": "Harmonic Minor",
  "Diminished Half-Whole": "Diminished Half-Whole", "Dorian b2": "Dorian b2",
  "Mixolydian b6": "Mixolydian b6", "Locrian #6": "Locrian #6",
  "Ionian #5": "Ionian #5", "Dorian #4": "Dorian #4", "Lydian #2": "Lydian #2",
  "Altered Diminished": "Altered Diminished",
}

const MODE_TO_SOLO_SCALE_NAME: Record<string, string> = {
  ionian: "Ionian (major)", major: "Ionian (major)", dorian: "Dorian",
  phrygian: "Phrygian", lydian: "Lydian", mixolydian: "Mixolydian",
  aeolian: "Aeolian (natural minor)", minor: "Aeolian (natural minor)", locrian: "Locrian",
  "melodic minor": "Melodic Minor", "harmonic minor": "Harmonic Minor",
  "dorian b2": "Dorian b2", "lydian augmented": "Lydian Augmented",
  "lydian dominant": "Lydian Dominant", "mixolydian b6": "Mixolydian b6",
  "locrian #2": "Locrian #2", altered: "Altered",
}

// Preview helpers
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
    for (const { index, chord } of result.replacements) { preview[index] = chord; indices.add(index) }
    return { previewChords: preview, highlightIndices: indices }
  }
  if (result.kind === "insertion") {
    const preview = [...base.slice(0, result.insertBefore), ...result.chords, ...base.slice(result.insertBefore)]
    const indices = new Set(Array.from({ length: result.chords.length + 1 }, (_, i) => result.insertBefore + i))
    return { previewChords: preview, highlightIndices: indices }
  }
  const preview = [...base.slice(0, result.startIndex), ...result.chords, ...base.slice(result.endIndex + 1)]
  const indices = new Set(Array.from({ length: result.chords.length }, (_, i) => result.startIndex + i))
  return { previewChords: preview, highlightIndices: indices }
}

interface ProgressionsPageClientProps {
  userProgressions: UserProgressionForTab[]
  initialSelected?: string
}

export function ProgressionsPageClient({ userProgressions, initialSelected }: ProgressionsPageClientProps) {
  // ── Progression selection ──────────────────────────────────────────────────
  const [selected, setSelected] = useState(initialSelected ?? "pop-standard")

  // ── Analysis state ─────────────────────────────────────────────────────────
  const [key, setKey]         = useState("C")
  const [modeIdx, setModeIdx] = useState(0)
  const [chords, setChords]   = useState<ChordEntry[]>([])
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [previewedSub, setPreviewedSub]   = useState<ChordSubstitution | null>(null)
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<"substitutions" | "soloing">("substitutions")

  // ── Study panel state ──────────────────────────────────────────────────────
  const [activeStudyTab, setActiveStudyTab]                 = useState<PanelTab>("scales")
  const [panelRoot, setPanelRoot]                           = useState("C")
  const [panelScaleTypeTrigger, setPanelScaleTypeTrigger]   = useState<{ type: string } | null>(null)
  const [panelChordTypeTrigger, setPanelChordTypeTrigger]   = useState<{ type: string } | null>(null)
  const [panelArpeggioTypeTrigger, setPanelArpeggioTypeTrigger] = useState<{ type: string } | null>(null)
  const [panelInversionTypeTrigger, setPanelInversionTypeTrigger] = useState<{ type: string } | null>(null)

  // ── Modal state ────────────────────────────────────────────────────────────
  const [saveAsModalOpen, setSaveAsModalOpen]     = useState(false)
  const [editMetaModalOpen, setEditMetaModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen]     = useState(false)
  const [isSaving, setIsSaving]                   = useState(false)
  const [saveError, setSaveError]                 = useState<string | null>(null)

  // ── Derived ────────────────────────────────────────────────────────────────
  const mode             = ALL_KEY_MODES[modeIdx]!
  const builtinProgressions = useMemo(() => listProgressions(), [])
  const builtinProg      = builtinProgressions.find(p => p.name === selected)
  const userProg         = userProgressions.find(p => p.id === selected)
  const isCustom         = !!userProg

  // ── Load chords when selection changes ─────────────────────────────────────
  useEffect(() => {
    const rawChords = userProg
      ? getUserProgressionChords(userProg.degrees, userProg.mode, key)
      : getProgression(selected, key)

    setChords(rawChords.map(c => ({ id: crypto.randomUUID(), symbol: `${c.tonic}${c.type}` })))

    // Sync mode from progression
    const progModeName = userProg?.mode ?? builtinProg?.mode ?? "major"
    const newModeIdx = ALL_KEY_MODES.findIndex(m => m.modeName === progModeName)
    if (newModeIdx >= 0) setModeIdx(newModeIdx)

    setSelectedIndex(null)
    setPreviewedSub(null)
    setSaveError(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  // ── Analysis computations ──────────────────────────────────────────────────
  const parsedChords = useMemo(
    () => chords.map(c => parseChord(c.symbol)).filter((c): c is NonNullable<typeof c> => c !== null),
    [chords],
  )

  const chordAnalyses = useMemo(
    () => parsedChords.length > 0 ? analyzeProgression(parsedChords, key, mode.modeName) : [],
    [parsedChords, key, mode.modeName],
  )

  const displayAnalyses = useMemo(
    () => chordAnalyses.length > 0 ? applyFunctionalRomanOverrides(chordAnalyses, key, mode.modeName) : [],
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
          progressionChords[i + 1] ? { ...progressionChords[i + 1]!, quality: progressionChords[i + 1]!.quality as ChordContext["quality"] } : null,
          key,
          mode.modeName,
        )
      ),
    [progressionChords, key, mode.modeName],
  )

  const chordIdToAnalysisIdx = useMemo(() => {
    const map = new Map<string, number>()
    let idx = 0
    for (const chord of chords) {
      if (parseChord(chord.symbol) !== null) map.set(chord.id, idx++)
    }
    return map
  }, [chords])

  const selectedId    = selectedIndex !== null ? (chords[selectedIndex]?.id ?? null) : null
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

  const previewTiles = useMemo((): PreviewTile[] | undefined => {
    if (!previewedSub) return undefined
    const { previewChords, highlightIndices } = applyPreview(progressionChords, previewedSub)
    return previewChords.map((chord, i) => {
      const inputChord = parseChord(`${chord.tonic}${chord.type}`)
      const keyAnalysis = inputChord ? analyzeChordInKey(inputChord, key, mode.modeName) : null
      const targetDegree = targetDegreeFromRoman(chord.roman)
      const degree = targetDegree ?? keyAnalysis?.degree ?? chord.degree ?? 1
      const variant: "diatonic" | "borrowed" | "non-diatonic" = targetDegree !== null
        ? "borrowed"
        : keyAnalysis?.role === "diatonic" ? "diatonic"
        : keyAnalysis?.role === "borrowed" ? "borrowed"
        : "non-diatonic"
      return { chordName: `${chord.tonic}${chord.type}`, roman: chord.roman, degree, variant, isHighlighted: highlightIndices.has(i) }
    })
  }, [previewedSub, progressionChords, key, mode.modeName])

  // ── Over the whole progression ─────────────────────────────────────────────
  const progModeName           = userProg?.mode ?? builtinProg?.mode ?? mode.modeName
  const progressionSoloScaleName = MODE_TO_SOLO_SCALE_NAME[progModeName]
  const progressionScaleNotes    = progressionSoloScaleName
    ? Scale.get(`${key} ${SCALE_TONAL_NAMES[progressionSoloScaleName] ?? progModeName}`).notes.join(" ")
    : ""
  const recommendedScaleType    = builtinProg?.recommendedScaleType
    ?? (progressionSoloScaleName ? `${progressionSoloScaleName} Scale` : "")

  // ── Panel sync helpers ─────────────────────────────────────────────────────
  function syncPanelsForChord(chordTonic: string, type: string, quality: string, primaryScaleName: string) {
    setPanelRoot(chordTonic)
    setPanelChordTypeTrigger({ type })
    setPanelArpeggioTypeTrigger({ type })
    const inversionType = INVERSION_TYPES.includes(type) ? type : QUALITY_TO_INVERSION_TYPE[quality]
    if (inversionType) setPanelInversionTypeTrigger({ type: inversionType })
    const panelScaleType = SOLO_SCALE_TO_PANEL_TYPE[primaryScaleName]
    if (panelScaleType) setPanelScaleTypeTrigger({ type: panelScaleType })
  }

  function handleScaleSelect(scaleTonic: string, scaleName: string) {
    setPanelRoot(scaleTonic)
    const panelType = SOLO_SCALE_TO_PANEL_TYPE[scaleName]
    if (panelType) setPanelScaleTypeTrigger({ type: panelType })
    setActiveStudyTab("scales")
  }

  // ── Chord tile callbacks ───────────────────────────────────────────────────
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

  const handleSelect = useCallback((id: string) => {
    const i = chords.findIndex(c => c.id === id)
    if (i === -1) return
    setPreviewedSub(null)
    setSelectedIndex(prev => {
      const next = prev === i ? null : i
      if (next !== null) {
        const pc = progressionChords[next]
        if (pc) {
          const fa = functionalAnalyses[next]
          const soloScales = fa?.scalesOverride ??
            getSoloScales({ tonic: pc.tonic, type: pc.type, degree: pc.degree }, mode.modeName)
          syncPanelsForChord(pc.tonic, pc.type, pc.quality, soloScales.primary.scaleName)
        }
      }
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chords, progressionChords, functionalAnalyses, mode.modeName])

  const handleApplyPermanently = useCallback((sub: ChordSubstitution) => {
    const { previewChords: applied } = applyPreview(progressionChords, sub)
    setChords(applied.map(c => ({ id: crypto.randomUUID(), symbol: `${c.tonic}${c.type}` })))
    setPreviewedSub(null)
    setSelectedIndex(null)
    setEditingId(null)
  }, [progressionChords])

  // ── Save (custom progression) ──────────────────────────────────────────────
  async function handleSave() {
    if (!userProg) return
    setIsSaving(true)
    setSaveError(null)
    const degrees = parsedChords.map((pc, i) => `${displayAnalyses[i]?.roman ?? "?"}:${pc.type}`)
    const result = await updateUserProgression(userProg.id, { degrees, mode: mode.modeName })
    setIsSaving(false)
    if ("error" in result) setSaveError(result.error)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="pt-6 space-y-6">
      {/* Page heading */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Practice</p>
        <h1 className="text-2xl font-semibold text-foreground">Progressions</h1>
      </div>

      {/* Row 1: Progression selector */}
      <ProgressionSelector
        selected={selected}
        tonic={key}
        userProgressions={userProgressions}
        onSelectionChange={newSel => { setSelected(newSel); setSelectedIndex(null); setPreviewedSub(null) }}
        onEditMeta={() => setEditMetaModalOpen(true)}
      />

      {/* Row 2: Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6 w-full">
        {/* Left column */}
        <div className="flex flex-col gap-6 min-w-0 lg:flex-none lg:w-2/3">
          {/* Key + Mode */}
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex flex-col gap-1 flex-shrink-0">
              <label className="text-xs text-muted-foreground" aria-hidden="true">Key</label>
              <select
                value={key}
                onChange={e => setKey(e.target.value)}
                aria-label="Key"
                className={cn(SELECT_CLASS, "w-fit")}
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
                className={cn(SELECT_CLASS, "w-fit")}
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
              previewTiles={previewTiles}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            {isCustom && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className={btn("primary")}
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setSaveAsModalOpen(true)}
              className={btn(isCustom ? "standalone" : "primary")}
            >
              Save as...
            </button>
            {isCustom && (
              <button
                type="button"
                onClick={() => setDeleteModalOpen(true)}
                className={btn("destructive")}
              >
                Delete
              </button>
            )}
            {saveError && <p className="text-xs text-destructive">{saveError}</p>}
          </div>
        </div>

        {/* Right column: analysis */}
        <div className="min-w-0 lg:flex-1 lg:ml-auto space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Analysis</p>
          {selectedChord ? (
            <div className="space-y-3">
              <div className="flex rounded border border-border overflow-hidden text-sm w-fit">
                <button
                  type="button"
                  onClick={() => setActiveAnalysisTab("substitutions")}
                  className={cn(
                    "px-3 py-1.5 transition-colors",
                    activeAnalysisTab === "substitutions"
                      ? "bg-accent text-accent-foreground"
                      : "bg-card text-muted-foreground hover:bg-muted",
                  )}
                >
                  Substitutions
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAnalysisTab("soloing")}
                  className={cn(
                    "px-3 py-1.5 transition-colors border-l border-border",
                    activeAnalysisTab === "soloing"
                      ? "bg-accent text-accent-foreground"
                      : "bg-card text-muted-foreground hover:bg-muted",
                  )}
                >
                  Soloing
                </button>
              </div>

              {activeAnalysisTab === "substitutions" && (
                <SubstitutionsPanel
                  substitutions={substitutions}
                  chordName={`${selectedChord.tonic}${selectedChord.type}`}
                  previewedId={previewedSub?.id ?? null}
                  onPreview={setPreviewedSub}
                  onApply={handleApplyPermanently}
                />
              )}

              {activeAnalysisTab === "soloing" && scales && (
                <SoloScalesPanel
                  scales={scales}
                  chordName={`${selectedChord.tonic}${selectedChord.type}`}
                  romanNumeral={selectedDisplayRoman ?? undefined}
                  onScaleSelect={handleScaleSelect}
                />
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Select a chord tile to view substitutions and applicable chord scales.
              </p>
              {progressionSoloScaleName && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                    Over the whole progression
                  </p>
                  <button
                    type="button"
                    onClick={() => handleScaleSelect(key, progressionSoloScaleName)}
                    className="flex items-center gap-3 flex-wrap text-left group cursor-pointer"
                    title="Open in Scales tab"
                  >
                    <span className="flex items-baseline gap-1">
                      <span className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                        {key} {recommendedScaleType}
                      </span>
                      <span className="text-xs text-muted-foreground/40 group-hover:text-accent transition-colors select-none">⏵</span>
                    </span>
                    {progressionScaleNotes && (
                      <span className="text-xs text-muted-foreground">· {progressionScaleNotes}</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Study tools */}
      <section aria-label="Study tools">
        <div
          role="tablist"
          aria-label="Study panels"
          className="flex border-b border-border"
          onKeyDown={(e) => {
            const ids = PANEL_TABS.map(t => t.id)
            const current = ids.indexOf(activeStudyTab)
            if (e.key === "ArrowRight") setActiveStudyTab(ids[(current + 1) % ids.length]!)
            if (e.key === "ArrowLeft") setActiveStudyTab(ids[(current - 1 + ids.length) % ids.length]!)
          }}
        >
          {PANEL_TABS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeStudyTab === tab.id}
              aria-controls={`prog-panel-${tab.id}`}
              id={`prog-tab-${tab.id}`}
              tabIndex={activeStudyTab === tab.id ? 0 : -1}
              onClick={() => setActiveStudyTab(tab.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeStudyTab === tab.id
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`prog-panel-${activeStudyTab}`}
          aria-labelledby={`prog-tab-${activeStudyTab}`}
          className="pt-6"
        >
          {activeStudyTab === "scales"     && <ScalePanel    root={panelRoot} onRootChange={setPanelRoot} scaleTypeTrigger={panelScaleTypeTrigger} />}
          {activeStudyTab === "arpeggios"  && <ArpeggioPanel root={panelRoot} onRootChange={setPanelRoot} chordTypeTrigger={panelArpeggioTypeTrigger} />}
          {activeStudyTab === "chords"     && <ChordPanel    root={panelRoot} onRootChange={setPanelRoot} chordTypeTrigger={panelChordTypeTrigger} onScaleSelect={handleScaleSelect} />}
          {activeStudyTab === "inversions" && <InversionPanel root={panelRoot} onRootChange={setPanelRoot} inversionTypeTrigger={panelInversionTypeTrigger} onScaleSelect={handleScaleSelect} />}
        </div>
      </section>

      {/* Modals */}
      {saveAsModalOpen && (
        <SaveAsModal
          defaultTitle={userProg?.displayName ?? builtinProg?.displayName ?? ""}
          defaultDescription={userProg?.description ?? builtinProg?.description ?? ""}
          parsedChords={parsedChords}
          tonic={key}
          modeName={mode.modeName}
          onClose={() => setSaveAsModalOpen(false)}
          onSaved={newId => { setSaveAsModalOpen(false); setSelected(newId) }}
        />
      )}

      {editMetaModalOpen && userProg && (
        <EditMetaModal
          progressionId={userProg.id}
          currentTitle={userProg.displayName}
          currentDescription={userProg.description}
          onClose={() => setEditMetaModalOpen(false)}
          onSaved={() => setEditMetaModalOpen(false)}
        />
      )}

      {deleteModalOpen && userProg && (
        <DeleteConfirmModal
          progressionId={userProg.id}
          progressionTitle={userProg.displayName}
          onClose={() => setDeleteModalOpen(false)}
          onDeleted={() => { setDeleteModalOpen(false); setSelected("pop-standard") }}
        />
      )}
    </div>
  )
}
