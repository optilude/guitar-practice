"use client"

import { useState, useEffect, useRef } from "react"
import { listProgressions, getProgression, getSoloScales } from "@/lib/theory"
import { ChordQualityBlock } from "./chord-quality-block"
import { SoloScalesPanel } from "./solo-scales-panel"

const CATEGORY_ORDER = ["Pop", "Blues", "Jazz", "Rock", "Folk / Country", "Classical / Modal"]

interface ProgressionsTabProps {
  tonic: string
  onChordSelect?: (tonic: string, type: string, quality: string, primaryScaleName: string) => void
  onScaleSelect?: (tonic: string, scaleName: string) => void
}

export function ProgressionsTab({ tonic, onChordSelect, onScaleSelect }: ProgressionsTabProps) {
  const [progressionName, setProgressionName] = useState("pop-standard")
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0)
  const [infoOpen, setInfoOpen] = useState(false)
  const infoRef = useRef<HTMLDivElement>(null)

  const progressions = listProgressions()
  const prog = progressions.find((p) => p.name === progressionName)!
  const chords = getProgression(progressionName, tonic)

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
      const soloScales = getSoloScales({ tonic: chord.tonic, type: chord.type, degree: chord.degree }, prog.mode)
      onChordSelect?.(chord.tonic, chord.type, chord.quality, soloScales.primary.scaleName)
    }
  }, []) // intentionally empty: only on mount
  const scales = selectedChord
    ? getSoloScales(
        { tonic: selectedChord.tonic, type: selectedChord.type, degree: selectedChord.degree },
        prog.mode
      )
    : null

  function handleIndexClick(index: number) {
    if (selectedIndex !== index) {
      const chord = chords[index]
      if (chord) {
        const soloScales = getSoloScales({ tonic: chord.tonic, type: chord.type, degree: chord.degree }, prog.mode)
        onChordSelect?.(chord.tonic, chord.type, chord.quality, soloScales.primary.scaleName)
      }
    }
    setSelectedIndex((prev) => (prev === index ? null : index))
  }

  // Group progressions by category in canonical order
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: progressions.filter((p) => p.category === cat),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="space-y-4">
      {/* Progression selector + info button */}
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
          value={progressionName}
          onChange={(e) => {
            const newName = e.target.value
            setProgressionName(newName)
            setSelectedIndex(0)
            setInfoOpen(false)
            const newChords = getProgression(newName, tonic)
            const chord0 = newChords[0]
            if (chord0) {
              const newProg = progressions.find((p) => p.name === newName)!
              const soloScales = getSoloScales({ tonic: chord0.tonic, type: chord0.type, degree: chord0.degree }, newProg.mode)
              onChordSelect?.(chord0.tonic, chord0.type, chord0.quality, soloScales.primary.scaleName)
            }
          }}
          className="bg-card border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent w-fit"
        >
          {grouped.map(({ category, items }) => (
            <optgroup key={category} label={category}>
              {items.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.romanDisplay.length <= 25
                    ? `${p.displayName} · ${p.romanDisplay}`
                    : p.displayName}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* Info button + popover */}
        <div ref={infoRef} className="relative">
          <button
            type="button"
            aria-label="Progression info"
            aria-expanded={infoOpen}
            onClick={() => setInfoOpen((o) => !o)}
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
                <p className="text-sm font-semibold text-foreground">{prog.displayName}</p>
                <p className="text-xs text-accent font-mono mt-0.5">{prog.romanDisplay}</p>
              </div>
              <div className="space-y-1.5">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-0.5">Examples</p>
                  <p className="text-xs text-foreground">{prog.examples}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-0.5">Notes</p>
                  <p className="text-xs text-foreground">{prog.notes}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chord blocks in order with arrows */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Chords in {tonic} · {prog.romanDisplay}
        </p>
        <div role="group" aria-label="Progression chords" className="flex flex-wrap items-center gap-1">
          {chords.map((chord, i) => (
            <div key={i} className="flex items-center gap-1 flex-shrink-0">
              {i > 0 && (
                <span className="text-muted-foreground text-sm flex-shrink-0">→</span>
              )}
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

      {/* Progression-wide recommendation — always visible */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
          Over the whole progression
        </p>
        <p className="text-sm font-semibold text-foreground">
          {tonic} {prog.recommendedScaleType}
        </p>
      </div>
    </div>
  )
}
