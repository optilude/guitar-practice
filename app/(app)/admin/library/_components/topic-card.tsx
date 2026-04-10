"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Dialog } from "@base-ui/react/dialog"
import { updateTopic, deleteTopic } from "@/app/(app)/admin/library/actions"
import { btn } from "@/lib/button-styles"

export type TopicItem = {
  id: string
  title: string
  url: string
  slug: string
  description: string
  order: number
  source: { name: string }
}

interface TopicCardProps {
  topic: TopicItem
  onChanged: () => void
}

export function TopicCard({ topic, onChanged }: TopicCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [title, setTitle] = useState(topic.title)
  const [url, setUrl] = useState(topic.url)
  const [sourceName, setSourceName] = useState(topic.source.name)
  const [description, setDescription] = useState(topic.description)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: topic.id, disabled: isEditing })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  async function handleSave() {
    if (!title.trim()) { setError("Title is required"); return }
    if (!url.trim()) { setError("URL is required"); return }
    if (!sourceName.trim()) { setError("Source is required"); return }
    setIsSaving(true)
    const result = await updateTopic(topic.id, {
      title: title.trim(),
      url: url.trim(),
      sourceName: sourceName.trim(),
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
    setDeleteError(null)
    const result = await deleteTopic(topic.id)
    if ("error" in result) {
      setDeleteError(result.error)
      setIsDeleting(false)
    } else {
      setDeleteOpen(false)
      onChanged()
    }
  }

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
            <span className="text-sm text-foreground font-medium truncate">{topic.title}</span>
            <span className="text-xs text-muted-foreground border border-border px-1.5 py-0.5 rounded flex-shrink-0">
              {topic.source.name}
            </span>
            <span className="flex-1" />
          </div>

          {/* Edit / Save+Cancel buttons */}
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className={btn("primary", "sm")}
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTitle(topic.title)
                  setUrl(topic.url)
                  setSourceName(topic.source.name)
                  setDescription(topic.description)
                  setIsEditing(false)
                  setError(null)
                }}
                disabled={isSaving}
                className={btn("standalone", "sm")}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => { setIsExpanded(true); setIsEditing(true) }}
              className={btn("standalone", "sm")}
            >
              Edit
            </button>
          )}

          {/* Delete button */}
          <button
            type="button"
            onClick={() => { setDeleteOpen(true); setDeleteError(null) }}
            className={btn("destructive", "sm")}
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
              </>
            ) : (
              <>
                <p className="text-sm">
                  <a
                    href={topic.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    {topic.url}
                  </a>
                </p>
                {topic.description && (
                  <div className="prose prose-sm max-w-none text-foreground text-sm">
                    <ReactMarkdown>{topic.description}</ReactMarkdown>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Delete dialog */}
      <Dialog.Root
        open={deleteOpen}
        onOpenChange={(open) => { if (!open) { setDeleteOpen(false); setDeleteError(null) } }}
        disablePointerDismissal={isDeleting}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-[51] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-xl transition duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0">
            <div className="space-y-4">
              <Dialog.Title className="text-sm font-semibold">Remove topic?</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">{topic.title}</span> will be permanently removed from the standard library. This cannot be undone.
              </Dialog.Description>
              {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className={btn("destructive", "sm")}
                >
                  {isDeleting ? "Removing…" : "Remove topic"}
                </button>
                <Dialog.Close
                  disabled={isDeleting}
                  className={btn("standalone", "sm")}
                >
                  Cancel
                </Dialog.Close>
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
