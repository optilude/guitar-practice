"use client"

import { Scale } from "tonal"
import { SCALE_TONAL_NAMES } from "@/lib/theory/solo-scales"
import type { SoloScales } from "@/lib/theory/types"

interface SoloScalesPanelProps {
  scales: SoloScales
  chordName: string  // e.g. "G7", "Am7" — used in heading and badge color
}

function badgeColor(type: string): string {
  if (type === "maj7" || type === "") return "bg-green-600 text-black"
  if (type === "7") return "bg-amber-500 text-black"
  if (type === "m7") return "bg-blue-600 text-white"
  if (type === "m7b5" || type === "dim7") return "bg-purple-600 text-white"
  return "bg-muted text-muted-foreground"
}

export function SoloScalesPanel({ scales, chordName }: SoloScalesPanelProps) {
  // Derive chord type from chordName by stripping tonic prefix (e.g. "G7" → "7")
  const type = chordName.replace(/^[A-G][#b]?/, "")

  const tonalName = SCALE_TONAL_NAMES[scales.primary.scaleName]
  const noteString = tonalName
    ? Scale.get(`${scales.chordTonic} ${tonalName}`).notes.join(" ")
    : ""

  return (
    <div className="rounded-lg border border-border bg-card/50 p-3 space-y-3">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        Scales to solo over {chordName}
      </p>

      {/* Primary scale */}
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${badgeColor(type)}`}
        >
          PRIMARY
        </span>
        <span className="text-base font-semibold text-foreground">
          {scales.chordTonic} {scales.primary.scaleName}
        </span>
        {noteString && (
          <span className="text-xs text-muted-foreground">· {noteString}</span>
        )}
      </div>

      {/* Also works */}
      {scales.additional.length > 0 && (
        <>
          <div className="border-t border-border" />
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Also works
            </p>
            {scales.additional.map((entry) => (
              <div key={entry.scaleName} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">
                  {scales.chordTonic} {entry.scaleName}
                </span>
                {entry.hint && (
                  <span className="text-xs text-muted-foreground/60">· {entry.hint}</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
