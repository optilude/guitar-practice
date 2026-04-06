"use client"

import { useState } from "react"
import { deleteSession } from "@/app/(app)/sessions/actions"

interface DeleteSessionButtonProps {
  sessionId: string
}

export function DeleteSessionButton({ sessionId }: DeleteSessionButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (confirming) {
    return (
      <div className="flex items-center gap-3 mt-4">
        <p className="text-sm text-muted-foreground">Are you sure? This cannot be undone.</p>
        <button
          onClick={async () => {
            setIsDeleting(true)
            await deleteSession(sessionId)
          }}
          disabled={isDeleting}
          className="text-sm text-destructive hover:underline disabled:opacity-50"
        >
          {isDeleting ? "Deleting…" : "Confirm delete"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="mt-4 text-sm text-muted-foreground hover:text-destructive transition-colors"
    >
      Delete session
    </button>
  )
}
