"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import { listProgressions, getProgression, getSoloScales } from "@/lib/theory"
import { getUserProgressionChords } from "@/lib/theory/user-progressions"
import { ChordQualityBlock } from "./chord-quality-block"
import { SoloScalesPanel } from "./solo-scales-panel"
import { AddToGoalButton } from "@/components/add-to-goal-button"
import type { UserProgressionForTab } from "./reference-page-client"

const CATEGORY_ORDER = ["Pop", "Blues", "Jazz", "Rock", "Folk / Country", "Classical / Modal"]

// Map TonalJS mode names to a human-readable "X Scale" label for the
// "Over the whole progression" recommendation on user progressions.
const MODE_TO_SCALE_TYPE: Record<string, string> = {
  major:              "Major Scale",
  minor:              "Natural Minor Scale",
  dorian:             "Dorian Scale",
  phrygian:           "Phrygian Scale",
  lydian:             "Lydian Scale",
  mixolydian:         "Mixolydian Scale",
  locrian:            "Locrian Scale",
  "melodic minor":    "Melodic Minor Scale",
  "harmonic minor":   "Harmonic Minor Scale",
  "dorian b2":        "Dorian b2 Scale",
  "lydian augmented": "Lydian Augmented Scale",
  "lydian dominant":  "Lydian Dominant Scale",
  "mixolydian b6":    "Mixolydian b6 Scale",
  "locrian #2":       "Locrian #2 Scale",
  altered:            "Altered Scale",
}

function modeToScaleType(mode: string): string {
  return MODE_TO_SCALE_TYPE[mode]
    ?? `${mode.charAt(0).toUpperCase()}${mode.slice(1)} Scale`
}

interface ProgressionsTabProps {
  tonic: string
  defaultProgressionName?: string
  onChordSelect?: (tonic: string, type: string, quality: string, primaryScaleName: string) => void
  onScaleSelect?: (tonic: string, scaleName: string) => void
  userProgressions: UserProgressionForTab[]
}

export function ProgressionsTab({
  tonic,
  defaultProgressionName,
  onChordSelect,
  onScaleSelect,
  userProgressions,
}: ProgressionsTabProps) {
  // selected is either a built-in slug (e.g. "pop-standard") or a user progression id
  const [selected, setSelected] = useState(defaultProgressionName ?? "pop-standard")
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0)
  const [infoOpen, setInfoOpen] = useState(false)
  const infoRef = useRef<HTMLDivElement>(null)

  const builtinProgressions = listProgressions()
  const builtinProg = builtinProgressions.find(p => p.name === selected)
  const userProg    = userProgressions.find(p => p.id === selected)

  // Resolve chords based on which type is selected
  const chords = userProg
    ? getUserProgressionChords(userProg.degrees, userProg.mode, tonic)
    : getProgression(selected, tonic)

  // Display info derived from whichever is selected
  const romanDisplay          = userProg
    ? userProg.degrees.join(" – ")
    : builtinProg?.romanDisplay ?? ""
  const recommendedScaleType  = userProg
    ? modeToScaleType(userProg.mode)
    : builtinProg?.recommendedScaleType ?? ""
  const mode                  = userProg?.mode ?? builtinProg?.mode ?? "major"

  const selectedChord = selectedIndex !== null ? chords[selectedIndex] ?? null : null

  // Close popover on click-outside
  useEffect(() => {
    if (!infoOpen) return
    function handlePointerDown(e: PointerEvent) {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setInfoOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setInfoOpen(false)
    }
    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [infoOpen])

  // Notify parent of the initial auto-selected chord on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const chord = chords[0]
    if (chord) {
      const soloScales = getSoloScales({ tonic: chord.tonic, type: chord.type, degree: chord.degree }, mode)
      onChordSelect?.(chord.tonic, chord.type, chord.quality, soloScales.primary.scaleName)
    }
  }, []) // intentionally empty: only on mount

  const scales = selectedChord
    ? getSoloScales(
        { tonic: selectedChord.tonic, type: selectedChord.type, degree: selectedChord.degree },
        mode
      )
    : null

  function handleIndexClick(index: number) {
    if (selectedIndex !== index) {
      const chord = chords[index]
      if (chord) {
        const soloScales = getSoloScales({ tonic: chord.tonic, type: chord.type, degree: chord.degree }, mode)
        onChordSelect?.(chord.tonic, chord.type, chord.quality, soloScales.primary.scaleName)
      }
    }
    setSelectedIndex(prev => prev === index ? null : index)
  }

  function handleSelectionChange(newSelected: string) {
    setSelected(newSelected)
    setSelectedIndex(0)
    setInfoOpen(false)

    const newUserProg = userProgressions.find(p => p.id === newSelected)
    const newChords = newUserProg
      ? getUserProgressionChords(newUserProg.degrees, newUserProg.mode, tonic)
      : getProgression(newSelected, tonic)
    const newMode = newUserProg?.mode ?? builtinProgressions.find(p => p.name === newSelected)?.mode ?? "major"

    const chord0 = newChords[0]
    if (chord0) {
      const soloScales = getSoloScales({ tonic: chord0.tonic, type: chord0.type, degree: chord0.degree }, newMode)
      onChordSelect?.(chord0.tonic, chord0.type, chord0.quality, soloScales.primary.scaleName)
    }
  }

  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    items: builtinProgressions.filter(p => p.category === cat),
  })).filter(g => g.items.length > 0)

  return (
    <div className="space-y-4">
      {/* Progression selector + buttons */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="progression-select"
          className="text-xs uppercase tracking-widest text-muted-foreground whitespace-nowrap"
        >
          Progression
        </label>
        <select
          id="progression-select"
          aria-label="Progression"
          value={selected}
          onChange={e => handleSelectionChange(e.target.value)}
          className="bg-card border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent w-fit"
        >
          {grouped.map(({ category, items }) => (
            <optgroup key={category} label={category}>
              {items.map(p => (
                <option key={p.name} value={p.name}>
                  {p.romanDisplay.length <= 25
                    ? `${p.displayName} · ${p.romanDisplay}`
                    : p.displayName}
                </option>
              ))}
            </optgroup>
          ))}
          {userProgressions.length > 0 && (
            <optgroup label="My Progressions">
              {userProgressions.map(p => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
            </optgroup>
          )}
        </select>

        {/* Add to goal */}
        {userProg ? (
          <AddToGoalButton
            kind="progression"
            userProgressionId={userProg.id}
            defaultKey={tonic}
            displayName={userProg.displayName}
            popupAlign="right"
          />
        ) : (
          <AddToGoalButton
            kind="progression"
            subtype={selected}
            defaultKey={tonic}
            displayName={builtinProg?.displayName ?? selected}
            popupAlign="right"
          />
        )}

        {/* Info popover */}
        <div ref={infoRef} className="relative">
          <button
            type="button"
            aria-label="Progression info"
            aria-expanded={infoOpen}
            onClick={() => setInfoOpen(o => !o)}
            className="flex items-center justify-center w-6 h-6 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors text-xs font-semibold select-none"
          >
            ?
          </button>

          {infoOpen && (
            <div
              role="dialog"
              aria-label="Progression details"
              className="absolute right-0 top-8 z-20 w-72 rounded-lg border border-border bg-card shadow-lg p-4 space-y-3"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {userProg?.displayName ?? builtinProg?.displayName}
                </p>
                <p className="text-xs text-accent font-mono mt-0.5">{romanDisplay}</p>
              </div>
              {userProg ? (
                userProg.description ? (
                  <div className="prose prose-sm max-w-none text-foreground text-xs">
                    <ReactMarkdown>{userProg.description}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No description.</p>
                )
              ) : (
                <div className="space-y-1.5">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground mb-0.5">Examples</p>
                    <p className="text-xs text-foreground">{builtinProg?.examples}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground mb-0.5">Notes</p>
                    <p className="text-xs text-foreground">{builtinProg?.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pencil link — opens custom progressions manager */}
        <Link
          href="/reference/progressions"
          aria-label="Manage custom progressions"
          className="flex items-center justify-center w-6 h-6 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            <path d="m15 5 4 4"/>
          </svg>
        </Link>
      </div>

      {/* Chord blocks */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Chords in {tonic} · {romanDisplay}
        </p>
        <div role="group" aria-label="Progression chords" className="flex flex-wrap items-center gap-1">
          {chords.map((chord, i) => (
            <div key={i} className="flex items-center gap-1 flex-shrink-0">
              {i > 0 && <span className="text-muted-foreground text-sm flex-shrink-0">→</span>}
              <ChordQualityBlock
                roman={chord.roman}
                chordName={`${chord.tonic}${chord.type}`}
                degree={chord.degree}
                isSelected={selectedIndex === i}
                onClick={() => handleIndexClick(i)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Per-chord scale recommendation */}
      {scales && selectedChord && (
        <SoloScalesPanel
          scales={scales}
          chordName={`${selectedChord.tonic}${selectedChord.type}`}
          onScaleSelect={onScaleSelect}
        />
      )}

      {/* Progression-wide recommendation */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
          Over the whole progression
        </p>
        <p className="text-sm font-semibold text-foreground">
          {tonic} {recommendedScaleType}
        </p>
      </div>
    </div>
  )
}
