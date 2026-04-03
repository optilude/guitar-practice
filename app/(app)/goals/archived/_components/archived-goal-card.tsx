"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { unarchiveGoal, deleteGoal } from "@/app/(app)/goals/actions"

interface ArchivedGoalCardProps {
  goal: { id: string; title: string; description: string }
}

export function ArchivedGoalCard({ goal }: ArchivedGoalCardProps) {
  const [isPending, setIsPending] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleUnarchive() {
    setIsPending(true)
    const result = await unarchiveGoal(goal.id)
    setIsPending(false)
    if ("error" in result) setError(result.error)
    else router.refresh()
  }

  async function handleDelete() {
    setIsPending(true)
    const result = await deleteGoal(goal.id)
    setIsPending(false)
    if ("error" in result) {
      setError(result.error)
      setShowDeleteModal(false)
    } else {
      router.refresh()
    }
  }

  return (
    <>
      <li className="rounded-lg border border-border dark:border-neutral-600 bg-card dark:bg-neutral-800 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{goal.title}</p>
            {goal.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {goal.description.split("\n")[0]}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleUnarchive}
              disabled={isPending}
              className="text-xs font-medium bg-accent/10 text-accent border border-accent/40 px-2.5 py-1 rounded hover:bg-accent/20 transition-colors disabled:opacity-50"
            >
              Unarchive
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={isPending}
              className="text-xs font-medium border border-border px-2.5 py-1 rounded text-muted-foreground hover:text-red-500 hover:border-red-400 transition-colors disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </li>

      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}
        >
          <div className="w-full max-w-sm bg-card border border-border rounded-lg shadow-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Delete goal?</h2>
            <p className="text-sm text-muted-foreground">
              This will permanently delete &ldquo;{goal.title}&rdquo; and all its topics and
              routines. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="text-xs font-semibold bg-destructive text-white px-4 py-2 rounded-md hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {isPending ? "Deleting…" : "Confirm"}
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
