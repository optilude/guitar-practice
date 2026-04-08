"use client"

import { useCallback, useMemo, useState } from "react"
import { ChordQualityBlock } from "@/app/(app)/reference/_components/chord-quality-block"
import { parseChord, detectKey } from "@/lib/theory/key-finder"
import type { KeyMatch, ChordAnalysis } from "@/lib/theory/key-finder"
import { ChordInputRow } from "./chord-input-row"
import { btn } from "@/lib/button-styles"

interface ChordEntry {
  id: string
  symbol: string
}

// Map tier number → group label
const TIER_GROUP: Record<number, string> = {
  1: "Common keys",
  2: "Modal keys",
  3: "Modal keys",
  4: "Exotic keys",
  5: "Exotic keys",
}

function tierGroup(tier: number): string {
  return TIER_GROUP[tier] ?? "Exotic keys"
}

export function KeyFinderClient() {
  const [chords, setChords] = useState<ChordEntry[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedResult, setSelectedResult] = useState<KeyMatch | null>(null)

  const parsedChords = useMemo(
    () => chords.map(c => parseChord(c.symbol)).filter((c): c is NonNullable<typeof c> => c !== null),
    [chords],
  )

  const results = useMemo(
    () => (parsedChords.length >= 2 ? detectKey(parsedChords) : []),
    [parsedChords],
  )

  // Group results by tier label, preserving order
  const groupedResults = useMemo(() => {
    const groups: Array<{ label: string; items: KeyMatch[] }> = []
    for (const result of results) {
      const label = tierGroup(result.commonalityTier)
      const existing = groups.find(g => g.label === label)
      if (existing) {
        existing.items.push(result)
      } else {
        groups.push({ label, items: [result] })
      }
    }
    return groups
  }, [results])

  const handleAdd = useCallback(() => {
    const id = crypto.randomUUID()
    setChords(prev => [...prev, { id, symbol: "" }])
    setEditingId(id)
    setSelectedResult(null)
  }, [])

  const handleCommit = useCallback((id: string, symbol: string) => {
    setEditingId(null)
    if (!symbol) {
      setChords(prev => prev.filter(c => c.id !== id))
    } else {
      setChords(prev => prev.map(c => c.id === id ? { ...c, symbol } : c))
    }
    setSelectedResult(null)
  }, [])

  const handleRemove = useCallback((id: string) => {
    setChords(prev => prev.filter(c => c.id !== id))
    setSelectedResult(null)
  }, [])

  const handleStartEdit = useCallback((id: string) => {
    setEditingId(id)
    setSelectedResult(null)
  }, [])

  const handleResultClick = useCallback((result: KeyMatch) => {
    setSelectedResult(prev => prev?.displayName === result.displayName ? null : result)
  }, [])

  function handleClear() {
    setChords([])
    setEditingId(null)
    setSelectedResult(null)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Chord input row */}
      <ChordInputRow
        chords={chords}
        editingId={editingId}
        selectedResult={selectedResult}
        onChordChange={setChords}
        onCommit={handleCommit}
        onRemove={handleRemove}
        onStartEdit={handleStartEdit}
        onAdd={handleAdd}
      />

      {/* Clear button */}
      {chords.length > 0 && (
        <div>
          <button type="button" onClick={handleClear} className={btn("destructive", "sm")}>
            Clear
          </button>
        </div>
      )}

      {/* Results */}
      <div aria-live="polite">
        {parsedChords.length < 2 ? (
          chords.length > 0 && parsedChords.length < 2 && (
            <p className="text-sm text-muted-foreground">
              Add at least 2 chords to identify possible keys.
            </p>
          )
        ) : results.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No matching keys found — try removing or changing a chord.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {groupedResults.map(group => (
              <div key={group.label}>
                {groupedResults.length > 1 && (
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                    {group.label}
                  </p>
                )}
                <div className="divide-y divide-border">
                  {group.items.map(result => {
                    const isActive = selectedResult?.displayName === result.displayName
                    const pct = Math.round(Math.min(result.fitScore, 1) * 100)
                    return (
                      <button
                        key={result.displayName}
                        type="button"
                        onClick={() => handleResultClick(result)}
                        className={`w-full text-left px-3 py-2.5 transition-colors rounded ${
                          isActive ? "bg-accent/10 border border-accent/20" : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-medium text-foreground">
                            {result.displayName}
                          </span>
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {result.chordAnalysis.map((analysis, i) => (
                            <ResultChordBadge
                              key={i}
                              analysis={analysis}
                              symbol={analysis.inputChord.symbol}
                            />
                          ))}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inline display-only badge for results list
// ---------------------------------------------------------------------------
interface ResultChordBadgeProps {
  analysis: ChordAnalysis
  symbol: string
}

function ResultChordBadge({ analysis, symbol }: ResultChordBadgeProps) {
  const isDiatonic = analysis.role === "diatonic" || analysis.role === "borrowed"

  if (isDiatonic && analysis.degree !== null && analysis.roman !== null) {
    return (
      <ChordQualityBlock
        roman={analysis.roman}
        chordName={symbol}
        degree={analysis.degree}
        isSelected={false}
        onClick={() => {}}
      />
    )
  }

  return (
    <div className="flex flex-col items-center rounded-lg border-2 border-border px-3 py-2.5 text-center min-w-[68px] bg-card opacity-40">
      <span className="text-[10px] text-muted-foreground mb-1">—</span>
      <span className="text-sm font-semibold text-muted-foreground leading-tight">{symbol}</span>
    </div>
  )
}
