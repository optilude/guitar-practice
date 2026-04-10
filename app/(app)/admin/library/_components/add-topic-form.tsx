"use client"

import { useState } from "react"
import { createTopic } from "@/app/(app)/admin/library/actions"
import { btn } from "@/lib/button-styles"

interface AddTopicFormProps {
  categoryId: string
  categoryName: string
  onCreated: () => void
}

export function AddTopicForm({ categoryId, categoryName, onCreated }: AddTopicFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [sourceName, setSourceName] = useState("")
  const [description, setDescription] = useState("")
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!title.trim()) { setError("Title is required"); return }
    if (!url.trim()) { setError("URL is required"); return }
    if (!sourceName.trim()) { setError("Source is required"); return }
    setIsPending(true)
    const result = await createTopic(categoryId, {
      title: title.trim(),
      url: url.trim(),
      sourceName: sourceName.trim(),
      description,
    })
    setIsPending(false)
    if ("error" in result) { setError(result.error); return }
    setTitle(""); setUrl(""); setSourceName(""); setDescription(""); setError(null)
    setIsOpen(false)
    onCreated()
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-2 w-full text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg py-2 hover:border-foreground/40 transition-colors cursor-pointer"
      >
        + Add topic to {categoryName}
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
          <label className="block text-xs text-muted-foreground mb-1">URL</label>
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
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
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
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className={btn("primary", "sm")}
        >
          {isPending ? "Adding…" : "Add topic"}
        </button>
        <button
          onClick={() => { setIsOpen(false); setError(null) }}
          className={btn("standalone", "sm")}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
