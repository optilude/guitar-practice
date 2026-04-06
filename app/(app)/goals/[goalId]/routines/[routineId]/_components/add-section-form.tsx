"use client"

import { useState } from "react"
import {
  createSection,
  addTopicToSection,
  updateSectionTopic,
} from "@/app/(app)/goals/actions"
import { formatTopicName } from "@/lib/goals"
import type { SectionType, PracticeMode } from "@/lib/generated/prisma/enums"

const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  warmup: "Warm Up",
  technique: "Technique",
  muscle_memory: "Muscle Memory",
  theory: "Theory",
  lessons: "Lessons",
  songs: "Songs",
  free_practice: "Free Practice",
}

const TOPIC_KIND_ORDER = ["lesson", "scale", "chord", "inversion", "arpeggio", "progression", "harmony"]

const TOPIC_KIND_LABELS: Record<string, string> = {
  lesson: "Lessons",
  scale: "Scales",
  chord: "Chords",
  inversion: "Inversions",
  arpeggio: "Arpeggios",
  progression: "Progressions",
  harmony: "Harmony",
}

const PRACTICE_MODE_LABELS: Record<PracticeMode, string> = {
  chromatic_asc: "Chromatic ascending",
  chromatic_desc: "Chromatic descending",
  circle_fifths_asc: "Circle of fifths (ascending)",
  circle_fourths_desc: "Circle of fourths (descending)",
  random: "Random",
}

type GoalTopicForDisplay = {
  id: string
  kind: string
  subtype: string | null
  defaultKey: string | null
  lesson?: { title: string } | null
}

interface AddSectionFormProps {
  routineId: string
  availableTopics: GoalTopicForDisplay[]
  onAdded: () => void
}

export function AddSectionForm({ routineId, availableTopics, onAdded }: AddSectionFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState<SectionType>("warmup")
  const [titleValue, setTitleValue] = useState("")
  const [durationValue, setDurationValue] = useState(10)
  const [descValue, setDescValue] = useState("")
  const [selectedGoalTopicId, setSelectedGoalTopicId] = useState("")
  const [keyMode, setKeyMode] = useState<"default" | "multi">("default")
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("chromatic_asc")
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedTopic = availableTopics.find((t) => t.id === selectedGoalTopicId) ?? null

  function handleClose() {
    setIsOpen(false)
    setError(null)
    setTitleValue("")
    setType("warmup")
    setDurationValue(10)
    setDescValue("")
    setSelectedGoalTopicId("")
    setKeyMode("default")
    setPracticeMode("chromatic_asc")
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    setError(null)

    const defaultTitle = SECTION_TYPE_LABELS[type]
    const result = await createSection(routineId, {
      type,
      title: titleValue.trim() || defaultTitle,
      durationMinutes: Math.max(1, Math.round(durationValue)),
      description: descValue.trim(),
    })

    if ("error" in result) {
      setError(result.error)
      setIsPending(false)
      return
    }

    if (selectedGoalTopicId) {
      const topicResult = await addTopicToSection(result.id, selectedGoalTopicId)
      if ("error" in topicResult) {
        setError(topicResult.error)
        setIsPending(false)
        return
      }
      if (selectedTopic && selectedTopic.kind !== "lesson" && keyMode === "multi") {
        await updateSectionTopic(topicResult.sectionTopicId, {
          keys: ["*"],
          practiceMode,
        })
      }
    }

    setIsPending(false)
    handleClose()
    onAdded()
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors border border-dashed border-border rounded px-3 py-2 w-full"
      >
        + Add section
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 rounded-lg border border-border p-4 space-y-3 bg-card">
      {/* Type + Duration */}
      <div className="flex gap-3 items-start">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as SectionType)}
            className="h-9 rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {(Object.keys(SECTION_TYPE_LABELS) as SectionType[]).map((t) => (
              <option key={t} value={t}>{SECTION_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div className="w-24 flex-shrink-0">
          <label className="block text-xs text-muted-foreground mb-1">Duration (min)</label>
          <input
            type="number"
            min={1}
            max={480}
            value={durationValue}
            onChange={(e) => setDurationValue(Number(e.target.value))}
            className="h-9 w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Title</label>
        <input
          value={titleValue}
          onChange={(e) => setTitleValue(e.target.value)}
          placeholder={SECTION_TYPE_LABELS[type]}
          maxLength={120}
          className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* Topic */}
      {availableTopics.length > 0 && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Topic</label>
          <select
            value={selectedGoalTopicId}
            onChange={(e) => {
              setSelectedGoalTopicId(e.target.value)
              setKeyMode("default")
            }}
            className="h-9 rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent w-full"
          >
            <option value="">No topic</option>
            {TOPIC_KIND_ORDER
              .map((kind) => ({ kind, topics: availableTopics.filter((t) => t.kind === kind) }))
              .filter(({ topics }) => topics.length > 0)
              .map(({ kind, topics }) => (
                <optgroup key={kind} label={TOPIC_KIND_LABELS[kind] ?? kind}>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {formatTopicName(t as Parameters<typeof formatTopicName>[0])}
                    </option>
                  ))}
                </optgroup>
              ))}
          </select>

          {selectedTopic && selectedTopic.kind !== "lesson" && (
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <select
                value={keyMode}
                onChange={(e) => setKeyMode(e.target.value as "default" | "multi")}
                className="rounded border border-border bg-background px-1.5 py-0.5 text-xs text-foreground focus:outline-none"
              >
                <option value="default">Default key ({selectedTopic.defaultKey ?? "—"})</option>
                <option value="multi">Multiple keys</option>
              </select>
              {keyMode === "multi" && (
                <select
                  value={practiceMode}
                  onChange={(e) => setPracticeMode(e.target.value as PracticeMode)}
                  className="rounded border border-border bg-background px-1.5 py-0.5 text-xs text-foreground focus:outline-none"
                >
                  {(Object.keys(PRACTICE_MODE_LABELS) as PracticeMode[]).map((m) => (
                    <option key={m} value={m}>{PRACTICE_MODE_LABELS[m]}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Notes</label>
        <textarea
          value={descValue}
          onChange={(e) => setDescValue(e.target.value)}
          rows={3}
          placeholder="Section notes (Markdown supported)"
          className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={handleClose}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Adding…" : "Add section"}
        </button>
      </div>
    </form>
  )
}
