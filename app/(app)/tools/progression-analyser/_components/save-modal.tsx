"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { analyzeProgression } from "@/lib/theory/transposer"
import { createUserProgression } from "@/app/(app)/reference/progressions/actions"
import { btn } from "@/lib/button-styles"
import type { InputChord } from "@/lib/theory/key-finder"

interface SaveModalProps {
  parsedChords: InputChord[]
  tonic: string
  modeName: string
  initialTitle: string
  initialDescription: string
  onClose: () => void
}

export function SaveModal({
  parsedChords,
  tonic,
  modeName,
  initialTitle,
  initialDescription,
  onClose,
}: SaveModalProps) {
  const router = useRouter()
  const [modalTitle, setModalTitle]             = useState(initialTitle)
  const [modalDescription, setModalDescription] = useState(initialDescription)
  const [isSaving, setIsSaving]                 = useState(false)
  const [error, setError]                       = useState<string | null>(null)

  async function handleSave() {
    if (!modalTitle.trim()) { setError("Name is required"); return }
    setIsSaving(true)
    setError(null)

    const analyses = analyzeProgression(parsedChords, tonic, modeName)
    const degrees = analyses.map((a, i) => {
      const chord = parsedChords[i]
      return `${a.roman}:${chord?.type ?? ""}`
    })

    const result = await createUserProgression({
      displayName: modalTitle.trim(),
      description: modalDescription,
      mode: modeName,
      degrees,
    })

    if ("error" in result) {
      setError(result.error)
      setIsSaving(false)
    } else {
      router.push("/reference/progressions")
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Save progression"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onPointerDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Save progression</h2>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">Name</label>
          <input
            value={modalTitle}
            onChange={e => setModalTitle(e.target.value)}
            placeholder="My progression"
            autoFocus
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">Description (markdown)</label>
          <textarea
            value={modalDescription}
            onChange={e => setModalDescription(e.target.value)}
            rows={4}
            placeholder="Optional notes about this progression…"
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-y"
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={btn("primary")}
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className={btn("standalone")}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
