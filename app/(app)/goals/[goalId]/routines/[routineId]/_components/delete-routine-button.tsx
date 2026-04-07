"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { deleteRoutine } from "@/app/(app)/goals/actions"
import { btn } from "@/lib/button-styles"

interface DeleteRoutineButtonProps {
  routineId: string
  goalId: string
  routineTitle: string
}

export function DeleteRoutineButton({ routineId, goalId, routineTitle }: DeleteRoutineButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleDelete() {
    setIsDeleting(true)
    const result = await deleteRoutine(routineId)
    if ("error" in result) {
      setError(result.error)
      setIsDeleting(false)
      setShowModal(false)
    } else {
      router.push(`/goals/${goalId}`)
    }
  }

  return (
    <>
      <div className="mt-10 pt-6 border-t border-border">
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <button
          onClick={() => setShowModal(true)}
          className={btn("destructive", "sm")}
        >
          Delete routine
        </button>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div className="w-full max-w-sm bg-card border border-border rounded-lg shadow-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Delete routine?</h2>
            <p className="text-sm text-muted-foreground">
              This will permanently delete &ldquo;{routineTitle}&rdquo; and all its sections. This
              cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={btn("destructive")}
              >
                {isDeleting ? "Deleting…" : "Delete routine"}
              </button>
              <button
                onClick={() => setShowModal(false)}
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
