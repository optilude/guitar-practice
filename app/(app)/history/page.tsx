import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { startOfWeek, startOfMonth, startOfYear, format } from "date-fns"
import { HistoryCalendar } from "./_components/history-calendar"
import { GoalFilterSelect } from "./_components/goal-filter-select"
import { computeStreak } from "@/lib/sessions"

function statRow(label: string, value: number | string) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  )
}

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
        select: { goalId: true, goalTitle: true, localDate: true },
        distinct: ["goalId"],
      })
    : sessions

  const unarchivedGoalIds = new Set(
    (await db.goal.findMany({
      where: { userId, isArchived: false },
      select: { id: true },
    })).map((g) => g.id)
  )

  const distinctGoals = [
    ...new Map(
      allSessions
        .filter((s) => s.goalId && unarchivedGoalIds.has(s.goalId))
        .map((s) => [s.goalId, { id: s.goalId!, title: s.goalTitle }]),
    ).values(),
  ]

  // Stats — always computed from all sessions (unfiltered by goal)
  const allLocalDates = goalId
    ? (await db.practiceSession.findMany({
        where: { userId },
        select: { localDate: true },
      })).map((s) => s.localDate)
    : sessions.map((s) => s.localDate)

  const today = new Date()
  const weekStart  = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd")
  const monthStart = format(startOfMonth(today), "yyyy-MM-dd")
  const yearStart  = format(startOfYear(today), "yyyy-MM-dd")

  const uniqueDates = [...new Set(allLocalDates)]
  const sessionsThisWeek  = allLocalDates.filter((d) => d >= weekStart).length
  const sessionsThisMonth = allLocalDates.filter((d) => d >= monthStart).length
  const sessionsThisYear  = allLocalDates.filter((d) => d >= yearStart).length
  const totalSessions     = allLocalDates.length
  const totalStreak       = computeStreak(uniqueDates)

  return (
    <div className="pt-6 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-6">History</h1>

      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No sessions yet.{" "}
          <Link href="/" className="underline underline-offset-2 hover:text-foreground transition-colors">
            Start practising →
          </Link>
        </p>
      ) : (
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-10">
          {/* Calendar + session list */}
          <div className="flex-1 min-w-0">
            <HistoryCalendar sessions={sessions} />
          </div>

          {/* Stats sidebar */}
          <div className="w-full lg:w-44 lg:shrink-0 flex flex-col gap-6">
            {totalStreak > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Streak</p>
                <p className="text-sm font-semibold text-foreground">
                  {totalStreak} day{totalStreak !== 1 ? "s" : ""} 🔥
                </p>
              </div>
            )}

            <div className="border-t border-border pt-4">
              <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-3">Sessions</p>
              {statRow("This week", sessionsThisWeek)}
              {statRow("This month", sessionsThisMonth)}
              {statRow("This year", sessionsThisYear)}
              {statRow("All time", totalSessions)}
            </div>

            {distinctGoals.length > 1 && (
              <div className="border-t border-border pt-4">
                <GoalFilterSelect goals={distinctGoals} selectedGoalId={goalId} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
