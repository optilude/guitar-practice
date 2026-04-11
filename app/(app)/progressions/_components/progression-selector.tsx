"use client"

import { useState, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import { listProgressions } from "@/lib/theory"
import { AddToGoalButton } from "@/components/add-to-goal-button"
import type { UserProgressionForTab } from "@/app/(app)/reference/_components/reference-page-client"

const CATEGORY_ORDER = ["Pop", "Blues", "Jazz", "Rock", "Folk / Country", "Classical / Modal"]

interface ProgressionSelectorProps {
  selected: string
  tonic: string
  userProgressions: UserProgressionForTab[]
  onSelectionChange: (selected: string) => void
  onEditMeta: () => void
}

export function ProgressionSelector({
  selected,
  tonic,
  userProgressions,
  onSelectionChange,
  onEditMeta,
}: ProgressionSelectorProps) {
  const [infoOpen, setInfoOpen] = useState(false)
  const infoRef = useRef<HTMLDivElement>(null)

  const builtinProgressions = listProgressions()
  const builtinProg = builtinProgressions.find(p => p.name === selected)
  const userProg = userProgressions.find(p => p.id === selected)
  const isCustom = !!userProg

  const romanDisplay = userProg
    ? userProg.degrees.join(" – ")
    : builtinProg?.romanDisplay ?? ""

  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    items: builtinProgressions.filter(p => p.category === cat),
  })).filter(g => g.items.length > 0)

  // Close info popover on click-outside or Escape
  useEffect(() => {
    if (!infoOpen) return
    function handlePointerDown(e: PointerEvent) {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setInfoOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setInfoOpen(false)
    }
    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [infoOpen])

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <label
        htmlFor="progression-select"
        className="text-xs uppercase tracking-widest text-muted-foreground whitespace-nowrap"
      >
        Progression
      </label>

      <select
        id="progression-select"
        aria-label="Progression"
        value={selected}
        onChange={e => onSelectionChange(e.target.value)}
        className="bg-card border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent w-fit"
      >
        {grouped.map(({ category, items }) => (
          <optgroup key={category} label={category}>
            {items.map(p => (
              <option key={p.name} value={p.name}>
                {p.romanDisplay.length <= 25
                  ? `${p.displayName} · ${p.romanDisplay}`
                  : p.displayName}
              </option>
            ))}
          </optgroup>
        ))}
        {userProgressions.length > 0 && (
          <optgroup label="My Progressions">
            {userProgressions.map(p => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {/* Visually-hidden label for JSDOM/testing-library compatibility with optgroup */}
      {userProgressions.length > 0 && (
        <span className="sr-only" aria-hidden="true">My Progressions</span>
      )}

      {/* Add to goal */}
      {isCustom ? (
        <AddToGoalButton
          kind="progression"
          userProgressionId={userProg.id}
          defaultKey={tonic}
          displayName={userProg.displayName}
          popupAlign="right"
        />
      ) : (
        <AddToGoalButton
          kind="progression"
          subtype={selected}
          defaultKey={tonic}
          displayName={builtinProg?.displayName ?? selected}
          popupAlign="right"
        />
      )}

      {/* Info popover */}
      <div ref={infoRef} className="relative">
        <button
          type="button"
          aria-label="Progression info"
          aria-expanded={infoOpen}
          onClick={() => setInfoOpen(o => !o)}
          className="flex items-center justify-center w-6 h-6 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors text-xs font-semibold select-none"
        >
          ?
        </button>

        {infoOpen && (
          <div
            role="dialog"
            aria-label="Progression details"
            className="absolute left-0 top-8 z-20 w-72 rounded-lg border border-border bg-card shadow-lg p-4 space-y-3"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">
                {userProg?.displayName ?? builtinProg?.displayName}
              </p>
              <p className="text-xs text-accent font-mono mt-0.5">{romanDisplay}</p>
            </div>
            {userProg ? (
              userProg.description ? (
                <div className="prose prose-sm max-w-none text-foreground text-xs">
                  <ReactMarkdown>{userProg.description}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No description.</p>
              )
            ) : (
              <div className="space-y-1.5">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-0.5">Examples</p>
                  <p className="text-xs text-foreground">{builtinProg?.examples}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-0.5">Notes</p>
                  <p className="text-xs text-foreground">{builtinProg?.notes}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pencil — only for custom progressions */}
      {isCustom && (
        <button
          type="button"
          aria-label="Edit progression"
          onClick={onEditMeta}
          className="flex items-center justify-center w-6 h-6 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            <path d="m15 5 4 4"/>
          </svg>
        </button>
      )}
    </div>
  )
}
