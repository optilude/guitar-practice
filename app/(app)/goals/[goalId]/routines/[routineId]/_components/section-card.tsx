"use client"

import { useState } from "react"
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

export function SectionCard({ section, availableTopics, routineGoalId, onChanged }: SectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [descValue, setDescValue] = useState(section.description)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  async function saveDesc() {
    setEditingDesc(false)
    if (descValue.trim() === section.description) return
    const result = await updateSection(section.id, { description: descValue })
    if ("error" in result) setError(result.error)
    else onChanged()
  }

  async function handleDelete() {
    const result = await deleteSection(section.id)
    if ("error" in result) setError(result.error)
    else onChanged()
  }

  async function handleAddTopic(goalTopicId: string) {
    const result = await addTopicToSection(section.id, goalTopicId)
    if ("error" in result) setError(result.error)
    else onChanged()
  }

  async function handleRemoveSectionTopic(sectionTopicId: string) {
    const result = await removeTopicFromSection(sectionTopicId)
    if ("error" in result) setError(result.error)
    else onChanged()
  }

  async function handleKeyChange(sectionTopicId: string, keys: string[]) {
    const result = await updateSectionTopic(sectionTopicId, { keys })
    if ("error" in result) setError(result.error)
    else onChanged()
  }

  async function handlePracticeModeChange(sectionTopicId: string, mode: PracticeMode | null) {
    const result = await updateSectionTopic(sectionTopicId, { practiceMode: mode })
    if ("error" in result) setError(result.error)
    else onChanged()
  }

  const colorClass = SECTION_TYPE_COLORS[section.type]
  const assignedTopicIds = new Set(section.sectionTopics.map((st) => st.goalTopicId))
  const unassignedTopics = availableTopics.filter((t) => !assignedTopicIds.has(t.id))

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-border bg-card">
      {/* Collapsed header */}
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

        <span className={`text-xs border rounded px-1.5 py-0.5 flex-shrink-0 ${colorClass}`}>
          {SECTION_TYPE_LABELS[section.type]}
        </span>

        <span className="text-sm text-foreground flex-1 min-w-0 truncate">{section.title}</span>
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {section.durationMinutes} min
        </span>
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {section.sectionTopics.length} {section.sectionTopics.length === 1 ? "topic" : "topics"}
        </span>

        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          aria-label={isExpanded ? "Collapse section" : "Expand section"}
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 text-xs"
        >
          {isExpanded ? "▲" : "▼"}
        </button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
          {/* Description */}
          {editingDesc ? (
            <textarea
              autoFocus
              value={descValue}
              onChange={(e) => setDescValue(e.target.value)}
              onBlur={saveDesc}
              rows={3}
              placeholder="Section notes (Markdown supported)"
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
            />
          ) : descValue ? (
            <div
              className="prose prose-sm max-w-none text-foreground text-sm cursor-pointer"
              onClick={() => setEditingDesc(true)}
              title="Click to edit"
            >
              <ReactMarkdown>{descValue}</ReactMarkdown>
            </div>
          ) : (
            <button
              onClick={() => setEditingDesc(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Add notes…
            </button>
          )}

          {/* Assigned topics */}
          {section.sectionTopics.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Topics</p>
              {section.sectionTopics.map((st) => {
                const isMultiKey = st.keys.length === 0
                  ? false
                  : st.keys.includes("*") || st.keys.length > 1
                return (
                  <div key={st.id} className="flex flex-col gap-1.5 rounded border border-border p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-foreground">
                        {formatTopicName(st.goalTopic as Parameters<typeof formatTopicName>[0])}
                      </span>
                      <button
                        onClick={() => handleRemoveSectionTopic(st.id)}
                        className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                    {st.goalTopic.kind !== "lesson" && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={
                            st.keys.length === 0
                              ? "default"
                              : st.keys.includes("*")
                              ? "all"
                              : "custom"
                          }
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === "default") handleKeyChange(st.id, [])
                            else if (val === "all") handleKeyChange(st.id, ["*"])
                          }}
                          className="rounded border border-border bg-background px-1.5 py-0.5 text-xs text-foreground focus:outline-none"
                        >
                          <option value="default">
                            Default key ({st.goalTopic.defaultKey ?? "—"})
                          </option>
                          <option value="all">All 12 keys</option>
                        </select>
                        {isMultiKey && (
                          <select
                            value={st.practiceMode ?? ""}
                            onChange={(e) =>
                              handlePracticeModeChange(st.id, (e.target.value as PracticeMode) || null)
                            }
                            className="rounded border border-border bg-background px-1.5 py-0.5 text-xs text-foreground focus:outline-none"
                          >
                            <option value="">No practice mode</option>
                            {(Object.keys(PRACTICE_MODE_LABELS) as PracticeMode[]).map((m) => (
                              <option key={m} value={m}>{PRACTICE_MODE_LABELS[m]}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Add topic */}
          {unassignedTopics.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                Add topic
              </p>
              <div className="flex flex-wrap gap-1">
                {unassignedTopics.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleAddTopic(t.id)}
                    className="text-xs border border-border rounded px-2 py-0.5 text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                  >
                    {formatTopicName(t as Parameters<typeof formatTopicName>[0])}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          {/* Delete */}
          <div className="pt-1">
            {confirmDelete ? (
              <span className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Remove this section?</span>
                <button
                  onClick={handleDelete}
                  className="text-xs text-red-500 hover:text-red-400 font-semibold transition-colors"
                >
                  Yes, remove
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
              >
                Remove section
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
