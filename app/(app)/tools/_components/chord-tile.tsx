"use client"

import { useRef, useEffect, useState } from "react"
import { Chord } from "tonal"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ChordQualityBlock } from "@/app/(app)/reference/_components/chord-quality-block"
import { listChordDbSuffixes } from "@/lib/theory/chords"
import { parseChord, type ChordAnalysis } from "@/lib/theory/key-finder"

// Two-char roots must precede their single-char base so Array.find returns the
// longest prefix match first (e.g. "A#" before "A", "Gb" before "G").
const ROOT_NOTES = ["Ab", "A#", "A", "Bb", "B", "C#", "C", "Db", "D#", "D", "Eb", "E", "F#", "F", "Gb", "G#", "G"] as const

const ALL_SUFFIXES = listChordDbSuffixes()

function toDbCanonical(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return ""

  const directRoot = ROOT_NOTES.find(
    r => trimmed.startsWith(r) && ALL_SUFFIXES.includes(trimmed.slice(r.length))
  )
  if (directRoot !== undefined) return trimmed

  const chord = Chord.get(trimmed)
  if (chord.empty || !chord.tonic) return null
  const { tonic, type } = chord
  const match = ALL_SUFFIXES.find(s => Chord.get(`${tonic}${s}`).type === type)
  return match !== undefined ? `${tonic}${match}` : (chord.symbol || tonic)
}

interface ChordTileProps {
  id: string
  symbol: string
  analysis: ChordAnalysis | null
  isEditing: boolean
  onCommit: (symbol: string) => void
  onRemove: () => void
  onStartEdit: () => void
  onTabNext?: () => void
  onArrowPrev?: () => void
  onArrowNext?: () => void
}

export function ChordTile({
  id,
  symbol,
  analysis,
  isEditing,
  onCommit,
  onRemove,
  onStartEdit,
  onTabNext,
  onArrowPrev,
  onArrowNext,
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
  const isSelectingSuggestionRef = useRef(false)

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

  function commitAndNavigate(value: string, navigate?: () => void) {
    isSelectingSuggestionRef.current = false
    setSuggestions([])
    setActiveIdx(-1)
    const canonical = toDbCanonical(value)
    if (canonical === null) {
      onCommit(symbol)
    } else {
      onCommit(canonical)
    }
    navigate?.()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1))
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, -1))
      return
    }

    const activeValue = activeIdx >= 0 && suggestions[activeIdx] ? suggestions[activeIdx] : inputValue

    if (e.key === "Enter") {
      e.preventDefault()
      commitAndNavigate(activeValue)
      return
    }
    if (e.key === "Escape") {
      setSuggestions([])
      onCommit(symbol)
      return
    }
    if (e.key === "Tab") {
      e.preventDefault()
      commitAndNavigate(activeValue, e.shiftKey ? onArrowPrev : onTabNext)
      return
    }

    if (suggestions.length === 0) {
      if (e.key === "ArrowLeft") {
        const input = inputRef.current
        if (input && input.selectionStart === 0 && input.selectionEnd === 0) {
          e.preventDefault()
          commitAndNavigate(inputValue, onArrowPrev)
        }
      } else if (e.key === "ArrowRight") {
        const input = inputRef.current
        if (input && input.selectionStart === input.value.length && input.selectionEnd === input.value.length) {
          e.preventDefault()
          commitAndNavigate(inputValue, onArrowNext)
        }
      }
    }
  }

  // Editing mode
  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className="relative flex-shrink-0">
        <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-border px-3 py-2.5 w-[80px]">
          <span className="text-[10px] mb-1 invisible" aria-hidden="true">·</span>
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
            onBlur={() => {
              if (!isSelectingSuggestionRef.current) commitAndNavigate(inputValue)
              isSelectingSuggestionRef.current = false
            }}
            className="w-full bg-transparent text-foreground text-sm font-semibold text-center focus:outline-none leading-tight placeholder:text-muted-foreground placeholder:font-normal"
            placeholder="Chord"
          />
        </div>
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 z-50 mt-1 w-28 rounded border border-border bg-card shadow-md overflow-hidden">
            {suggestions.map((s, i) => (
              <button
                key={s}
                type="button"
                onMouseDown={e => {
                  e.preventDefault()
                  isSelectingSuggestionRef.current = true
                  commitAndNavigate(s)
                }}
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
      {...attributes}
      {...listeners}
    >
      {analysis ? (
        <div className="relative">
          <ChordQualityBlock
            roman={analysis.roman}
            chordName={symbol}
            degree={analysis.degree ?? 1}
            isSelected={false}
            onClick={onStartEdit}
            variant={
              analysis.role === "diatonic" ? "diatonic"
              : analysis.role === "borrowed" ? "borrowed"
              : "non-diatonic"
            }
          />
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
