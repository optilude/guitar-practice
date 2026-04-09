"use client"

import { useState } from "react"
import { createUserLesson } from "@/app/(app)/library/actions"

interface AddLessonFormProps {
  categoryId: string
  categoryName: string
  sourceOptions: string[]
  onCreated: () => void
}

export function AddLessonForm({
  categoryId,
  categoryName,
  sourceOptions,
  onCreated,
}: AddLessonFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [source, setSource] = useState("")
  const [description, setDescription] = useState("")
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!title.trim()) { setError("Title is required"); return }
    setIsPending(true)
    const result = await createUserLesson(categoryId, {
      title: title.trim(),
      url: url.trim() || undefined,
      source: source.trim(),
      description,
    })
    setIsPending(false)
    if ("error" in result) { setError(result.error); return }
    setTitle(""); setUrl(""); setSource(""); setDescription(""); setError(null)
    setIsOpen(false)
    onCreated()
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="mt-2 w-full text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg py-2 hover:border-foreground/40 transition-colors cursor-pointer"
      >
        + Add lesson
      </button>
    )
  }

  return (
    <div className="mt-2 rounded-lg border border-accent bg-card p-3 space-y-3">
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Title</label>
        <input
          autoFocus
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
            list="add-lesson-sources"
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <datalist id="add-lesson-sources">
            {sourceOptions.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Add a description (supports Markdown)"
          className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-y"
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="text-xs font-semibold bg-accent text-accent-foreground px-3 py-1.5 rounded hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "Adding…" : "Add lesson"}
        </button>
        <button
          onClick={() => { setIsOpen(false); setError(null) }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
