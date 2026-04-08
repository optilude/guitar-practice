"use client"

import { ChordQualityBlock } from "@/app/(app)/reference/_components/chord-quality-block"
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
            {i > 0 && <span className="text-muted-foreground text-sm flex-shrink-0">→</span>}
            <ChordQualityBlock
              roman={analysis.roman}
              chordName={chord.symbol}
              degree={analysis.degree ?? 1}
              isSelected={false}
              onClick={() => {}}
              variant={variant}
            />
          </div>
        )
      })}
    </div>
  )
}
