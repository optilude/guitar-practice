"use client"

import { useRouter } from "next/navigation"

interface GoalFilterSelectProps {
  goals: { id: string; title: string }[]
  selectedGoalId?: string
}

export function GoalFilterSelect({ goals, selectedGoalId }: GoalFilterSelectProps) {
  const router = useRouter()
  if (goals.length === 0) return null
  return (
    <select
      defaultValue={selectedGoalId ?? ""}
      onChange={(e) => {
        const val = e.target.value
        router.push(val ? `/history?goalId=${val}` : "/history")
      }}
      className="w-full rounded border border-border bg-card text-foreground text-xs px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
    >
      <option value="">All goals</option>
      {goals.map((g) => (
        <option key={g.id} value={g.id}>{g.title}</option>
      ))}
    </select>
  )
}
