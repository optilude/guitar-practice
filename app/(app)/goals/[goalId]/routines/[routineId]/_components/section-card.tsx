"use client"

import { useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  updateSection,
  deleteSection,
  addTopicToSection,
  removeTopicFromSection,
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

const SECTION_TYPE_COLORS: Record<SectionType, string> = {
  warmup: "text-amber-600 border-amber-600",
  technique: "text-blue-600 border-blue-600",
  muscle_memory: "text-purple-600 border-purple-600",
  theory: "text-teal-600 border-teal-600",
  lessons: "text-green-600 border-green-600",
  songs: "text-orange-600 border-orange-600",
  free_practice: "text-muted-foreground border-border",
}

const TOPIC_KIND_ORDER = ["lesson", "scale", "chord", "triad", "arpeggio", "progression", "harmony"]

const TOPIC_KIND_LABELS: Record<string, string> = {
  lesson: "Lessons",
  scale: "Scales",
  chord: "Chords",
  triad: "Triads",
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
  userLesson?: { title: string; url: string | null } | null
}

type SectionTopicWithGoalTopic = {
  id: string
  keys: string[]
  practiceMode: PracticeMode | null
  goalTopicId: string
  goalTopic: GoalTopicForDisplay
}

type SectionWithTopics = {
  id: string
  type: SectionType
  title: string
  description: string
  durationMinutes: number
  order: number
  routineId: string
  sectionTopics: SectionTopicWithGoalTopic[]
}

interface SectionCardProps {
  section: SectionWithTopics
  availableTopics: GoalTopicForDisplay[]
  routineGoalId: string
  onChanged: () => void
}

export function SectionCard({ section, availableTopics, onChanged }: SectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [titleValue, setTitleValue] = useState(section.title)
  const [typeValue, setTypeValue] = useState(section.type)
  const [descValue, setDescValue] = useState(section.description)
  const [durationValue, setDurationValue] = useState(section.durationMinutes)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEditing) {
      setTitleValue(section.title)
      setTypeValue(section.type)
      setDescValue(section.description)
      setDurationValue(section.durationMinutes)
    }
  }, [section.title, section.type, section.description, section.durationMinutes, isEditing])

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const currentSectionTopic = section.sectionTopics[0] ?? null

  async function handleDone() {
    setIsSaving(true)
    setError(null)

    const trimmed = titleValue.trim() || section.title
    const dur = Math.max(1, Math.round(durationValue))

    let changed = false

    if (trimmed !== section.title) {
      const r = await updateSection(section.id, { title: trimmed })
      if ("error" in r) { setError(r.error); setIsSaving(false); return }
      changed = true
    }
    if (dur !== section.durationMinutes) {
      const r = await updateSection(section.id, { durationMinutes: dur })
      if ("error" in r) { setError(r.error); setIsSaving(false); return }
      changed = true
    }
    if (typeValue !== section.type) {
      const r = await updateSection(section.id, { type: typeValue })
      if ("error" in r) { setError(r.error); setIsSaving(false); return }
      changed = true
    }
    if (descValue !== section.description) {
      const r = await updateSection(section.id, { description: descValue })
      if ("error" in r) { setError(r.error); setIsSaving(false); return }
      changed = true
    }

    setIsSaving(false)
    setIsEditing(false)
    if (changed) onChanged()
  }

  async function handleDelete() {
    setIsDeleting(true)
    const result = await deleteSection(section.id)
    if ("error" in result) {
      setError(result.error)
      setIsDeleting(false)
      setShowDeleteModal(false)
    } else {
      onChanged()
    }
  }

  async function handleTopicChange(newGoalTopicId: string) {
    if (newGoalTopicId === (currentSectionTopic?.goalTopicId ?? "")) return
    if (currentSectionTopic) {
      const r = await removeTopicFromSection(currentSectionTopic.id)
      if ("error" in r) { setError(r.error); return }
    }
    if (newGoalTopicId) {
      const r = await addTopicToSection(section.id, newGoalTopicId)
      if ("error" in r) { setError(r.error); return }
    }
    onChanged()
  }

  async function handleKeyChange(sectionTopicId: string, keys: string[]) {
    const data: { keys: string[]; practiceMode?: PracticeMode } = { keys }
    if (keys.length > 0 && !currentSectionTopic?.practiceMode) {
      data.practiceMode = "chromatic_asc"
    }
    const result = await updateSectionTopic(sectionTopicId, data)
    if ("error" in result) setError(result.error)
    else onChanged()
  }

  async function handlePracticeModeChange(sectionTopicId: string, mode: PracticeMode) {
    const result = await updateSectionTopic(sectionTopicId, { practiceMode: mode })
    if ("error" in result) setError(result.error)
    else onChanged()
  }

  const colorClass = SECTION_TYPE_COLORS[section.type]
  const isMultiKey = currentSectionTopic
    ? currentSectionTopic.keys.length > 0 &&
      (currentSectionTopic.keys.includes("*") || currentSectionTopic.keys.length > 1)
    : false

  const topicDisplayName = currentSectionTopic
    ? formatTopicName(currentSectionTopic.goalTopic as Parameters<typeof formatTopicName>[0])
    : null

  return (
    <>
      <div ref={setNodeRef} style={style} className="rounded-lg border border-border bg-card">
        {/* Header bar */}
        <div className="flex items-center gap-2 p-3">
          {/* Drag handle */}
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            ⠿
          </button>

          {/* Clickable area — toggles expand/collapse */}
          <div
            className="flex flex-1 items-center gap-2 min-w-0 cursor-pointer"
            onClick={() => setIsExpanded((v) => !v)}
          >
            <span className="text-sm text-foreground shrink min-w-0 truncate">
              {section.title}
            </span>
            <span className={`text-xs border rounded px-1.5 py-0.5 flex-shrink-0 ${colorClass}`}>
              {SECTION_TYPE_LABELS[section.type]}
            </span>
            <span className="flex-1" />
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {section.durationMinutes} min
            </span>
          </div>

          {/* Edit / Save / Cancel buttons */}
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleDone}
                disabled={isSaving}
                className="text-xs text-accent border border-accent px-2 py-1 rounded flex-shrink-0 disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTitleValue(section.title)
                  setTypeValue(section.type)
                  setDurationValue(section.durationMinutes)
                  setDescValue(section.description)
                  setIsEditing(false)
                  setError(null)
                }}
                disabled={isSaving}
                className="text-xs text-muted-foreground border border-border px-2 py-1 rounded flex-shrink-0 hover:text-foreground transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => { setIsExpanded(true); setIsEditing(true) }}
              className="text-xs text-muted-foreground border border-border px-2 py-1 rounded flex-shrink-0 hover:text-foreground transition-colors"
            >
              Edit
            </button>
          )}

          {/* Delete button */}
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="text-xs text-muted-foreground border border-border px-2 py-1 rounded flex-shrink-0 hover:text-foreground transition-colors"
          >
            Delete
          </button>
        </div>

        {/* Expanded panel */}
        {isExpanded && (
          <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
            {isEditing ? (
              <>
                {/* Title */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Title</label>
                  <input
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                {/* Type + Duration on same row */}
                <div className="flex gap-3 items-start">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Type</label>
                    <select
                      value={typeValue}
                      onChange={(e) => setTypeValue(e.target.value as SectionType)}
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

                {/* Topic selector */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Topic</label>
                  <select
                    value={currentSectionTopic?.goalTopicId ?? ""}
                    onChange={(e) => handleTopicChange(e.target.value)}
                    className="h-9 rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent w-full"
                  >
                    <option value="">No topic</option>
                    {TOPIC_KIND_ORDER
                      .map((kind) => ({
                        kind,
                        topics: availableTopics.filter((t) => t.kind === kind),
                      }))
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

                  {/* Key / practice mode for selected topic */}
                  {currentSectionTopic && currentSectionTopic.goalTopic.kind !== "lesson" && (
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      <select
                        value={
                          currentSectionTopic.keys.length === 0
                            ? "default"
                            : currentSectionTopic.keys.includes("*")
                            ? "multi"
                            : "custom"
                        }
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === "default") handleKeyChange(currentSectionTopic.id, [])
                          else if (val === "multi") handleKeyChange(currentSectionTopic.id, ["*"])
                        }}
                        className="rounded border border-border bg-background px-1.5 py-0.5 text-xs text-foreground focus:outline-none"
                      >
                        <option value="default">
                          Default key ({currentSectionTopic.goalTopic.defaultKey ?? "—"})
                        </option>
                        <option value="multi">Multiple keys</option>
                      </select>
                      {isMultiKey && (
                        <select
                          value={currentSectionTopic.practiceMode ?? "chromatic_asc"}
                          onChange={(e) =>
                            handlePracticeModeChange(
                              currentSectionTopic.id,
                              e.target.value as PracticeMode,
                            )
                          }
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

                {/* Notes */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Notes</label>
                  <textarea
                    value={descValue}
                    onChange={(e) => setDescValue(e.target.value)}
                    rows={4}
                    placeholder="Section notes (Markdown supported)"
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                  />
                </div>

                {error && <p className="text-xs text-red-500">{error}</p>}
              </>
            ) : (
              <>
                {/* View mode: topic and notes */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Topic</p>
                  {topicDisplayName ? (
                    <p className="text-sm text-foreground">{topicDisplayName}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No topic</p>
                  )}
                </div>

                {descValue && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <div className="prose prose-sm max-w-none text-foreground text-sm">
                      <ReactMarkdown>{descValue}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Delete modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}
        >
          <div className="w-full max-w-sm bg-card border border-border rounded-lg shadow-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Remove section?</h2>
            <p className="text-sm text-muted-foreground">
              This will permanently remove &ldquo;{titleValue}&rdquo; from this routine. This cannot
              be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-xs font-semibold bg-destructive text-white px-4 py-2 rounded-md hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Removing…" : "Confirm"}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
