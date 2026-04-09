"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { parseChord } from "@/lib/theory/key-finder"
import { analyzeProgression } from "@/lib/theory/transposer"
import { getUserProgressionChords } from "@/lib/theory/user-progressions"
import { analyzeFunctionalContext, qualityFromType } from "@/lib/theory"
import { ALL_KEY_MODES } from "@/lib/theory/commonality-tiers"
import { ChordInputRow } from "@/app/(app)/tools/_components/chord-input-row"
import { createUserProgression, updateUserProgression } from "@/app/(app)/reference/progressions/actions"
import { btn } from "@/lib/button-styles"

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

interface ProgressionFormProps {
  initialData?: {
    id: string
    displayName: string
    description: string
    mode: string
    degrees: string[]
  }
}

export function ProgressionForm({ initialData }: ProgressionFormProps) {
  const router = useRouter()
  const isEdit = !!initialData

  const [key, setKey]    = useState("C")
  const defaultModeIdx   = ALL_KEY_MODES.findIndex(m => m.modeName === (initialData?.mode ?? "major"))
  const [modeIdx, setModeIdx] = useState(defaultModeIdx >= 0 ? defaultModeIdx : 0)
  const mode = ALL_KEY_MODES[modeIdx]!

  const initialChords: ChordEntry[] = useMemo(() => {
    if (!initialData?.degrees?.length) return []
    const resolved = getUserProgressionChords(initialData.degrees, initialData.mode, key)
    return resolved.map(c => ({ id: crypto.randomUUID(), symbol: `${c.tonic}${c.type}` }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // only on mount

  const [chords, setChords]       = useState<ChordEntry[]>(initialChords)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState(initialData?.displayName ?? "")
  const [description, setDescription] = useState(initialData?.description ?? "")
  const [isSaving, setIsSaving]   = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const parsedChords = useMemo(
    () => chords.map(c => parseChord(c.symbol)).filter((c): c is NonNullable<typeof c> => c !== null),
    [chords],
  )

  const chordAnalyses = useMemo(
    () => parsedChords.length > 0
      ? analyzeProgression(parsedChords, key, mode.modeName)
      : null,
    [parsedChords, key, mode.modeName],
  )

  // Override chord badge Romans with functional labels (V7/IV, ii/IV, etc.)
  // so the form shows functional context as the user enters chords.
  const displayAnalyses = useMemo(() => {
    if (!chordAnalyses) return null
    const contexts = chordAnalyses.map(a => ({
      tonic:   a.inputChord.root,
      type:    a.inputChord.type,
      quality: qualityFromType(a.inputChord.type),
      roman:   a.roman,
    }))
    return chordAnalyses.map((a, i) => {
      const fa = analyzeFunctionalContext(contexts[i]!, contexts[i + 1] ?? null, key, mode.modeName)
      return fa.romanOverride ? { ...a, roman: fa.romanOverride } : a
    })
  }, [chordAnalyses, key, mode.modeName])

  function handleKeyOrModeChange(newKey: string, newModeIdx: number) {
    const newMode = ALL_KEY_MODES[newModeIdx]!
    if (parsedChords.length > 0) {
      const analyses  = analyzeProgression(parsedChords, key, mode.modeName)
      const degrees   = analyses.map((a, i) => {
        const chord = parsedChords[i]
        return chord && chord.type ? `${a.roman}:${chord.type}` : a.roman
      })
      const resolved  = getUserProgressionChords(degrees, newMode.modeName, newKey)
      setChords(prev => prev.map((c, i) => {
        const rc = resolved[i]
        return rc ? { ...c, symbol: `${rc.tonic}${rc.type}` } : c
      }))
    }
    setKey(newKey)
    setModeIdx(newModeIdx)
  }

  const handleChordChange = useCallback((updated: ChordEntry[]) => setChords(updated), [])
  const handleCommit      = useCallback((id: string, symbol: string) => {
    setChords(prev => prev.map(c => c.id === id ? { ...c, symbol } : c))
    setEditingId(null)
  }, [])
  const handleRemove      = useCallback((id: string) => setChords(prev => prev.filter(c => c.id !== id)), [])
  const handleStartEdit   = useCallback((id: string) => setEditingId(id), [])
  const handleAdd         = useCallback(() => {
    const id = crypto.randomUUID()
    setChords(prev => [...prev, { id, symbol: "" }])
    setEditingId(id)
  }, [])

  async function handleSave() {
    if (!displayName.trim()) { setError("Name is required"); return }
    setIsSaving(true)
    setError(null)

    const analyses = parsedChords.length > 0
      ? analyzeProgression(parsedChords, key, mode.modeName)
      : []
    // Encode as "roman:type" to preserve the exact chord type across save/load.
    // The type suffix lets getUserProgressionChords reconstruct non-diatonic
    // chords (e.g. "v:m7" → Gm7) rather than snapping to the diatonic default.
    const degrees = analyses.map((a, i) => {
      const chord = parsedChords[i]
      return chord && chord.type ? `${a.roman}:${chord.type}` : a.roman
    })

    const result = isEdit
      ? await updateUserProgression(initialData.id, {
          displayName: displayName.trim(),
          description,
          mode: mode.modeName,
          degrees,
        })
      : await createUserProgression({
          displayName: displayName.trim(),
          description,
          mode: mode.modeName,
          degrees,
        })

    if ("error" in result) {
      setError(result.error)
      setIsSaving(false)
    } else {
      router.push("/reference/progressions")
    }
  }

  return (
    <div className="space-y-6">
      {/* Name */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">
          Name
        </label>
        <input
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="My progression"
          className="w-full rounded border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* Key + Mode */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Key</label>
          <select
            value={key}
            onChange={e => handleKeyOrModeChange(e.target.value, modeIdx)}
            className={SELECT_CLASS}
          >
            {ROOT_NOTES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Scale / mode</label>
          <select
            value={modeIdx}
            onChange={e => handleKeyOrModeChange(key, Number(e.target.value))}
            className={SELECT_CLASS}
          >
            {MODE_GROUPS.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.modes.map(m => {
                  const idx = ALL_KEY_MODES.indexOf(m)
                  return <option key={idx} value={idx}>{m.displayName}</option>
                })}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {/* Chord entry */}
      <div>
        <label className="block text-xs text-muted-foreground mb-2">
          Chords
        </label>
        <ChordInputRow
          chords={chords}
          editingId={editingId}
          chordAnalyses={displayAnalyses}
          onChordChange={handleChordChange}
          onCommit={handleCommit}
          onRemove={handleRemove}
          onStartEdit={handleStartEdit}
          onAdd={handleAdd}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={4}
          placeholder="Describe this progression… (supports markdown)"
          className="w-full rounded border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-y"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={handleSave} disabled={isSaving} className={btn("primary")}>
          {isSaving ? "Saving…" : isEdit ? "Save changes" : "Create progression"}
        </button>
        <button
          onClick={() => router.push("/reference/progressions")}
          disabled={isSaving}
          className={btn("standalone")}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
