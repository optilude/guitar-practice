"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { SessionSection, SessionTopic } from "@/lib/sessions"
import { KeyStrip } from "./key-strip"
import { ScalePanel } from "@/app/(app)/reference/_components/scale-panel"
import { ChordPanel } from "@/app/(app)/reference/_components/chord-panel"
import { ArpeggioPanel } from "@/app/(app)/reference/_components/arpeggio-panel"
import { InversionPanel } from "@/app/(app)/reference/_components/inversion-panel"
import { ProgressionsTab } from "@/app/(app)/reference/_components/progressions-tab"
import { HarmonyTab } from "@/app/(app)/reference/_components/harmony-tab"

const SECTION_TYPE_LABELS: Record<string, string> = {
  warmup: "Warm Up",
  technique: "Technique",
  muscle_memory: "Muscle Memory",
  theory: "Theory",
  lessons: "Lessons",
  songs: "Songs",
  free_practice: "Free Practice",
}

const SECTION_TYPE_COLORS: Record<string, string> = {
  warmup: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  technique: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  muscle_memory: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  theory: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  lessons: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  songs: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
  free_practice: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

interface FlashCardProps {
  section: SessionSection
  currentKeyIndex: number
  currentKeySequence: string[]
  onSelectKey: (index: number) => void
  onPrevKey: () => void
  onNextKey: () => void
}

function ReferencePanel({ topic, currentKey }: { topic: SessionTopic; currentKey: string }) {
  const [root, setRoot] = useState(currentKey)
  // Sync if key changes externally
  if (root !== currentKey) setRoot(currentKey)

  switch (topic.kind) {
    case "scale":
      return <ScalePanel root={root} onRootChange={setRoot} scaleTypeTrigger={topic.subtype ? { type: topic.subtype } : null} />
    case "arpeggio":
      return <ArpeggioPanel root={root} onRootChange={setRoot} chordTypeTrigger={topic.subtype ? { type: topic.subtype } : null} />
    case "chord":
      return <ChordPanel root={root} onRootChange={setRoot} chordTypeTrigger={topic.subtype ? { type: topic.subtype } : null} />
    case "inversion":
      return <InversionPanel root={root} onRootChange={setRoot} inversionTypeTrigger={topic.subtype ? { type: topic.subtype } : null} />
    case "progression":
      return <ProgressionsTab tonic={root} defaultProgressionName={topic.subtype ?? undefined} />
    case "harmony":
      return <HarmonyTab tonic={root} defaultMode={topic.subtype ?? undefined} />
    case "lesson":
      return (
        <div className="p-4 space-y-3">
          <p className="font-medium">{topic.displayName}</p>
          {topic.lessonUrl ? (
            <a
              href={topic.lessonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
            >
              Open lesson →
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">(no link available)</p>
          )}
        </div>
      )
    default:
      return null
  }
}

export function FlashCard({ section, currentKeyIndex, currentKeySequence, onSelectKey, onPrevKey, onNextKey }: FlashCardProps) {
  const [flipped, setFlipped] = useState(false)
  const currentKey = currentKeySequence[currentKeyIndex] ?? ""
  const hasTopic = section.topic !== null
  const showKeys = hasTopic && section.topic!.kind !== "lesson" && currentKeySequence[0] !== ""

  // Reset flip when section changes
  // (handled by parent re-mounting or key prop)

  const badge = (
    <span className={cn("text-xs font-medium px-2 py-0.5 rounded", SECTION_TYPE_COLORS[section.type])}>
      {SECTION_TYPE_LABELS[section.type] ?? section.type}
    </span>
  )

  if (!hasTopic) {
    return (
      <div className="flex flex-col items-center justify-center h-72 rounded-xl border border-border bg-card p-6 text-center space-y-3">
        {badge}
        <h2 className="text-2xl font-semibold">{section.title}</h2>
        {section.description && <p className="text-sm text-muted-foreground">{section.description}</p>}
      </div>
    )
  }

  return (
    <div className="relative" style={{ perspective: "1000px" }}>
      <div
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 0.4s ease",
          position: "relative",
          minHeight: flipped ? "auto" : "18rem",
        }}
      >
        {/* Front */}
        <div
          className={cn(
            "rounded-xl border border-border bg-card p-6",
            flipped ? "invisible" : "visible",
          )}
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex flex-col items-center gap-4">
            {badge}
            <h2 className="text-2xl font-semibold text-center">{section.topic!.displayName}</h2>
            {showKeys && (
              <div className="w-full">
                <KeyStrip
                  keys={currentKeySequence}
                  currentIndex={currentKeyIndex}
                  onSelect={onSelectKey}
                  onPrev={onPrevKey}
                  onNext={onNextKey}
                />
              </div>
            )}
            <button
              onClick={() => setFlipped(true)}
              className="mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Turn card ↩
            </button>
          </div>
        </div>

        {/* Back */}
        <div
          className={cn(
            "rounded-xl border border-border bg-card p-4 overflow-y-auto max-h-[80vh]",
            flipped ? "visible" : "invisible absolute inset-0",
          )}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="space-y-4">
            {showKeys && (
              <KeyStrip
                keys={currentKeySequence}
                currentIndex={currentKeyIndex}
                onSelect={onSelectKey}
                onPrev={onPrevKey}
                onNext={onNextKey}
              />
            )}
            <div className="border-t border-border pt-4">
              <ReferencePanel topic={section.topic!} currentKey={currentKey || "C"} />
            </div>
            <button
              onClick={() => setFlipped(false)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Turn card ↩
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
