"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createRoutine } from "@/app/(app)/goals/actions"
import { btn } from "@/lib/button-styles"

interface NewRoutineFormProps {
  goalId: string
}

export function NewRoutineForm({ goalId }: NewRoutineFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  function handleClose() {
    setIsOpen(false)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    const fd = new FormData(e.currentTarget)
    const result = await createRoutine(goalId, {
      title: fd.get("title") as string,
      durationMinutes: Number(fd.get("durationMinutes")),
      description: (fd.get("description") as string) || undefined,
      useRecommended: true,
    })
    setIsPending(false)
    if ("error" in result) {
      setError(result.error)
    } else {
      router.push(`/goals/${goalId}/routines/${result.id}`)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setIsOpen(true); setError(null) }}
        className="mt-3 block w-full rounded border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors cursor-pointer"
      >
        + Add routine
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4 bg-black/30"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md bg-card border border-border rounded-lg shadow-xl p-6 space-y-4"
          >
            <h2 className="text-sm font-semibold text-foreground">New routine</h2>

            <div>
              <label htmlFor="routine-title" className="block text-xs text-muted-foreground mb-1">
                Title
              </label>
              <input
                id="routine-title"
                name="title"
                required
                maxLength={120}
                autoFocus
                placeholder="e.g. Morning Practice"
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div>
              <label htmlFor="routine-duration" className="block text-xs text-muted-foreground mb-1">
                Duration (minutes)
              </label>
              <input
                id="routine-duration"
                name="durationMinutes"
                type="number"
                required
                min={1}
                max={480}
                defaultValue={60}
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div>
              <label htmlFor="routine-description" className="block text-xs text-muted-foreground mb-1">
                Description <span className="font-normal">(optional — Markdown supported)</span>
              </label>
              <textarea
                id="routine-description"
                name="description"
                rows={3}
                placeholder="Optional notes about this routine…"
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-3 justify-end">
              <button type="submit" disabled={isPending} className={btn("primary")}>
                {isPending ? "Creating…" : "Create routine"}
              </button>
              <button type="button" onClick={handleClose} className={btn("secondary")}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
