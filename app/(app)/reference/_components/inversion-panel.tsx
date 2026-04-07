"use client"

import { useState, useMemo, useEffect } from "react"
import {
  INVERSION_TYPES,
  getInversionVoicings,
  getInversionAsScale,
  type InversionVoicing,
} from "@/lib/theory"
import { type Chord as SVGChord, OPEN, SILENT, type Finger, type FingerOptions, type Barre, BarreChordStyle } from "svguitar"
import { INTERVAL_DEGREE_COLORS } from "@/lib/rendering/tab"
import { ChordDiagram } from "./chord-diagram"
import { FretboardViewer } from "./fretboard-viewer"
import {
  getArpeggioBoxSystems,
  CHORD_TYPE_TO_SCALE,
  CAGED_BOX_LABELS,
} from "@/lib/rendering/fretboard"
import type { BoxSystem } from "@/lib/rendering/fretboard"
import { SoloScalesPanel } from "./solo-scales-panel"
import { cn } from "@/lib/utils"
import { AddToGoalButton } from "@/components/add-to-goal-button"
import type { NoteRole } from "@/lib/theory/inversions"
import { defaultModeForChordType, getSoloScales, SOLO_MODE_OPTION_GROUPS } from "@/lib/theory/solo-scales"
import { groupChordTypes } from "@/lib/theory/chord-categories"

type ShowMode = "fingers" | "notes" | "intervals"

// Root uses amber-600, matching the fretboard's dark-mode accent colour
const ROLE_COLORS: Record<NoteRole, string> = {
  root:    "#d97706",
  third:   INTERVAL_DEGREE_COLORS.third,
  fifth:   INTERVAL_DEGREE_COLORS.fifth,
  seventh: INTERVAL_DEGREE_COLORS.seventh,
  ninth:   INTERVAL_DEGREE_COLORS.second,
  other:   "#6b7280", // gray-500 for extensions beyond 9th
}

// Human-readable labels for inversion DB suffixes
const SUFFIX_DISPLAY: Record<string, string> = {
  major:       "Major",
  minor:       "Minor",
  dim:         "Diminished",
  dim7:        "Diminished 7th",
  aug:         "Augmented",
  "6":         "6th",
  "69":        "6/9",
  "7":         "Dominant 7th",
  aug7:        "Augmented 7th",
  "9":         "9th",
  aug9:        "Augmented 9th",
  "7b9":       "7♭9",
  "7#9":       "7♯9",
  "11":        "11th",
  maj7:        "Major 7th",
  maj9:        "Major 9th",
  m6:          "Minor 6th",
  m7:          "Minor 7th",
  m7b5:        "Half Diminished",
  m9:          "Minor 9th",
  m69:         "Minor 6/9",
  mmaj7:       "Minor Major 7th",
  "7#5":       "7♯5",
  dom_cluster: "Dom. Cluster",
  maj_cluster: "Maj. Cluster",
  m_cluster:   "Min. Cluster",
  maj7_shell:  "Maj. 7th Shell",
  "6_shell":   "6th Shell",
  m7_shell:    "Min. 7th Shell",
  m6_shell:    "Min. 6th Shell",
  "7_shell":   "7th Shell",
  dim7_shell:  "Dim. 7th Shell",
}

// Tonal.js interval → short display label (for formula display)
const INTERVAL_LABEL: Record<string, string> = {
  "1P": "1",
  "2m": "b2", "2M": "2",
  "3m": "b3", "3M": "3",
  "4P": "4",  "4A": "#4",
  "5d": "b5", "5P": "5", "5A": "#5",
  "6m": "b6", "6M": "6",
  "7m": "b7", "7M": "7",
  "8P": "1",
  "9m": "b9", "9M": "9", "9A": "#9",
  "11P": "11", "11A": "#11",
  "13M": "13",
}

const ROLE_OMIT_LABEL: Record<NoteRole, string> = {
  root:    "No root",
  third:   "No 3rd",
  fifth:   "No 5th",
  seventh: "No 7th",
  ninth:   "No 9th",
  other:   "No ext.",
}

// Pill base: matches reference site sizing (padding 0 5px, border-radius 3px, 0.62rem, weight 600)
const PILL_BASE = "inline-block px-1.5 rounded-sm text-[10px] font-semibold leading-[1.5]"

// Omit pills: neutral slate — conveys "something is absent" without strong colour association
const OMIT_PILL_CLASS = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"

// Add pills: emerald — conveys "something extra is present", distinct from slate
const ADD_PILL_CLASS = "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"

function toSVGChord(
  voicing: InversionVoicing,
  showMode: ShowMode,
  isDark: boolean,
): SVGChord {
  const fingers: Finger[] = []

  // If all played notes are at fret 5 or below, anchor the diagram at the nut
  const maxAbsFret = voicing.frets.reduce((max, relFret) => {
    if (relFret <= 0) return max
    return Math.max(max, relFret + voicing.baseFret - 1)
  }, 0)
  const anchorToNut = maxAbsFret > 0 && maxAbsFret <= 4
  const position = anchorToNut ? 1 : voicing.baseFret

  voicing.frets.forEach((fret, i) => {
    const str  = 6 - i // index 0 (str6/low E) → SVGuitar string 6
    const role = voicing.noteRoles[i]

    const fingerNum = voicing.fingers[i]
    const text = !role ? undefined
      : showMode === "notes"     ? (voicing.noteNames[i] ?? undefined)
      : showMode === "intervals" ? (voicing.noteIntervals[i] ?? undefined)
      : (fingerNum && fingerNum > 0) ? String(fingerNum) : undefined // fingers mode

    const options: FingerOptions | undefined = role
      ? {
          color: ROLE_COLORS[role],
          // Open-string indicator is outline-only — use contrasting text colour
          textColor: fret === 0 ? (isDark ? "#f9fafb" : "#1f2937") : "#ffffff",
          text,
        }
      : undefined

    if (fret === -1)     fingers.push([str, SILENT])
    else if (fret === 0) fingers.push([str, OPEN, options])
    else {
      // When anchoring to nut, pass absolute fret numbers; otherwise relative
      const svgFret = anchorToNut ? (fret + voicing.baseFret - 1) : fret
      fingers.push([str, svgFret, options])
    }
  })

  // Detect barres: group strings by (finger, svgFret); 2+ strings → arc
  const barreMap = new Map<string, { svgFret: number; indices: number[] }>()
  voicing.frets.forEach((relFret, idx) => {
    if (relFret <= 0) return
    const finger = voicing.fingers[idx]
    if (!finger || finger === 0) return
    const svgFret = anchorToNut ? (relFret + voicing.baseFret - 1) : relFret
    const key = `${finger}:${svgFret}`
    if (!barreMap.has(key)) barreMap.set(key, { svgFret, indices: [] })
    barreMap.get(key)!.indices.push(idx)
  })

  const barreColor = isDark ? "#d1d5db" : "#9ca3af"
  const svgBarres: Barre[] = []
  for (const { svgFret, indices } of barreMap.values()) {
    if (indices.length < 2) continue
    const minIdx = Math.min(...indices)
    const maxIdx = Math.max(...indices)
    svgBarres.push({
      fret: svgFret,
      fromString: 6 - minIdx,
      toString: 6 - maxIdx,
      style: BarreChordStyle.ARC,
      color: barreColor,
      strokeColor: barreColor,
    })
  }

  return { fingers, barres: svgBarres, position }
}

// Compute the correct numFrets for SVGuitar, mirroring the anchoring logic in toSVGChord.
// When the chord is anchored to the nut, SVGuitar receives absolute fret numbers, so
// numFrets must cover the highest absolute fret — not the highest relative fret.
function voicingNumFrets(voicing: InversionVoicing): number {
  const maxAbsFret = voicing.frets.reduce((max, relFret) =>
    relFret > 0 ? Math.max(max, relFret + voicing.baseFret - 1) : max, 0)
  const anchorToNut = maxAbsFret > 0 && maxAbsFret <= 4
  if (anchorToNut) return Math.max(4, maxAbsFret)
  const maxRelFret = voicing.frets.reduce((max, f) => f > 0 ? Math.max(max, f) : max, 0)
  return Math.max(4, maxRelFret)
}

// Compute a human-readable "X – Y – Z" label for a string set
function stringSetLabel(set: string): string {
  const parts = set.split("-").map(Number)
  const isClose = parts.every((v, i) => i === 0 || parts[i - 1] - v === 1)
  return `${set}  (${isClose ? "close" : "open"})`
}

const ROOT_NOTES = [
  "Ab", "A", "A#", "Bb", "B", "C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#",
]

const BOX_SYSTEM_LABELS: Record<BoxSystem, string> = {
  none:       "All notes",
  caged:      "CAGED",
  "3nps":     "3NPS",
  pentatonic: "Pentatonic boxes",
  windows:    "Position windows",
}

const INVERSION_GROUP_ORDER = ["root", "first", "second", "third"]
const INVERSION_GROUP_LABELS: Record<string, string> = {
  root:   "Root position",
  first:  "1st inversion",
  second: "2nd inversion",
  third:  "3rd inversion",
}

interface InversionPanelProps {
  root: string
  onRootChange: (root: string) => void
  inversionTypeTrigger?: { type: string } | null
  onScaleSelect?: (tonic: string, scaleName: string) => void
}

export function InversionPanel({ root, onRootChange, inversionTypeTrigger, onScaleSelect }: InversionPanelProps) {
  const [inversionType, setInversionType]     = useState<string>("major")
  const [isDark, setIsDark]                   = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"))
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (inversionTypeTrigger) setInversionType(inversionTypeTrigger.type)
  }, [inversionTypeTrigger]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSoloingMode(defaultModeForChordType(inversionType))
  }, [inversionType]) // eslint-disable-line react-hooks/exhaustive-deps

  const [viewMode, setViewMode]               = useState<"fretboard" | "fingerings" | "soloing">("fretboard")
  const [soloingMode, setSoloingMode]         = useState(() => defaultModeForChordType(inversionType))
  const [voicingFilter, setVoicingFilter]     = useState<string>("all")
  const [inversionFilter, setInvFilter]       = useState<string>("all")
  const [stringSetFilter, setStringSetFilter] = useState<string>("all")
  const [groupBy, setGroupBy]                 = useState<"stringSet" | "inversion" | "none">("stringSet")
  const [showMode, setShowMode]               = useState<ShowMode>("intervals")
  const [labelMode, setLabelMode]             = useState<"note" | "interval">("note")
  const [boxSystem, setBoxSystem]             = useState<BoxSystem>("none")
  const [boxIndex, setBoxIndex]               = useState(0)

  const inversionScale = useMemo(
    () => getInversionAsScale(root, inversionType),
    [root, inversionType],
  )

  const inversionGroups = useMemo(
    () => groupChordTypes(INVERSION_TYPES as string[]),
    [],
  )

  // Formula derived from tonal.js intervals
  const formula = useMemo(
    () => inversionScale.intervals.map((iv) => INTERVAL_LABEL[iv] ?? iv).join(" – "),
    [inversionScale],
  )

  const availableBoxSystems = useMemo(() => getArpeggioBoxSystems(inversionType), [inversionType])
  const parentScaleType = CHORD_TYPE_TO_SCALE[inversionType]
  const boxCount = useMemo(() => {
    if (boxSystem === "caged")   return CAGED_BOX_LABELS.length
    if (boxSystem === "3nps")    return 7
    if (boxSystem === "windows") return inversionScale.positions.length
    return 0
  }, [boxSystem, inversionScale.positions.length])
  const safeBoxIndex = boxIndex < boxCount ? boxIndex : 0

  const allVoicings = useMemo(
    () => getInversionVoicings(root, inversionType),
    [root, inversionType],
  )

  const soloScales = useMemo(
    () => getSoloScales({ tonic: root, type: inversionType, degree: 1 }, soloingMode),
    [root, inversionType, soloingMode],
  )

  // String sets available for the current chord type + voicing/inversion filters,
  // sorted descending alphabetically for the dropdown.
  const availableStringSets = useMemo(() => {
    let v = allVoicings
    if (voicingFilter !== "all")   v = v.filter((x) => x.voicingType === voicingFilter)
    if (inversionFilter !== "all") v = v.filter((x) => x.inversion   === inversionFilter)
    const seen = new Set(v.map((x) => x.stringSet))
    return [...seen].sort((a, b) => b.localeCompare(a))
  }, [allVoicings, voicingFilter, inversionFilter])

  // Reset string set filter if it's no longer in the available set
  useEffect(() => {
    if (stringSetFilter !== "all" && !availableStringSets.includes(stringSetFilter)) {
      setStringSetFilter("all")
    }
  }, [availableStringSets, stringSetFilter])

  const filtered = useMemo(() => {
    let v = allVoicings
    if (voicingFilter !== "all")   v = v.filter((x) => x.voicingType === voicingFilter)
    if (inversionFilter !== "all") v = v.filter((x) => x.inversion   === inversionFilter)
    if (stringSetFilter !== "all") v = v.filter((x) => x.stringSet   === stringSetFilter)
    return v
  }, [allVoicings, voicingFilter, inversionFilter, stringSetFilter])

  const grouped = useMemo(() => {
    const byFret = [...filtered].sort((a, b) =>
      a.minFret !== b.minFret
        ? a.minFret - b.minFret
        : b.stringSet.localeCompare(a.stringSet) // ties: lower strings first
    )

    if (groupBy === "none") {
      return byFret.length === 0 ? [] : [{ label: null as string | null, voicings: byFret }]
    }

    if (groupBy === "inversion") {
      const map = new Map<string, InversionVoicing[]>()
      for (const v of byFret) {
        const key = v.inversion ?? "other"
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(v)
      }
      return [...INVERSION_GROUP_ORDER, "other"]
        .filter((k) => map.has(k))
        .map((k) => ({ label: INVERSION_GROUP_LABELS[k] ?? "Other", voicings: map.get(k)! }))
    }

    // "stringSet" — descending alphabetical, matching the dropdown order
    const map = new Map<string, InversionVoicing[]>()
    for (const v of byFret) {
      if (!map.has(v.stringSet)) map.set(v.stringSet, [])
      map.get(v.stringSet)!.push(v)
    }
    return [...map.keys()]
      .sort((a, b) => b.localeCompare(a))
      .map((s) => ({ label: stringSetLabel(s), voicings: map.get(s)! }))
  }, [filtered, groupBy])

  return (
    <div className="space-y-4">
      {/* Root + Inversion type selectors */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="inversion-root-select">
            Root
          </label>
          <select
            id="inversion-root-select"
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
          <label className="text-xs text-muted-foreground" htmlFor="inversion-type-select">
            Chord type
          </label>
          <select
            id="inversion-type-select"
            value={inversionType}
            onChange={(e) => {
              const newType = e.target.value
              setInversionType(newType)
              setBoxIndex(0)
              const newSystems = getArpeggioBoxSystems(newType)
              if (!newSystems.includes(boxSystem)) setBoxSystem("none")
            }}
            className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
          >
            {inversionGroups.map(({ category, label, types }) => (
              <optgroup key={category} label={label}>
                {types.map((t) => (
                  <option key={t} value={t}>{SUFFIX_DISPLAY[t] ?? t}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <AddToGoalButton
          kind="inversion"
          subtype={inversionType}
          defaultKey={root}
          displayName={`${root} ${SUFFIX_DISPLAY[inversionType] ?? inversionType}`}
        />
      </div>

      {/* Notes + formula */}
      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>Notes: {inversionScale.notes.join(" – ")}</p>
        {formula && <p>Formula: {formula}</p>}
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
        <button
          onClick={() => setViewMode("soloing")}
          className={cn(
            "px-3 py-1.5 transition-colors border-l border-border",
            viewMode === "soloing"
              ? "bg-accent text-accent-foreground"
              : "bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          Soloing
        </button>
      </div>

      {/* Fretboard view */}
      {viewMode === "fretboard" && (
        <>
          <div className="flex flex-wrap gap-3 items-end">
            {availableBoxSystems.length > 1 && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground" htmlFor="inversion-box-system-select">
                    Highlight
                  </label>
                  <select
                    id="inversion-box-system-select"
                    value={boxSystem}
                    onChange={(e) => {
                      setBoxSystem(e.target.value as BoxSystem)
                      setBoxIndex(0)
                    }}
                    className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    {availableBoxSystems.map((s) => (
                      <option key={s} value={s}>{BOX_SYSTEM_LABELS[s]}</option>
                    ))}
                  </select>
                </div>

                {boxSystem !== "none" && boxCount > 0 && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground" htmlFor="inversion-box-index-select">
                      Box
                    </label>
                    <select
                      id="inversion-box-index-select"
                      value={safeBoxIndex}
                      onChange={(e) => setBoxIndex(Number(e.target.value))}
                      className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      {Array.from({ length: boxCount }, (_, i) => (
                        <option key={i} value={i}>
                          {boxSystem === "caged"
                            ? `${CAGED_BOX_LABELS[i]} shape`
                            : `Position ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="inversion-fretboard-show-select">
                Show
              </label>
              <select
                id="inversion-fretboard-show-select"
                value={labelMode}
                onChange={(e) => setLabelMode(e.target.value as "note" | "interval")}
                className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="note">Notes</option>
                <option value="interval">Intervals</option>
              </select>
            </div>
          </div>

          <FretboardViewer
            scale={inversionScale}
            boxSystem={boxSystem}
            boxIndex={safeBoxIndex}
            labelMode={labelMode}
            boxScaleType={parentScaleType}
          />
        </>
      )}

      {/* Soloing view */}
      {viewMode === "soloing" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="inversion-solo-mode-select">
              Modal context
            </label>
            <select
              id="inversion-solo-mode-select"
              value={soloingMode}
              onChange={(e) => setSoloingMode(e.target.value)}
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
          </div>
          <SoloScalesPanel
            scales={soloScales}
            chordName={`${root} ${SUFFIX_DISPLAY[inversionType] ?? inversionType}`}
            onScaleSelect={onScaleSelect}
          />
        </div>
      )}

      {/* Fingerings view */}
      {viewMode === "fingerings" && (
        <>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="inversion-voicing-select">
                Voicing
              </label>
              <select
                id="inversion-voicing-select"
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
              <label className="text-xs text-muted-foreground" htmlFor="inversion-inversion-select">
                Inversion
              </label>
              <select
                id="inversion-inversion-select"
                value={inversionFilter}
                onChange={(e) => setInvFilter(e.target.value)}
                className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
              >
                <option value="all">All</option>
                <option value="root">Root position</option>
                <option value="first">1st inversion</option>
                <option value="second">2nd inversion</option>
                <option value="third">3rd inversion</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="inversion-stringset-select">
                String set
              </label>
              <select
                id="inversion-stringset-select"
                value={stringSetFilter}
                onChange={(e) => setStringSetFilter(e.target.value)}
                className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
              >
                <option value="all">All</option>
                {availableStringSets.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="inversion-show-select">
                Show
              </label>
              <select
                id="inversion-show-select"
                value={showMode}
                onChange={(e) => setShowMode(e.target.value as ShowMode)}
                className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
              >
                <option value="intervals">Intervals</option>
                <option value="notes">Notes</option>
                <option value="fingers">Fingers</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="inversion-groupby-select">
                Group by
              </label>
              <select
                id="inversion-groupby-select"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as "stringSet" | "inversion" | "none")}
                className="rounded border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent w-fit"
              >
                <option value="stringSet">String set</option>
                <option value="inversion">Inversion</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>

          {grouped.length === 0 ? (
            <p className="text-xs text-muted-foreground">No voicings match the current filters.</p>
          ) : (
            <div className="space-y-8">
              {grouped.map(({ label, voicings }, gi) => (
                <div key={label ?? gi}>
                  {label !== null && (
                    <h3 className="text-xs font-medium tracking-widest text-muted-foreground mb-4">
                      {label}
                    </h3>
                  )}
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 items-start">
                    {voicings.map((pos, i) => (
                      <div key={i} className="flex flex-col gap-1 items-center">
                        {groupBy !== "inversion" && (
                          <span className="text-xs text-muted-foreground text-center">{pos.label}</span>
                        )}
                        <ChordDiagram
                          chord={toSVGChord(pos, showMode, isDark)}
                          fingerTextSize={showMode === "fingers" ? 26 : 20}
                          numFrets={voicingNumFrets(pos)}
                        />
                        {((pos.omittedRoles?.length ?? 0) > 0 || (pos.addedIntervals?.length ?? 0) > 0) && (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {(pos.omittedRoles?.length ?? 0) > 0 && (
                              <span className={`${PILL_BASE} ${OMIT_PILL_CLASS}`}>
                                {`No ${pos.omittedRoles!.map((r) => ROLE_OMIT_LABEL[r].slice(3)).join(", ")}`}
                              </span>
                            )}
                            {(pos.addedIntervals?.length ?? 0) > 0 && (
                              <span className={`${PILL_BASE} ${ADD_PILL_CLASS}`}>
                                {`Add ${pos.addedIntervals!.join(", ")}`}
                              </span>
                            )}
                          </div>
                        )}
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
