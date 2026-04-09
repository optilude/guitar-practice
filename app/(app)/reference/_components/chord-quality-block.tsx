"use client"

import { INTERVAL_DEGREE_COLORS } from "@/lib/rendering/tab"

// ---------------------------------------------------------------------------
// Extracts the target (resolution) degree from a "/" roman numeral.
// "V7/IV" → 4,  "ii/ii" → 2,  "subV7/I" → 1,  "vii°7/vi" → 6
// Returns null if the roman has no "/".
// ---------------------------------------------------------------------------
const ROMAN_TO_DEGREE: Record<string, number> = {
  "I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7,
}

export function targetDegreeFromRoman(roman: string): number | null {
  const slashIdx = roman.indexOf("/")
  if (slashIdx === -1) return null
  const target = roman.slice(slashIdx + 1)
  // Strip accidentals (♭, #) and decorators (°, +, ø, digits)
  const letters = target.replace(/[♭#°+ø0-9]/g, "").toUpperCase()
  return ROMAN_TO_DEGREE[letters] ?? null
}

const DEGREE_HEX: Record<number, string> = {
  1: "#b45309",                      // amber-700  (matches fretboard root accent)
  2: INTERVAL_DEGREE_COLORS.second,  // lime-600
  3: INTERVAL_DEGREE_COLORS.third,   // emerald-600
  4: INTERVAL_DEGREE_COLORS.fourth,  // sky-500
  5: INTERVAL_DEGREE_COLORS.fifth,   // blue-600
  6: INTERVAL_DEGREE_COLORS.sixth,   // violet-600
  7: INTERVAL_DEGREE_COLORS.seventh, // fuchsia-600
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
): { borderColor: string; backgroundColor: string; borderStyle: "solid" | "dashed" | "dotted" } {
  if (variant === "non-diatonic") {
    return {
      borderColor: isSelected ? "rgba(55,65,81,0.7)" : "rgba(55,65,81,0.4)",    // gray-700
      backgroundColor: isSelected ? "rgba(107,114,128,0.18)" : "rgba(107,114,128,0.08)", // gray-500
      borderStyle: "dotted",
    }
  }
  const hex = DEGREE_HEX[degree] ?? "#6b7280"
  const borderAlpha = variant === "borrowed"
    ? (isSelected ? 0.55 : 0.35)
    : (isSelected ? 0.6 : 0.2)
  const bgAlpha = variant === "borrowed"
    ? (isSelected ? 0.14 : 0.07)
    : (isSelected ? 0.2 : 0.1)
  return {
    borderColor: hexToRgba(hex, borderAlpha),
    backgroundColor: hexToRgba(hex, bgAlpha),
    borderStyle: variant === "borrowed" ? "dashed" : "solid",
  }
}

interface ChordQualityBlockProps {
  roman: string      // "I", "ii", "V", "vii°", "♭VII"
  chordName: string  // "Cmaj7", "G7", "Am7"
  degree: number     // 1–7 scale degree — determines colour (ignored for non-diatonic variant)
  isSelected: boolean
  onClick: () => void
  variant?: "diatonic" | "borrowed" | "non-diatonic"
  isSubstitutionPreview?: boolean
}

export function ChordQualityBlock({
  roman,
  chordName,
  degree,
  isSelected,
  onClick,
  variant = "diatonic",
  isSubstitutionPreview = false,
}: ChordQualityBlockProps) {
  const baseStyle = chordBlockStyle(degree, variant, isSelected)
  const style = isSubstitutionPreview
    ? { ...baseStyle, borderStyle: "solid" as const, borderColor: "var(--color-accent)" }
    : baseStyle
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onClick}
      className="flex flex-col items-center rounded-lg border-2 px-3 py-2.5 text-center min-w-[68px] flex-shrink-0 transition-colors focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
      style={style}
    >
      <span className="text-[10px] text-muted-foreground mb-1">{roman}</span>
      <span className="text-sm font-semibold text-foreground leading-tight">{chordName}</span>
    </button>
  )
}
