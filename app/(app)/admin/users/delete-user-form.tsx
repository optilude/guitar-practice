"use client"

import { useState, useTransition } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { btn } from "@/lib/button-styles"
import { deleteUser } from "./actions"

export function DeleteUserForm({ userId, email }: { userId: string; email: string }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const result = await deleteUser(userId, new FormData())
      if ("error" in result) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setError(null) }}
        className={btn("destructive", "sm")}
      >
        Delete
      </button>

      <Dialog.Root
        open={open}
        onOpenChange={open => { if (!open) { setOpen(false); setError(null) } }}
        disablePointerDismissal={isPending}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-[51] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-xl transition duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0">
            <div className="space-y-4">
              <Dialog.Title className="text-sm font-semibold">Delete user?</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{email}</span> will be permanently deleted along with all their data. This cannot be undone.
              </Dialog.Description>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className={btn("destructive", "sm")}
                >
                  {isPending ? "Deleting…" : "Delete"}
                </button>
                <Dialog.Close
                  disabled={isPending}
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
