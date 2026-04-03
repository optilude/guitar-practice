"use client"

import { useState, useMemo, useEffect } from "react"
import {
  TRIAD_TYPES,
  TRIAD_STRING_SETS,
  getTriadVoicings,
  getTriadAsScale,
  type TriadVoicing,
} from "@/lib/theory"
import Chord from "@tombatossals/react-chords/lib/Chord"
import { FretboardViewer } from "./fretboard-viewer"
import { cn } from "@/lib/utils"
import { AddToGoalButton } from "@/components/add-to-goal-button"

const GUITAR_INSTRUMENT = {
  strings: 6,
  fretsOnChord: 5,
  name: "guitar",
  keys: [] as string[],
  tunings: { standard: ["E", "A", "D", "G", "B", "E"] },
}

const ROOT_NOTES = [
  "Ab", "A", "A#", "Bb", "B", "C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#",
]

const TRIAD_FORMULA: Record<string, string> = {
  major:      "1 – 3 – 5",
  minor:      "1 – b3 – 5",
  diminished: "1 – b3 – b5",
  augmented:  "1 – 3 – #5",
}

const STRING_SET_LABEL: Record<string, string> = {
  "6-5-4": "6-5-4  (close)",
  "6-5-3": "6-5-3  (open)",
  "6-4-3": "6-4-3  (open)",
  "5-4-3": "5-4-3  (close)",
  "5-4-2": "5-4-2  (open)",
  "5-3-2": "5-3-2  (open)",
  "4-3-2": "4-3-2  (close)",
  "4-3-1": "4-3-1  (open)",
  "4-2-1": "4-2-1  (open)",
  "3-2-1": "3-2-1  (close)",
}

interface TriadPanelProps {
  root: string
  onRootChange: (root: string) => void
  triadTypeTrigger?: { type: string } | null
}

export function TriadPanel({ root, onRootChange, triadTypeTrigger }: TriadPanelProps) {
  const [triadType, setTriadType]           = useState<string>("major")

  useEffect(() => {
    if (triadTypeTrigger) setTriadType(triadTypeTrigger.type)
  }, [triadTypeTrigger]) // eslint-disable-line react-hooks/exhaustive-deps
  const [viewMode, setViewMode]             = useState<"fretboard" | "fingerings">("fretboard")
  const [voicingFilter, setVoicingFilter]   = useState<string>("all")
  const [inversionFilter, setInvFilter]     = useState<string>("all")
  const [stringSetFilter, setStringSetFilter] = useState<string>("all")
  const [labelMode, setLabelMode]           = useState<"note" | "interval">("interval")

  const triadScale = useMemo(
    () => getTriadAsScale(root, triadType),
    [root, triadType],
  )

  const allVoicings = useMemo(
    () => getTriadVoicings(root, triadType),
    [root, triadType],
  )

  const filtered = useMemo(() => {
    let v = allVoicings
    if (voicingFilter !== "all")   v = v.filter((x) => x.voicingType === voicingFilter)
    if (inversionFilter !== "all") v = v.filter((x) => x.inversion   === inversionFilter)
    if (stringSetFilter !== "all") v = v.filter((x) => x.stringSet   === stringSetFilter)
    return v
  }, [allVoicings, voicingFilter, inversionFilter, stringSetFilter])

  // Group by string set in canonical order
  const grouped = useMemo(() => {
    const map = new Map<string, TriadVoicing[]>()
    for (const v of filtered) {
      if (!map.has(v.stringSet)) map.set(v.stringSet, [])
      map.get(v.stringSet)!.push(v)
    }
    // Return in canonical order
    return TRIAD_STRING_SETS
      .filter((s) => map.has(s))
      .map((s) => ({ stringSet: s, voicings: map.get(s)! }))
  }, [filtered])

  return (
    <div className="space-y-4">
      {/* Root + Triad type selectors */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="triad-root-select">
            Root
          </label>
          <select
            id="triad-root-select"
            aria-label="Root"
            value={root}
            onChange={(e) => onRootChange(e.target.value)}
            className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
          >
            {ROOT_NOTES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="triad-type-select">
            Triad type
          </label>
          <select
            id="triad-type-select"
            value={triadType}
            onChange={(e) => setTriadType(e.target.value)}
            className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
          >
            {TRIAD_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <AddToGoalButton
            kind="triad"
            subtype={triadType}
            defaultKey={root}
            displayName={`${root} ${triadType} triad`}
          />
        </div>
      </div>

      {/* Notes + formula */}
      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>Notes: {triadScale.notes.join(" – ")}</p>
        <p>Formula: {TRIAD_FORMULA[triadType]}</p>
      </div>

      {/* View mode toggle */}
      <div className="flex rounded border border-border overflow-hidden text-sm w-fit">
        <button
          onClick={() => setViewMode("fretboard")}
          className={cn(
            "px-3 py-1.5 transition-colors",
            viewMode === "fretboard"
              ? "bg-accent text-accent-foreground"
              : "bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          Fretboard
        </button>
        <button
          onClick={() => setViewMode("fingerings")}
          className={cn(
            "px-3 py-1.5 transition-colors border-l border-border",
            viewMode === "fingerings"
              ? "bg-accent text-accent-foreground"
              : "bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          Fingerings
        </button>
      </div>

      {/* Fretboard view */}
      {viewMode === "fretboard" && (
        <>
          <div className="flex justify-end">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={labelMode === "interval"}
                onChange={(e) => setLabelMode(e.target.checked ? "interval" : "note")}
                className="accent-accent"
              />
              Show intervals
            </label>
          </div>

          <FretboardViewer
            scale={triadScale}
            boxSystem="none"
            boxIndex={0}
            labelMode={labelMode}
          />
        </>
      )}

      {/* Fingerings view */}
      {viewMode === "fingerings" && (
        <>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="triad-voicing-select">
                Voicing
              </label>
              <select
                id="triad-voicing-select"
                value={voicingFilter}
                onChange={(e) => setVoicingFilter(e.target.value)}
                className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
              >
                <option value="all">All</option>
                <option value="close">Close</option>
                <option value="open">Open</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="triad-inversion-select">
                Inversion
              </label>
              <select
                id="triad-inversion-select"
                value={inversionFilter}
                onChange={(e) => setInvFilter(e.target.value)}
                className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
              >
                <option value="all">All</option>
                <option value="root">Root position</option>
                <option value="first">1st inversion</option>
                <option value="second">2nd inversion</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="triad-stringset-select">
                String set
              </label>
              <select
                id="triad-stringset-select"
                value={stringSetFilter}
                onChange={(e) => setStringSetFilter(e.target.value)}
                className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
              >
                <option value="all">All</option>
                {TRIAD_STRING_SETS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {grouped.length === 0 ? (
            <p className="text-xs text-muted-foreground">No voicings match the current filters.</p>
          ) : (
            <div className="space-y-8">
              {grouped.map(({ stringSet, voicings }) => (
                <div key={stringSet}>
                  <h3 className="text-xs font-medium tracking-widest text-muted-foreground mb-4">
                    {STRING_SET_LABEL[stringSet] ?? stringSet}
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                    {voicings.map((pos, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <span className="text-xs text-muted-foreground">{pos.label}</span>
                        <div className="dark:invert">
                          <Chord chord={pos} instrument={GUITAR_INSTRUMENT} lite={false} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
