"use client"

import { useState } from "react"
import { createSection } from "@/app/(app)/goals/actions"
import type { SectionType } from "@/lib/generated/prisma/enums"

const SECTION_TYPES: { value: SectionType; label: string }[] = [
  { value: "warmup", label: "Warm Up" },
  { value: "technique", label: "Technique" },
  { value: "muscle_memory", label: "Muscle Memory" },
  { value: "theory", label: "Theory" },
  { value: "lessons", label: "Lessons" },
  { value: "songs", label: "Songs" },
  { value: "free_practice", label: "Free Practice" },
]

interface AddSectionFormProps {
  routineId: string
  onAdded: () => void
}

export function AddSectionForm({ routineId, onAdded }: AddSectionFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState<SectionType>("warmup")
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const defaultTitle = SECTION_TYPES.find((t) => t.value === type)?.label ?? ""

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    const fd = new FormData(e.currentTarget)
    const result = await createSection(routineId, {
      type,
      title: (fd.get("title") as string) || defaultTitle,
      durationMinutes: Number(fd.get("durationMinutes")),
    })
    setIsPending(false)
    if ("error" in result) {
      setError(result.error)
    } else {
      setIsOpen(false)
      setError(null)
      onAdded()
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors border border-dashed border-border rounded px-3 py-2 w-full"
      >
        + Add section
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 rounded-lg border border-border p-3 space-y-2 bg-card">
      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as SectionType)}
          className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {SECTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input
          name="title"
          placeholder={defaultTitle}
          maxLength={120}
          className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <input
          name="durationMinutes"
          type="number"
          required
          min={1}
          max={240}
          defaultValue={10}
          className="w-16 rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <span className="text-xs text-muted-foreground self-center">min</span>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="text-xs font-semibold bg-accent text-accent-foreground px-3 py-1 rounded hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Adding…" : "Add"}
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
