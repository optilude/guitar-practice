"use client"

import { useState, useEffect, useMemo } from "react"
import { Note, Scale } from "tonal"
import { getDiatonicChords, getSoloScales, SOLO_MODE_OPTION_GROUPS, getSubstitutions } from "@/lib/theory"
import { SCALE_TONAL_NAMES } from "@/lib/theory/solo-scales"
import { ChordQualityBlock } from "./chord-quality-block"
import { SoloScalesPanel } from "./solo-scales-panel"
import { SubstitutionsPanel } from "./substitutions-panel"
import { AddToGoalButton } from "@/components/add-to-goal-button"
import { cn } from "@/lib/utils"
import type { ChordSubstitution, PreviewChord, ProgressionChord } from "@/lib/theory/types"

interface HarmonyTabProps {
  tonic: string
  defaultMode?: string
  onChordSelect?: (tonic: string, type: string, quality: string, primaryScaleName: string) => void
  onScaleSelect?: (tonic: string, scaleName: string) => void
}

const MAJOR_MODE_SET = new Set([
  "ionian", "dorian", "phrygian", "lydian", "mixolydian", "aeolian", "locrian",
])

const MELODIC_MINOR_MODE_SET = new Set([
  "melodic minor", "dorian b2", "lydian augmented", "lydian dominant",
  "mixolydian b6", "locrian #2", "altered",
])

const HARMONIC_MINOR_MODE_SET = new Set([
  "harmonic minor", "locrian #6", "ionian #5", "dorian #4",
  "phrygian dominant", "lydian #2", "altered diminished",
])

// 0-indexed degree offset for all 21 modes (within their family)
const MODE_DEGREE_OFFSET: Record<string, number> = {
  // Major family
  ionian: 0, dorian: 1, phrygian: 2, lydian: 3, mixolydian: 4, aeolian: 5, locrian: 6,
  // Melodic minor family
  "melodic minor": 0, "dorian b2": 1, "lydian augmented": 2, "lydian dominant": 3,
  "mixolydian b6": 4, "locrian #2": 5, "altered": 6,
  // Harmonic minor family
  "harmonic minor": 0, "locrian #6": 1, "ionian #5": 2, "dorian #4": 3,
  "phrygian dominant": 4, "lydian #2": 5, "altered diminished": 6,
}

// Roman numerals for the 7 diatonic degrees of a major scale
const MAJOR_ROMAN: Record<number, string> = {
  1: "I", 2: "ii", 3: "iii", 4: "IV", 5: "V", 6: "vi", 7: "vii°",
}

// Display name for each internal mode identifier (derived from SOLO_MODE_OPTION_GROUPS)
const MODE_DISPLAY_NAME: Record<string, string> = Object.fromEntries(
  SOLO_MODE_OPTION_GROUPS.flatMap(g => g.options.map(o => [o.value, o.label]))
)

// ---------------------------------------------------------------------------
// Derived tonic — the modal root note given the circle key and chosen mode
// ---------------------------------------------------------------------------

function computeDerivedTonic(circleKey: string, mode: string): string {
  const offset = MODE_DEGREE_OFFSET[mode] ?? 0

  if (MAJOR_MODE_SET.has(mode)) {
    if (offset === 0) return circleKey
    return Scale.get(`${circleKey} major`).notes[offset] ?? circleKey
  }

  // Relative minor root: C → A, G → E, etc.
  const relMinorRoot = Note.transpose(circleKey, "-3m")

  if (MELODIC_MINOR_MODE_SET.has(mode)) {
    if (offset === 0) return relMinorRoot
    return Scale.get(`${relMinorRoot} melodic minor`).notes[offset] ?? relMinorRoot
  }

  // Harmonic minor family
  if (offset === 0) return relMinorRoot
  return Scale.get(`${relMinorRoot} harmonic minor`).notes[offset] ?? relMinorRoot
}

// ---------------------------------------------------------------------------
// Preview helpers
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

export function HarmonyTab({ tonic, defaultMode, onChordSelect, onScaleSelect }: HarmonyTabProps) {
  const [mode, setMode] = useState(defaultMode ?? "ionian")
  const [selectedDegree, setSelectedDegree] = useState<number | null>(1)
  const [relative, setRelative] = useState(false)
  const [previewedSub, setPreviewedSub] = useState<ChordSubstitution | null>(null)
  const [chordDetailTab, setChordDetailTab] = useState<"soloing" | "substitutions">("soloing")

  // The modal root note — derived from the circle key + mode
  const derivedTonic = computeDerivedTonic(tonic, mode)
  const modeDisplayName = MODE_DISPLAY_NAME[mode] ?? mode

  const chords = getDiatonicChords(derivedTonic, mode)
  const selectedChord =
    selectedDegree !== null ? chords.find((c) => c.degree === selectedDegree) ?? null : null
  const selectedIndex = chords.findIndex(c => c.degree === selectedDegree)
  const scales = selectedChord
    ? getSoloScales(
        { tonic: selectedChord.tonic, type: selectedChord.type, degree: selectedChord.degree },
        mode
      )
    : null

  // "Over the whole mode" scale — shown in the Soloing panel when no chord is selected
  const tonalScaleName = SCALE_TONAL_NAMES[modeDisplayName] ?? mode
  const modeScaleNotes = Scale.get(`${derivedTonic} ${tonalScaleName}`).notes.join(" ")

  // Notify parent of degree-1 chord whenever the circle key changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const chord = chords.find((c) => c.degree === 1)
    if (chord) {
      const soloScales = getSoloScales({ tonic: chord.tonic, type: chord.type, degree: chord.degree }, mode)
      onChordSelect?.(chord.tonic, chord.type, chord.quality, soloScales.primary.scaleName)
    }
  }, [tonic])

  // Notify parent of degree-1 chord whenever mode changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const chord = chords.find((c) => c.degree === 1)
    if (chord) {
      const soloScales = getSoloScales({ tonic: chord.tonic, type: chord.type, degree: chord.degree }, mode)
      onChordSelect?.(chord.tonic, chord.type, chord.quality, soloScales.primary.scaleName)
    }
  }, [mode])

  const modeOffset = MODE_DEGREE_OFFSET[mode] ?? 0

  function relativeRoman(degree: number): string {
    const relDegree = ((degree - 1 + modeOffset) % 7) + 1
    return MAJOR_ROMAN[relDegree] ?? degree.toString()
  }

  const { previewChords, highlightIndices } = useMemo(() => {
    if (!previewedSub) {
      return { previewChords: chords.map(chordToPreview), highlightIndices: new Set<number>() }
    }
    return applyPreview(chords, previewedSub)
  }, [chords, previewedSub])

  // Only rules 1–5 (sortRank < 50): no look-ahead beyond a single chord
  const substitutions = useMemo(
    () => selectedIndex !== -1 && selectedChord
      ? getSubstitutions(selectedChord, chords, selectedIndex, derivedTonic, mode).filter(s => s.sortRank < 50)
      : [],
    [selectedChord, chords, selectedIndex, derivedTonic, mode],
  )

  function handleChordClick(degree: number) {
    setPreviewedSub(null)
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
      <div className="flex items-center gap-3 flex-wrap">
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
            setPreviewedSub(null)
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
          defaultKey={derivedTonic}
          displayName={`${derivedTonic} ${modeDisplayName}`}
        />
      </div>

      {/* Diatonic chord blocks */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {derivedTonic} {modeDisplayName}
            &nbsp; &bull;&nbsp;
            diatonic 7th chords
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
          {previewChords.map((chord, i) => (
            <ChordQualityBlock
              key={i}
              roman={relative && chord.degree !== undefined ? relativeRoman(chord.degree) : chord.roman}
              chordName={`${chord.tonic}${chord.type}`}
              degree={chord.degree ?? 1}
              isSelected={!previewedSub && selectedDegree !== null && chord.degree === selectedDegree}
              onClick={() => {
                if (previewedSub && chord.degree === selectedDegree) {
                  setPreviewedSub(null)
                  return
                }
                if (chord.degree !== undefined) {
                  handleChordClick(chord.degree)
                } else {
                  setPreviewedSub(null)
                }
              }}
              variant={chord.degree !== undefined ? "diatonic" : "non-diatonic"}
              isSubstitutionPreview={highlightIndices.has(i)}
            />
          ))}
        </div>
      </div>

      {/* Per-chord detail + "over the whole mode" hint */}
      {selectedChord ? (
        <div className="space-y-3">
          <div className="flex rounded border border-border overflow-hidden text-sm w-fit">
            <button
              type="button"
              onClick={() => setChordDetailTab("soloing")}
              className={cn(
                "px-3 py-1.5 transition-colors",
                chordDetailTab === "soloing"
                  ? "bg-accent text-accent-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              Soloing
            </button>
            <button
              type="button"
              onClick={() => setChordDetailTab("substitutions")}
              className={cn(
                "px-3 py-1.5 transition-colors border-l border-border",
                chordDetailTab === "substitutions"
                  ? "bg-accent text-accent-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              Substitutions
            </button>
          </div>

          {chordDetailTab === "soloing" && scales && (
            <div className="space-y-3">
              {/* "Over the whole mode" hint — shown at top of Soloing tab */}
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                  Over the whole mode
                </p>
                {onScaleSelect ? (
                  <button
                    type="button"
                    onClick={() => onScaleSelect(derivedTonic, modeDisplayName)}
                    className="flex items-center gap-3 flex-wrap text-left group cursor-pointer"
                    title="Open in Scales tab"
                  >
                    <span className="flex items-baseline gap-1">
                      <span className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                        {derivedTonic} {modeDisplayName}
                      </span>
                      <span className="text-xs text-muted-foreground/40 group-hover:text-accent transition-colors select-none">⏵</span>
                    </span>
                    {modeScaleNotes && (
                      <span className="text-xs text-muted-foreground">· {modeScaleNotes}</span>
                    )}
                  </button>
                ) : (
                  <p className="text-sm font-semibold text-foreground">
                    {derivedTonic} {modeDisplayName}
                  </p>
                )}
              </div>
              <SoloScalesPanel
                scales={scales}
                chordName={`${selectedChord.tonic}${selectedChord.type}`}
                romanNumeral={selectedChord.roman}
                onScaleSelect={onScaleSelect}
              />
            </div>
          )}

          {chordDetailTab === "substitutions" && (
            <SubstitutionsPanel
              substitutions={substitutions}
              chordName={`${selectedChord.tonic}${selectedChord.type}`}
              previewedId={previewedSub?.id ?? null}
              onPreview={setPreviewedSub}
            />
          )}
        </div>
      ) : (
        /* No chord selected — show "over the whole mode" hint */
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
            Over the whole mode
          </p>
          {onScaleSelect ? (
            <button
              type="button"
              onClick={() => onScaleSelect(derivedTonic, modeDisplayName)}
              className="flex items-center gap-3 flex-wrap text-left group cursor-pointer"
              title="Open in Scales tab"
            >
              <span className="flex items-baseline gap-1">
                <span className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                  {derivedTonic} {modeDisplayName}
                </span>
                <span className="text-xs text-muted-foreground/40 group-hover:text-accent transition-colors select-none">⏵</span>
              </span>
              {modeScaleNotes && (
                <span className="text-xs text-muted-foreground">· {modeScaleNotes}</span>
              )}
            </button>
          ) : (
            <p className="text-sm font-semibold text-foreground">
              {derivedTonic} {modeDisplayName}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
