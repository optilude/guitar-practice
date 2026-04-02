"use client"

import { INTERVAL_DEGREE_COLORS } from "@/lib/rendering/tab"

interface ChordQualityBlockProps {
  roman: string      // "I", "ii", "V", "vii°", "♭VII"
  chordName: string  // "Cmaj7", "G7", "Am7"
  degree: number     // 1–7 scale degree — determines colour
  isSelected: boolean
  onClick: () => void
}

// Maps scale degree to the same hex palette used in fretboard/stave note highlighting.
// Degree 1 = root (amber), 2 = second (yellow), …, 7 = seventh (purple).
const DEGREE_HEX: Record<number, string> = {
  1: "#b45309",                      // amber-700  (matches fretboard root accent)
  2: INTERVAL_DEGREE_COLORS.second,  // yellow-600
  3: INTERVAL_DEGREE_COLORS.third,   // green-600
  4: INTERVAL_DEGREE_COLORS.fourth,  // rose-600
  5: INTERVAL_DEGREE_COLORS.fifth,   // blue-600
  6: INTERVAL_DEGREE_COLORS.sixth,   // cyan-600
  7: INTERVAL_DEGREE_COLORS.seventh, // purple-600
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export function ChordQualityBlock({
  roman,
  chordName,
  degree,
  isSelected,
  onClick,
}: ChordQualityBlockProps) {
  const hex = DEGREE_HEX[degree] ?? "#6b7280"
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onClick}
      // border-2 always present so selection never shifts layout
      className="flex flex-col items-center rounded-lg border-2 px-3 py-2.5 text-center min-w-[68px] flex-shrink-0 transition-colors focus:outline-none focus:ring-1 focus:ring-accent"
      style={{
        borderColor:     hexToRgba(hex, isSelected ? 0.6 : 0.2),
        backgroundColor: hexToRgba(hex, isSelected ? 0.2 : 0.1),
      }}
    >
      <span className="text-[10px] text-muted-foreground mb-1">{roman}</span>
      <span className="text-sm font-semibold text-foreground leading-tight">{chordName}</span>
    </button>
  )
}
