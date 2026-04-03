"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { unarchiveGoal, deleteGoal } from "@/app/(app)/goals/actions"

interface ArchivedGoalCardProps {
  goal: { id: string; title: string; description: string }
}

export function ArchivedGoalCard({ goal }: ArchivedGoalCardProps) {
  const [isPending, setIsPending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
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
    if ("error" in result) setError(result.error)
    else router.refresh()
  }

  return (
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
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={handleUnarchive}
            disabled={isPending}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Unarchive
          </button>
          {confirmDelete ? (
            <span className="flex items-center gap-2">
              <span className="text-xs text-red-500">Delete everything?</span>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="text-xs text-red-500 hover:text-red-400 transition-colors font-semibold disabled:opacity-50"
              >
                Yes, delete
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
              disabled={isPending}
              className="text-xs text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </li>
  )
}
