import Link from "next/link"
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { computeStreak } from "@/lib/sessions"

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default async function HomePage() {
  const userId = await getUserId()

  const activeGoal = userId
    ? await db.goal.findFirst({
        where: { userId, isActive: true, isArchived: false },
        include: {
          routines: {
            orderBy: { createdAt: "asc" },
            include: {
              _count: { select: { sections: true } },
              sections: { select: { durationMinutes: true } },
            },
          },
        },
      })
    : null

  const allLocalDates = userId
    ? (
        await db.practiceSession.findMany({
          where: { userId },
          select: { localDate: true },
        })
      ).map((r) => r.localDate)
    : []

  const goalLocalDates =
    userId && activeGoal
      ? (
          await db.practiceSession.findMany({
            where: { userId, goalId: activeGoal.id },
            select: { localDate: true },
          })
        ).map((r) => r.localDate)
      : []

  const totalStreak = computeStreak(allLocalDates)
  const goalStreak = computeStreak(goalLocalDates)

  return (
    <div className="pt-6 max-w-2xl">
      <div className="flex justify-between items-baseline mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
            {greeting()}
          </p>
          <h1 className="text-2xl font-semibold text-foreground">Get started</h1>
        </div>
        {(totalStreak > 0 || goalStreak > 0) && (
          <div className="text-right">
            {totalStreak > 0 && (
              <div className="text-[13px] font-medium text-accent">🔥 {totalStreak}-day streak</div>
            )}
            {goalStreak > 0 && (
              <div className="text-[10px] text-muted-foreground">{goalStreak} days on this goal</div>
            )}
          </div>
        )}
      </div>

      {activeGoal ? (
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-1">Active goal</p>
            <h2 className="text-lg font-semibold">{activeGoal.title}</h2>
            {activeGoal.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{activeGoal.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Practice routines</p>
            {activeGoal.routines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                <Link href={`/goals/${activeGoal.id}`} className="underline underline-offset-2 hover:text-foreground transition-colors">
                  Add a routine to get started →
                </Link>
              </p>
            ) : (
              activeGoal.routines.map((routine) => {
                const totalMin = routine.sections.reduce((s, r) => s + r.durationMinutes, 0)
                return (
                  <div
                    key={routine.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3"
                  >
                    <div className="flex items-center gap-3 text-sm min-w-0">
                      <span className="font-medium truncate">{routine.title}</span>
                      <span className="text-muted-foreground shrink-0">
                        {routine._count.sections} sections · {formatDuration(totalMin)}
                      </span>
                    </div>
                    <Link
                      href={`/sessions/run?routineId=${routine.id}`}
                      className="shrink-0 px-3 py-1 text-xs rounded-md bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
                    >
                      ▶ Start
                    </Link>
                  </div>
                )
              })
            )}
            <Link
              href={`/goals/${activeGoal.id}`}
              className="inline-block text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
            >
              + New routine →
            </Link>
          </div>
        </div>
      ) : (
        <p className="text-base text-muted-foreground">
          <Link
            href="/goals"
            className="text-foreground underline underline-offset-2 decoration-border hover:decoration-foreground transition-colors"
          >
            Set your first goal to get started →
          </Link>
        </p>
      )}
    </div>
  )
}
