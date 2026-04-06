import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { HistoryCalendar } from "./_components/history-calendar"
import { GoalFilterSelect } from "./_components/goal-filter-select"

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ goalId?: string }>
}) {
  const { goalId } = await searchParams
  const userId = await getUserId()
  if (!userId) notFound()

  const sessions = await db.practiceSession.findMany({
    where: {
      userId,
      ...(goalId ? { goalId } : {}),
    },
    orderBy: { startedAtLocal: "desc" },
    select: {
      id: true,
      routineTitle: true,
      goalTitle: true,
      goalId: true,
      startedAtLocal: true,
      endedAtLocal: true,
      localDate: true,
    },
  })

  // Distinct goals from all sessions (unfiltered) for the filter dropdown
  const allSessions = goalId
    ? await db.practiceSession.findMany({
        where: { userId },
        select: { goalId: true, goalTitle: true },
        distinct: ["goalId"],
      })
    : sessions

  const distinctGoals = [
    ...new Map(
      allSessions
        .filter((s) => s.goalId)
        .map((s) => [s.goalId, { id: s.goalId!, title: s.goalTitle }]),
    ).values(),
  ]

  return (
    <div className="pt-6 max-w-2xl">
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-2xl font-semibold">History</h1>
        <GoalFilterSelect goals={distinctGoals} selectedGoalId={goalId} />
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No sessions yet.{" "}
          <Link href="/" className="underline underline-offset-2 hover:text-foreground transition-colors">
            Start practising →
          </Link>
        </p>
      ) : (
        <HistoryCalendar sessions={sessions} />
      )}
    </div>
  )
}
