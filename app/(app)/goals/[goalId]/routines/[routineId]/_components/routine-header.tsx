"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import { updateRoutine } from "@/app/(app)/goals/actions"

interface RoutineHeaderProps {
  routineId: string
  title: string
  description: string
  totalMinutes: number
}

export function RoutineHeader({
  routineId,
  title,
  description,
  totalMinutes,
}: RoutineHeaderProps) {
  const [titleValue, setTitleValue] = useState(title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [descValue, setDescValue] = useState(description)
  const [editingDesc, setEditingDesc] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function saveTitle() {
    setEditingTitle(false)
    const trimmed = titleValue.trim()
    if (!trimmed) { setTitleValue(title); return }
    if (trimmed === title) return
    const result = await updateRoutine(routineId, { title: trimmed })
    if ("error" in result) { setError(result.error); setTitleValue(title) }
    else router.refresh()
  }

  async function saveDesc() {
    setEditingDesc(false)
    if (descValue.trim() === description) return
    const result = await updateRoutine(routineId, { description: descValue })
    if ("error" in result) setError(result.error)
    else router.refresh()
  }

  return (
    <>
      {/* Title */}
      {editingTitle ? (
        <input
          autoFocus
          value={titleValue}
          onChange={(e) => setTitleValue(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => { if (e.key === "Enter") saveTitle() }}
          className="text-2xl font-semibold bg-transparent border-b border-border focus:outline-none w-full mb-1 text-foreground"
        />
      ) : (
        <h1
          className="text-2xl font-semibold text-foreground mb-1 cursor-text"
          onClick={() => setEditingTitle(true)}
          title="Click to edit"
        >
          {titleValue}
        </h1>
      )}

      <p className="text-xs text-muted-foreground mb-4">{totalMinutes} minutes total</p>

      {/* Description */}
      {editingDesc ? (
        <textarea
          autoFocus
          value={descValue}
          onChange={(e) => setDescValue(e.target.value)}
          onBlur={saveDesc}
          rows={4}
          placeholder="Routine description (supports Markdown)"
          className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none mb-6"
        />
      ) : descValue ? (
        <div
          className="prose prose-sm max-w-none text-foreground mb-6 cursor-pointer"
          onClick={() => setEditingDesc(true)}
          title="Click to edit"
        >
          <ReactMarkdown>{descValue}</ReactMarkdown>
        </div>
      ) : (
        <button
          onClick={() => setEditingDesc(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-6 block"
        >
          Add description…
        </button>
      )}

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
    </>
  )
}
