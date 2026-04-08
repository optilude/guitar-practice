"use client"

import { useRef, useEffect, useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ChordQualityBlock } from "@/app/(app)/reference/_components/chord-quality-block"
import { listChordDbSuffixes } from "@/lib/theory/chords"
import { parseChord, type ChordAnalysis } from "@/lib/theory/key-finder"

// Two-char roots (Ab, Bb, etc.) must precede single-char roots (A, B, etc.)
// so that Array.find returns the longest prefix match first.
const ROOT_NOTES = ["Ab", "A", "Bb", "B", "C", "Db", "D", "Eb", "E", "F", "Gb", "G"] as const

const ALL_SUFFIXES = listChordDbSuffixes()

interface ChordTileProps {
  id: string
  symbol: string
  analysis: ChordAnalysis | null
  isEditing: boolean
  onCommit: (symbol: string) => void
  onRemove: () => void
  onStartEdit: () => void
}

export function ChordTile({
  id,
  symbol,
  analysis,
  isEditing,
  onCommit,
  onRemove,
  onStartEdit,
}: ChordTileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: isEditing,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const [inputValue, setInputValue] = useState(symbol)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      setInputValue(symbol)
      setSuggestions([])
      setActiveIdx(-1)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [isEditing, symbol])

  function detectSuggestions(value: string) {
    if (!value) { setSuggestions([]); return }
    const root = ROOT_NOTES.find(r => value.startsWith(r))
    if (!root) { setSuggestions([]); return }
    const suffix = value.slice(root.length)
    setSuggestions(
      ALL_SUFFIXES.filter(s => s.startsWith(suffix)).slice(0, 10).map(s => `${root}${s}`),
    )
  }

  function commit(value: string) {
    setSuggestions([])
    setActiveIdx(-1)
    const trimmed = value.trim()
    // Reject non-empty input that TonalJS cannot parse — revert to original
    if (trimmed && !parseChord(trimmed)) {
      onCommit(symbol)
      return
    }
    onCommit(trimmed)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, -1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      commit(activeIdx >= 0 && suggestions[activeIdx] ? suggestions[activeIdx] : inputValue)
    } else if (e.key === "Escape") {
      setSuggestions([])
      onCommit(symbol)
    }
  }

  // Editing mode — no drag, no × button
  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className="relative flex-shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => {
            setInputValue(e.target.value)
            detectSuggestions(e.target.value)
            setActiveIdx(-1)
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => commit(inputValue)}
          className="w-20 rounded border border-accent bg-card text-foreground text-sm text-center px-2 py-2 focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="Chord"
        />
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 z-50 mt-1 w-28 rounded border border-border bg-card shadow-md overflow-hidden">
            {suggestions.map((s, i) => (
              <button
                key={s}
                type="button"
                onMouseDown={e => { e.preventDefault(); commit(s) }}
                className={`w-full text-left px-2 py-1 text-xs transition-colors ${
                  i === activeIdx
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const isDiatonic = analysis?.role === "diatonic" || analysis?.role === "borrowed"

  // × button rendered inside every display variant
  const removeBtn = (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onRemove() }}
      aria-label={`remove ${symbol}`}
      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-card border border-border text-muted-foreground hover:text-destructive hover:border-destructive text-[10px] leading-none flex items-center justify-center cursor-pointer z-10"
    >
      ×
    </button>
  )

  // Whole tile is the drag handle — PointerSensor distance:5 (set in ChordInputRow) prevents accidental drags
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
      {...attributes}
      {...listeners}
    >
      {analysis && isDiatonic ? (
        <div className="relative">
          <ChordQualityBlock
            roman={analysis.roman ?? ""}
            chordName={symbol}
            degree={analysis.degree ?? 1}
            isSelected={false}
            onClick={onStartEdit}
          />
          {removeBtn}
        </div>
      ) : analysis ? (
        <div className="relative">
          <button
            type="button"
            onClick={onStartEdit}
            className="flex flex-col items-center rounded-lg border-2 border-border px-3 py-2.5 text-center min-w-[68px] bg-card opacity-40 hover:opacity-60 transition-opacity"
          >
            <span className="text-[10px] text-muted-foreground mb-1">—</span>
            <span className="text-sm font-semibold text-muted-foreground leading-tight">{symbol}</span>
          </button>
          {removeBtn}
        </div>
      ) : (
        <div className="relative">
          <button
            type="button"
            onClick={onStartEdit}
            className="flex flex-col items-center rounded-lg border-2 border-border px-3 py-2.5 text-center min-w-[68px] bg-card hover:bg-muted transition-colors"
          >
            <span className="text-[10px] text-muted-foreground mb-1">&nbsp;</span>
            <span className="text-sm font-semibold text-foreground leading-tight">{symbol}</span>
          </button>
          {removeBtn}
        </div>
      )}
    </div>
  )
}
