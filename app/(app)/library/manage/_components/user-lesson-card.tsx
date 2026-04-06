"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { updateUserLesson, deleteUserLesson } from "@/app/(app)/library/actions"
import type { UserLessonItem } from "./user-lesson-list"

interface UserLessonCardProps {
  lesson: UserLessonItem
  sourceOptions: string[]
  onChanged: () => void
}

export function UserLessonCard({ lesson, sourceOptions, onChanged }: UserLessonCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [title, setTitle] = useState(lesson.title)
  const [url, setUrl] = useState(lesson.url ?? "")
  const [source, setSource] = useState(lesson.source)
  const [description, setDescription] = useState(lesson.description)
  const [error, setError] = useState<string | null>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lesson.id, disabled: isEditing })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  async function handleSave() {
    if (!title.trim()) { setError("Title is required"); return }
    setIsSaving(true)
    const result = await updateUserLesson(lesson.id, {
      title: title.trim(),
      url: url.trim() || null,
      source: source.trim(),
      description,
    })
    setIsSaving(false)
    if ("error" in result) { setError(result.error); return }
    setIsEditing(false)
    setError(null)
    onChanged()
  }

  async function handleDelete() {
    setIsDeleting(true)
    const result = await deleteUserLesson(lesson.id)
    if ("error" in result) {
      setError(result.error)
      setIsDeleting(false)
      setShowDeleteModal(false)
    } else {
      onChanged()
    }
  }

  const hasDetails = !!(lesson.url || lesson.description)

  return (
    <>
      <div ref={setNodeRef} style={style} className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center gap-2 p-3">
          <button
            type="button"
            className={`text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none flex-shrink-0 ${isEditing ? "opacity-30 pointer-events-none" : ""}`}
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
            <span className="text-sm text-foreground font-medium truncate">{lesson.title}</span>
            {lesson.source && (
              <span className="text-xs text-muted-foreground border border-border px-1.5 py-0.5 rounded flex-shrink-0">
                {lesson.source}
              </span>
            )}
            <span className="flex-1" />
          </div>

          {/* Edit / Done button */}
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="text-xs text-accent border border-accent px-2 py-1 rounded flex-shrink-0 disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => {
                  setTitle(lesson.title)
                  setUrl(lesson.url ?? "")
                  setSource(lesson.source)
                  setDescription(lesson.description)
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
              onClick={() => { setIsExpanded(true); setIsEditing(true) }}
              className="text-xs text-muted-foreground border border-border px-2 py-1 rounded flex-shrink-0 hover:text-foreground transition-colors"
            >
              Edit
            </button>
          )}

          {/* Delete button */}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="text-xs text-muted-foreground border border-border px-2 py-1 rounded flex-shrink-0 hover:text-foreground transition-colors"
          >
            Delete
          </button>
        </div>

        {/* Expanded panel */}
        {isExpanded && (
          <div className="px-3 pb-3 border-t border-border pt-3 space-y-3">
            {isEditing ? (
              <>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">URL (optional)</label>
                    <input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Source</label>
                    <input
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      list={`sources-${lesson.id}`}
                      className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <datalist id={`sources-${lesson.id}`}>
                      {sourceOptions.map((s) => <option key={s} value={s} />)}
                    </datalist>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Description (Markdown)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-y"
                  />
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
              </>
            ) : (
              <>
                {/* View mode: relevant details */}
                {lesson.url && (
                  <p className="text-sm">
                    <a
                      href={lesson.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      {lesson.url}
                    </a>
                  </p>
                )}
                {lesson.description && (
                  <div className="prose prose-sm max-w-none text-foreground text-sm">
                    <ReactMarkdown>{lesson.description}</ReactMarkdown>
                  </div>
                )}
                {!hasDetails && (
                  <p className="text-xs text-muted-foreground italic">No details added.</p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}
        >
          <div className="w-full max-w-sm bg-card border border-border rounded-lg shadow-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Remove lesson?</h2>
            <p className="text-sm text-muted-foreground">
              This will permanently remove &ldquo;{lesson.title}&rdquo; from your library.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-md bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Removing…" : "Remove lesson"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
