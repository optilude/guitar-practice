"use client"

import { useState } from "react"
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

  return (
    <>
      <div ref={setNodeRef} style={style} className="rounded-lg border border-border bg-card overflow-hidden">
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
          <div className="flex flex-1 items-center gap-2 min-w-0">
            {lesson.url ? (
              <a
                href={lesson.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent font-medium truncate"
              >
                {lesson.title}
              </a>
            ) : (
              <span className="text-sm text-foreground font-medium truncate">{lesson.title}</span>
            )}
            {lesson.source && (
              <span className="text-xs text-muted-foreground border border-border px-1.5 py-0.5 rounded flex-shrink-0">
                {lesson.source}
              </span>
            )}
          </div>
          {isEditing ? (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="text-xs text-accent border border-accent px-2 py-1 rounded flex-shrink-0 disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Done"}
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-muted-foreground border border-border px-2 py-1 rounded flex-shrink-0 hover:text-foreground transition-colors"
            >
              Edit
            </button>
          )}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="text-xs text-muted-foreground border border-border px-2 py-1 rounded flex-shrink-0 hover:text-foreground transition-colors"
          >
            Delete
          </button>
        </div>

        {isEditing && (
          <div className="px-3 pb-3 border-t border-border pt-3 space-y-3">
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
