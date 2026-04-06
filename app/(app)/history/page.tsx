import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { startOfWeek, startOfMonth, startOfYear, format } from "date-fns"
import { HistoryCalendar } from "./_components/history-calendar"
import { GoalFilterSelect } from "./_components/goal-filter-select"
import { computeStreak } from "@/lib/sessions"

function statBlock(value: number | string, label: string) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-3xl font-semibold tabular-nums text-foreground leading-none">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
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

  const distinctGoals = [
    ...new Map(
      allSessions
        .filter((s) => s.goalId)
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
  const totalDays         = uniqueDates.length

  return (
    <div className="pt-6 max-w-4xl">
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
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Calendar */}
          <div className="flex-1 min-w-0">
            <HistoryCalendar sessions={sessions} />
          </div>

          {/* Stats sidebar */}
          <div className="lg:w-48 shrink-0 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-3">Sessions</p>
              <div className="space-y-4">
                {statBlock(sessionsThisWeek, "this week")}
                {statBlock(sessionsThisMonth, "this month")}
                {statBlock(sessionsThisYear, "this year")}
                {statBlock(totalSessions, "all time")}
              </div>
            </div>

            <div className="border-t border-border pt-6 space-y-4">
              <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground -mb-2">Streaks</p>
              {statBlock(
                totalStreak > 0 ? `🔥 ${totalStreak}` : "—",
                "day streak"
              )}
              {statBlock(totalDays, "days practised")}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
