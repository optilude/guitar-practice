"use client"

import { useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { deleteUserProgression } from "@/app/(app)/progressions/actions"
import { btn } from "@/lib/button-styles"

interface DeleteConfirmModalProps {
  progressionId: string
  progressionTitle: string
  onClose: () => void
  onDeleted: () => void
}

export function DeleteConfirmModal({
  progressionId,
  progressionTitle,
  onClose,
  onDeleted,
}: DeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setIsDeleting(true)
    setError(null)
    const result = await deleteUserProgression(progressionId)
    if ("error" in result) {
      setError(result.error)
      setIsDeleting(false)
    } else {
      onDeleted()
    }
  }

  return (
    <Dialog.Root open onOpenChange={open => { if (!open) onClose() }} disablePointerDismissal={isDeleting}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-[51] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-xl transition duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0">
          <div className="space-y-4">
            <Dialog.Title className="text-sm font-semibold">Delete progression?</Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              <span className="font-bold text-foreground">{progressionTitle}</span> will be permanently deleted. This cannot be undone.
            </Dialog.Description>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className={btn("destructive", "sm")}
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
              <Dialog.Close disabled={isDeleting} className={btn("standalone", "sm")}>
                Cancel
              </Dialog.Close>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
