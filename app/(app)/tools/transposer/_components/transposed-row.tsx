"use client"

import { chordBlockStyle } from "@/app/(app)/reference/_components/chord-quality-block"
import type { InputChord, ChordAnalysis } from "@/lib/theory/key-finder"

interface TransposedRowProps {
  chords: InputChord[]
  analyses: ChordAnalysis[]
}

export function TransposedRow({ chords, analyses }: TransposedRowProps) {
  return (
    <div role="group" aria-label="Transposed chords" className="flex flex-wrap items-center gap-1">
      {chords.map((chord, i) => {
        const analysis = analyses[i]
        if (!analysis) return null
        const variant: "diatonic" | "borrowed" | "non-diatonic" =
          analysis.role === "diatonic" ? "diatonic"
          : analysis.role === "borrowed" ? "borrowed"
          : "non-diatonic"
        return (
          <div key={i} className="flex items-center gap-1 flex-shrink-0">
            {i > 0 && <span className="text-muted-foreground text-sm flex-shrink-0" aria-hidden="true">→</span>}
            <div
              className="flex flex-col items-center rounded-lg border-2 px-3 py-2.5 text-center min-w-[68px] flex-shrink-0"
              style={chordBlockStyle(analysis.degree ?? 1, variant, false)}
            >
              <span className="text-[10px] text-muted-foreground mb-1">{analysis.roman}</span>
              <span className="text-sm font-semibold text-foreground leading-tight">{chord.symbol}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
