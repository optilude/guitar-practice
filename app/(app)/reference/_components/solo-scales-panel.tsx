"use client"

import { Scale } from "tonal"
import { SCALE_TONAL_NAMES } from "@/lib/theory/solo-scales"
import type { SoloScales } from "@/lib/theory/types"

interface SoloScalesPanelProps {
  scales: SoloScales
  chordName: string  // e.g. "G7", "Am7" — used in heading
  onScaleSelect?: (tonic: string, scaleName: string) => void
}

function noteString(tonic: string, scaleName: string): string {
  const tonalName = SCALE_TONAL_NAMES[scaleName]
  if (!tonalName) return ""
  return Scale.get(`${tonic} ${tonalName}`).notes.join(" ")
}

export function SoloScalesPanel({ scales, chordName, onScaleSelect }: SoloScalesPanelProps) {
  const primaryNotes = noteString(scales.chordTonic, scales.primary.scaleName)

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        Scales to solo over {chordName}
      </p>

      {/* Primary scale */}
      <button
        type="button"
        onClick={() => onScaleSelect?.(scales.chordTonic, scales.primary.scaleName)}
        className="flex items-center gap-3 flex-wrap text-left group cursor-pointer"
        title="Open in Scales tab"
      >
        <span className="flex items-baseline gap-1">
          <span className="text-base font-semibold text-foreground group-hover:text-accent transition-colors">
            {scales.chordTonic} {scales.primary.scaleName}
          </span>
          <span className="text-xs text-muted-foreground/40 group-hover:text-accent transition-colors select-none">↗</span>
        </span>
        {primaryNotes && (
          <span className="text-xs text-muted-foreground">· {primaryNotes}</span>
        )}
      </button>

      {/* Also works */}
      {scales.additional.length > 0 && (
        <>
          <div className="border-t border-border" />
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Also works
            </p>
            {scales.additional.map((entry) => {
              const notes = noteString(scales.chordTonic, entry.scaleName)
              return (
                <button
                  key={entry.scaleName}
                  type="button"
                  onClick={() => onScaleSelect?.(scales.chordTonic, entry.scaleName)}
                  className="flex items-center gap-2 flex-wrap text-left w-full group cursor-pointer"
                  title="Open in Scales tab"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                  <span className="flex items-baseline gap-1">
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      {scales.chordTonic} {entry.scaleName}
                    </span>
                    <span className="text-xs text-muted-foreground/30 group-hover:text-muted-foreground transition-colors select-none">↗</span>
                  </span>
                  {notes && (
                    <span className="text-xs text-muted-foreground/60">· {notes}</span>
                  )}
                  {entry.hint && (
                    <span className="text-xs text-muted-foreground/60">· {entry.hint}</span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
