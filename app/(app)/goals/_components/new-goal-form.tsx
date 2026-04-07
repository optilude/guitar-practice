"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createGoal } from "@/app/(app)/goals/actions"
import { btn } from "@/lib/button-styles"

export function NewGoalForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    const fd = new FormData(e.currentTarget)
    const result = await createGoal({
      title: fd.get("title") as string,
      description: (fd.get("description") as string) || undefined,
    })
    setIsPending(false)
    if ("error" in result) {
      setError(result.error)
    } else {
      router.push(`/goals/${result.id}`)
    }
  }

  return (
    <div>
      <button
        onClick={() => { setIsOpen((o) => !o); setError(null) }}
        className="w-full rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors text-center cursor-pointer"
      >
        + Add goal
      </button>

      {/* Form rendered as a separate block below the header — controlled via portal-like sibling */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4 bg-black/30" onClick={(e) => { if (e.target === e.currentTarget) { setIsOpen(false); setError(null) } }}>
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md bg-card border border-border rounded-lg shadow-xl p-6 space-y-4"
          >
            <h2 className="text-sm font-semibold text-foreground">New goal</h2>
            <input
              name="title"
              placeholder="Goal title"
              required
              maxLength={120}
              autoFocus
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <textarea
              name="description"
              placeholder="Description (optional — Markdown supported)"
              rows={3}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-3 justify-end">
              <button
                type="submit"
                disabled={isPending}
                className={btn("primary")}
              >
                {isPending ? "Creating…" : "Create goal"}
              </button>
              <button
                type="button"
                onClick={() => { setIsOpen(false); setError(null) }}
                className={btn("secondary")}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
