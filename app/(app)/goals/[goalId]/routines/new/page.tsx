"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createRoutine } from "@/app/(app)/goals/actions"

export default function NewRoutinePage() {
  const { goalId } = useParams<{ goalId: string }>()
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    const fd = new FormData(e.currentTarget)
    const result = await createRoutine(goalId, {
      title: fd.get("title") as string,
      durationMinutes: Number(fd.get("durationMinutes")),
      description: (fd.get("description") as string) || undefined,
      useRecommended: fd.get("useRecommended") === "on",
    })
    setIsPending(false)
    if ("error" in result) {
      setError(result.error)
    } else {
      router.push(`/goals/${goalId}/routines/${result.id}`)
    }
  }

  return (
    <div className="pt-6 max-w-lg">
      <Link
        href={`/goals/${goalId}`}
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
      >
        ← Goal
      </Link>
      <h1 className="text-2xl font-semibold text-foreground mb-6">New Routine</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="title"
            className="block text-xs uppercase tracking-widest text-muted-foreground mb-1"
          >
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            maxLength={120}
            placeholder="e.g. Morning Practice"
            className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div>
          <label
            htmlFor="durationMinutes"
            className="block text-xs uppercase tracking-widest text-muted-foreground mb-1"
          >
            Duration (minutes)
          </label>
          <input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            required
            min={1}
            max={480}
            defaultValue={60}
            className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-xs uppercase tracking-widest text-muted-foreground mb-1"
          >
            Description <span className="normal-case">(Markdown supported)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="Optional notes about this routine…"
            className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="useRecommended"
            defaultChecked
            className="rounded border-border"
          />
          <span className="text-sm text-foreground">Start with recommended structure</span>
          <span className="text-xs text-muted-foreground">
            (Warmup 5 min · Technique 15 min · Muscle Memory 10 min · Songs 20 min · Free Practice 10 min)
          </span>
        </label>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="text-sm font-semibold bg-accent text-accent-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? "Creating…" : "Create routine"}
          </button>
          <Link
            href={`/goals/${goalId}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
