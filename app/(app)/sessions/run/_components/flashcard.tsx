"use client"

import { useState, useCallback } from "react"
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

const KIND_LABELS: Record<string, string> = {
  scale: "Scale",
  arpeggio: "Arpeggio",
  chord: "Chord",
  inversion: "Inversion",
  progression: "Progression",
  harmony: "Mode",
  lesson: "Lesson",
}

/** When practicing multiple keys, show a key-agnostic title (e.g. "Ionian Mode" not "C Ionian") */
function topicTitle(topic: SessionTopic, multipleKeys: boolean): string {
  if (!multipleKeys) return topic.displayName
  const kindLabel = KIND_LABELS[topic.kind] ?? topic.kind
  if (topic.subtype) {
    const subtypeLabel = topic.subtype.charAt(0).toUpperCase() + topic.subtype.slice(1).replace(/_/g, " ")
    return `${subtypeLabel} ${kindLabel}`
  }
  return kindLabel
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
              Open lesson ↗
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
  const [showBack, setShowBack] = useState(false)
  const [scaling, setScaling] = useState(false)
  const currentKey = currentKeySequence[currentKeyIndex] ?? ""
  const hasTopic = section.topic !== null
  const showKeys = hasTopic && section.topic!.kind !== "lesson" && currentKeySequence[0] !== ""
  const multipleKeys = showKeys && currentKeySequence.length > 1

  const flipTo = useCallback((toBack: boolean) => {
    setScaling(true)
    setTimeout(() => {
      setShowBack(toBack)
      setScaling(false)
    }, 150)
  }, [])

  const badge = (
    <span className={cn("text-xs font-medium px-2 py-0.5 rounded", SECTION_TYPE_COLORS[section.type])}>
      {SECTION_TYPE_LABELS[section.type] ?? section.type}
    </span>
  )

  if (!hasTopic) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full rounded-xl border border-border bg-card p-6 text-center space-y-3">
        <span>{badge}</span>
        <h2 className="text-2xl font-semibold">{section.title}</h2>
        {section.description && <p className="text-sm text-muted-foreground">{section.description}</p>}
      </div>
    )
  }

  return (
    <div
      className="flex flex-col min-h-full rounded-xl border border-border bg-card"
      style={{
        transform: scaling ? "scaleX(0)" : "scaleX(1)",
        transition: "transform 150ms ease-in-out",
        transformOrigin: "center",
      }}
    >
      {showBack ? (
        <div className="flex flex-col flex-1 p-4">
          {showKeys && (
            <div className="mb-4 shrink-0">
              <KeyStrip
                keys={currentKeySequence}
                currentIndex={currentKeyIndex}
                onSelect={onSelectKey}
                onPrev={onPrevKey}
                onNext={onNextKey}
              />
            </div>
          )}
          <div className="border-t border-border pt-4 flex-1">
            <ReferencePanel topic={section.topic!} currentKey={currentKey || "C"} />
          </div>
          <button
            onClick={() => flipTo(false)}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            Turn card ↩
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 p-6">
          {badge}
          <h2 className="text-2xl font-semibold text-center">
            {topicTitle(section.topic!, multipleKeys)}
          </h2>
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
            onClick={() => flipTo(true)}
            className="mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Turn card ↩
          </button>
        </div>
      )}
    </div>
  )
}
