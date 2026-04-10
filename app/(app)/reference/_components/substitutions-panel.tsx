"use client"

import { cn } from "@/lib/utils"
import { btn } from "@/lib/button-styles"
import type { ChordSubstitution } from "@/lib/theory/types"

interface SubstitutionsPanelProps {
  substitutions: ChordSubstitution[]
  chordName: string       // e.g. "Gmaj7" — used in heading
  previewedId: string | null
  onPreview: (sub: ChordSubstitution | null) => void
  onApply?: (sub: ChordSubstitution) => void
}

export function SubstitutionsPanel({
  substitutions,
  chordName,
  previewedId,
  onPreview,
  onApply,
}: SubstitutionsPanelProps) {
  if (substitutions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No substitutions available for {chordName}.
      </p>
    )
  }

  // Group by ruleName, preserving insertion (sortRank) order
  const groups: { ruleName: string; items: ChordSubstitution[] }[] = []
  for (const sub of substitutions) {
    const existing = groups.find(g => g.ruleName === sub.ruleName)
    if (existing) {
      existing.items.push(sub)
    } else {
      groups.push({ ruleName: sub.ruleName, items: [sub] })
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        Substitutions for {chordName}
      </p>

      {groups.map(group => (
        <div key={group.ruleName} className="space-y-1.5">
          <p className="text-xs text-muted-foreground">{group.ruleName}</p>
          {group.items.map(sub => {
            const isActive = sub.id === previewedId
            return (
              <div
                key={sub.id}
                role="button"
                tabIndex={0}
                onClick={() => onPreview(isActive ? null : sub)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onPreview(isActive ? null : sub)
                  }
                }}
                className={cn(
                  "flex items-baseline gap-2 flex-wrap text-left w-full rounded px-2 py-1 border transition-colors cursor-pointer",
                  isActive
                    ? "border-dashed border-accent bg-accent/5"
                    : "border-transparent hover:bg-muted",
                )}
              >
                <span className="text-sm font-semibold text-foreground">{sub.label}</span>
                <span className="text-xs text-muted-foreground">· {sub.effect}</span>
                {isActive && onApply && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      onApply(sub)
                    }}
                    className={cn(btn("primary", "sm"), "ml-auto")}
                  >
                    Apply
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
