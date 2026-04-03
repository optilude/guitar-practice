"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createGoal } from "@/app/(app)/goals/actions"

export function NewGoalForm({ showOpenByDefault }: { showOpenByDefault: boolean }) {
  const [isOpen, setIsOpen] = useState(showOpenByDefault)
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
      setIsOpen(false)
      setError(null)
      ;(e.target as HTMLFormElement).reset()
      router.refresh()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs font-semibold bg-accent text-accent-foreground px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity"
      >
        New goal
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-2 mt-4">
      <input
        name="title"
        placeholder="Goal title"
        required
        maxLength={120}
        className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <textarea
        name="description"
        placeholder="Description (Markdown supported)"
        rows={3}
        className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="text-xs font-semibold bg-accent text-accent-foreground px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "Creating…" : "Create goal"}
        </button>
        <button
          type="button"
          onClick={() => { setIsOpen(false); setError(null) }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
