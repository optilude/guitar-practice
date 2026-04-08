"use client"

import { INTERVAL_DEGREE_COLORS } from "@/lib/rendering/tab"

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

export function chordBlockStyle(
  degree: number,
  variant: "diatonic" | "borrowed" | "non-diatonic",
  isSelected: boolean,
): { borderColor: string; backgroundColor: string } {
  if (variant === "non-diatonic") {
    return {
      borderColor: isSelected ? "rgba(55,65,81,0.7)" : "rgba(55,65,81,0.4)",    // gray-700
      backgroundColor: isSelected ? "rgba(107,114,128,0.18)" : "rgba(107,114,128,0.08)", // gray-500
    }
  }
  const hex = DEGREE_HEX[degree] ?? "#6b7280"
  const borderAlpha = variant === "borrowed"
    ? (isSelected ? 0.4 : 0.15)
    : (isSelected ? 0.6 : 0.2)
  const bgAlpha = variant === "borrowed"
    ? (isSelected ? 0.14 : 0.07)
    : (isSelected ? 0.2 : 0.1)
  return {
    borderColor: hexToRgba(hex, borderAlpha),
    backgroundColor: hexToRgba(hex, bgAlpha),
  }
}

interface ChordQualityBlockProps {
  roman: string      // "I", "ii", "V", "vii°", "♭VII"
  chordName: string  // "Cmaj7", "G7", "Am7"
  degree: number     // 1–7 scale degree — determines colour (ignored for non-diatonic variant)
  isSelected: boolean
  onClick: () => void
  variant?: "diatonic" | "borrowed" | "non-diatonic"
}

export function ChordQualityBlock({
  roman,
  chordName,
  degree,
  isSelected,
  onClick,
  variant = "diatonic",
}: ChordQualityBlockProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onClick}
      className="flex flex-col items-center rounded-lg border-2 px-3 py-2.5 text-center min-w-[68px] flex-shrink-0 transition-colors focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
      style={chordBlockStyle(degree, variant, isSelected)}
    >
      <span className="text-[10px] text-muted-foreground mb-1">{roman}</span>
      <span className="text-sm font-semibold text-foreground leading-tight">{chordName}</span>
    </button>
  )
}
