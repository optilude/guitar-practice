"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import { updateGoal, archiveGoal, removeTopicFromGoal } from "@/app/(app)/goals/actions"
import { formatTopicName } from "@/lib/goals"
import { TopicKind } from "@/lib/generated/prisma/enums"

type GoalTopicWithLesson = {
  id: string
  kind: TopicKind
  subtype: string | null
  defaultKey: string | null
  lesson?: { title: string } | null
}

type RoutineWithCount = {
  id: string
  title: string
  durationMinutes: number
  _count: { sections: number }
}

type GoalData = {
  id: string
  title: string
  description: string
  isActive: boolean
  topics: GoalTopicWithLesson[]
  routines: RoutineWithCount[]
}

interface GoalDetailClientProps {
  goal: GoalData
}

export function GoalDetailClient({ goal }: GoalDetailClientProps) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [titleValue, setTitleValue] = useState(goal.title)
  const [descValue, setDescValue] = useState(goal.description)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function saveTitle() {
    setEditingTitle(false)
    if (titleValue.trim() === goal.title) return
    const result = await updateGoal(goal.id, { title: titleValue })
    if ("error" in result) setError(result.error)
    else router.refresh()
  }

  async function saveDesc() {
    setEditingDesc(false)
    if (descValue.trim() === goal.description) return
    const result = await updateGoal(goal.id, { description: descValue })
    if ("error" in result) setError(result.error)
    else router.refresh()
  }

  async function handleArchive() {
    if (goal.isActive) {
      if (!window.confirm("This is your active goal. Archive it?")) return
    }
    const result = await archiveGoal(goal.id)
    if ("error" in result) setError(result.error)
    else router.push("/goals")
  }

  async function handleRemoveTopic(goalTopicId: string) {
    const result = await removeTopicFromGoal(goalTopicId)
    if ("error" in result) setError(result.error)
    else router.refresh()
  }

  return (
    <div className="pt-6">
      <Link
        href="/goals"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
      >
        ← Goals
      </Link>

      {/* Title */}
      <div className="flex items-start justify-between gap-2 mb-4">
        {editingTitle ? (
          <input
            autoFocus
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === "Enter") saveTitle() }}
            className="text-2xl font-semibold text-foreground bg-transparent border-b border-accent focus:outline-none w-full"
          />
        ) : (
          <h1
            className="text-2xl font-semibold text-foreground cursor-pointer hover:text-accent transition-colors"
            onClick={() => setEditingTitle(true)}
            title="Click to edit"
          >
            {titleValue}
          </h1>
        )}
        {goal.isActive && (
          <span className="text-xs text-accent border border-accent px-1.5 py-0.5 rounded flex-shrink-0 mt-1.5">
            Active
          </span>
        )}
      </div>

      {/* Description */}
      <div className="mb-6">
        {editingDesc ? (
          <textarea
            autoFocus
            value={descValue}
            onChange={(e) => setDescValue(e.target.value)}
            onBlur={saveDesc}
            rows={4}
            placeholder="Description (Markdown supported)"
            className="w-full rounded border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
          />
        ) : descValue ? (
          <div
            className="prose prose-sm max-w-none text-foreground cursor-pointer"
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
            Add description…
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500 mb-4">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Topics */}
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Topics</p>
          {goal.topics.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No topics yet. Use the + button in Library or Reference to add topics to this goal.
            </p>
          ) : (
            <ul className="space-y-2">
              {goal.topics.map((topic) => (
                <li key={topic.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground w-16 flex-shrink-0">
                      {topic.kind}
                    </span>
                    <span className="text-sm text-foreground truncate">
                      {formatTopicName(topic)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveTopic(topic.id)}
                    className="text-xs text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Routines */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Routines</p>
            <Link
              href={`/goals/${goal.id}/routines/new`}
              className="text-xs font-semibold bg-accent text-accent-foreground px-2.5 py-1 rounded hover:opacity-90 transition-opacity"
            >
              Add routine
            </Link>
          </div>
          {goal.routines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No routines yet.</p>
          ) : (
            <ul className="space-y-2">
              {goal.routines.map((routine) => (
                <li key={routine.id}>
                  <Link
                    href={`/goals/${goal.id}/routines/${routine.id}`}
                    className="flex items-center justify-between py-2 hover:bg-card rounded px-2 -mx-2 transition-colors"
                  >
                    <span className="text-sm text-foreground">{routine.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {routine.durationMinutes} min · {routine._count.sections}{" "}
                      {routine._count.sections === 1 ? "section" : "sections"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Archive */}
      <div className="mt-10 pt-6 border-t border-border">
        <button
          onClick={handleArchive}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Archive this goal
        </button>
      </div>
    </div>
  )
}
