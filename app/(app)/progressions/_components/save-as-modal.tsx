"use client"

import { useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { createUserProgression } from "@/app/(app)/progressions/actions"
import { analyzeProgression } from "@/lib/theory/transposer"
import { btn } from "@/lib/button-styles"
import type { InputChord } from "@/lib/theory/key-finder"

interface SaveAsModalProps {
  defaultTitle: string
  defaultDescription: string
  parsedChords: InputChord[]
  tonic: string
  modeName: string
  onClose: () => void
  onSaved: (newId: string) => void
}

export function SaveAsModal({
  defaultTitle,
  defaultDescription,
  parsedChords,
  tonic,
  modeName,
  onClose,
  onSaved,
}: SaveAsModalProps) {
  const [title, setTitle] = useState(defaultTitle)
  const [description, setDescription] = useState(defaultDescription)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!title.trim()) { setError("Title is required"); return }
    setIsSaving(true)
    setError(null)
    const analyses = parsedChords.length > 0
      ? analyzeProgression(parsedChords, tonic, modeName)
      : []
    const degrees = analyses.map((a, i) => `${a.roman}:${parsedChords[i]!.type}`)
    const result = await createUserProgression({
      displayName: title.trim(),
      description,
      mode: modeName,
      degrees,
    })
    setIsSaving(false)
    if ("error" in result) { setError(result.error); return }
    onSaved(result.id)
  }

  return (
    <Dialog.Root open onOpenChange={open => { if (!open) onClose() }} disablePointerDismissal={isSaving}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-[51] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-xl transition duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0">
          <div className="space-y-4">
            <Dialog.Title className="text-sm font-semibold">Save as new progression</Dialog.Title>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Title</label>
              <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Description <span className="text-muted-foreground/60">(Markdown, optional)</span></label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-y"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className={btn("primary", "sm")}
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
              <Dialog.Close disabled={isSaving} className={btn("standalone", "sm")}>
                Cancel
              </Dialog.Close>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
