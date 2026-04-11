"use client"

import { useState } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { deleteUserProgression } from "@/app/(app)/progressions/actions"
import type { UserProgressionItem } from "./user-progression-list"
import { btn } from "@/lib/button-styles"

interface UserProgressionCardProps {
  progression: UserProgressionItem
  onChanged: () => void
}

export function UserProgressionCard({ progression, onChanged }: UserProgressionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: progression.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const romanDisplay = progression.degrees.join(" – ")

  async function handleDelete() {
    setIsDeleting(true)
    const result = await deleteUserProgression(progression.id)
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
            className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            ⠿
          </button>

          <div
            className="flex flex-1 items-center gap-2 min-w-0 cursor-pointer"
            onClick={() => setIsExpanded((v) => !v)}
          >
            <span className="text-sm text-foreground font-medium truncate">{progression.displayName}</span>
            <span className="text-xs text-muted-foreground font-mono truncate">{romanDisplay}</span>
          </div>

          <Link
            href={`/reference/progressions/${progression.id}/edit`}
            className={btn("standalone", "sm")}
          >
            Edit
          </Link>
          <button
            onClick={() => setShowDeleteModal(true)}
            className={btn("destructive", "sm")}
          >
            Delete
          </button>
        </div>

        {isExpanded && progression.description && (
          <div className="px-3 pb-3 border-t border-border pt-3">
            <div className="prose prose-sm max-w-none text-foreground text-sm">
              <ReactMarkdown>{progression.description}</ReactMarkdown>
            </div>
          </div>
        )}

        {error && <p className="px-3 pb-2 text-xs text-red-500">{error}</p>}
      </div>

      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}
        >
          <div className="w-full max-w-sm bg-card border border-border rounded-lg shadow-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Delete progression?</h2>
            <p className="text-sm text-muted-foreground">
              This will permanently delete &ldquo;{progression.displayName}&rdquo;. Any goals that include it will show &ldquo;(progression removed)&rdquo;.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={btn("destructive")}
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className={btn("secondary")}
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
