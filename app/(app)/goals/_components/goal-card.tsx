"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import { setActiveGoal, archiveGoal } from "@/app/(app)/goals/actions"

interface GoalCardProps {
  goal: { id: string; title: string; description: string; isActive: boolean }
  topicCount: number
  routineCount: number
}

export function GoalCard({ goal, topicCount, routineCount }: GoalCardProps) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSetActive(e: React.MouseEvent) {
    e.stopPropagation()
    setIsPending(true)
    const result = await setActiveGoal(goal.id)
    setIsPending(false)
    if ("error" in result) setError(result.error)
    else router.refresh()
  }

  async function handleArchive(e: React.MouseEvent) {
    e.stopPropagation()
    setIsPending(true)
    const result = await archiveGoal(goal.id)
    setIsPending(false)
    if ("error" in result) setError(result.error)
    else router.refresh()
  }

  const firstLine = goal.description.split("\n")[0]

  return (
    <li
      onClick={() => router.push(`/goals/${goal.id}`)}
      className={`rounded-lg border p-4 cursor-pointer hover:border-accent/50 transition-colors ${
        goal.isActive ? "border-accent" : "border-border dark:border-neutral-600"
      } bg-card dark:bg-neutral-800`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{goal.title}</span>
            {goal.isActive && (
              <span className="text-xs text-accent border border-accent px-1.5 py-0.5 rounded">
                Active
              </span>
            )}
          </div>
          {firstLine && (
            <div className="text-xs text-muted-foreground mt-1 line-clamp-1 prose prose-sm max-w-none [&>*]:text-xs [&>*]:text-muted-foreground [&>*]:m-0">
              <ReactMarkdown>{firstLine}</ReactMarkdown>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {topicCount} {topicCount === 1 ? "topic" : "topics"} · {routineCount}{" "}
            {routineCount === 1 ? "routine" : "routines"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!goal.isActive && (
            <button
              onClick={handleSetActive}
              disabled={isPending}
              className="text-xs font-medium bg-accent/10 text-accent border border-accent/40 px-2.5 py-1 rounded hover:bg-accent/20 transition-colors disabled:opacity-50"
            >
              Activate
            </button>
          )}
          <button
            onClick={handleArchive}
            disabled={isPending}
            className="text-xs font-medium border border-border px-2.5 py-1 rounded text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors disabled:opacity-50"
          >
            Archive
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </li>
  )
}
