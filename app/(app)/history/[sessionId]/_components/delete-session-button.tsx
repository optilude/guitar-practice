"use client"

import { useState } from "react"
import { deleteSession } from "@/app/(app)/sessions/actions"
import { btn } from "@/lib/button-styles"

interface DeleteSessionButtonProps {
  sessionId: string
}

export function DeleteSessionButton({ sessionId }: DeleteSessionButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await deleteSession(sessionId)
    } catch {
      setIsDeleting(false)
      setShowModal(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={btn("destructive", "sm")}
      >
        Delete session…
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div className="w-full max-w-sm bg-card border border-border rounded-lg shadow-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Delete session?</h2>
            <p className="text-sm text-muted-foreground">
              This will permanently delete this practice session and cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={btn("destructive")}
              >
                {isDeleting ? "Deleting…" : "Delete session"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                disabled={isDeleting}
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
