import Link from "next/link"
import ReactMarkdown from "react-markdown"
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

  // Single sessions query covers both total and per-goal streak calculation
  const allSessions = userId
    ? await db.practiceSession.findMany({
        where: { userId },
        select: { localDate: true, goalId: true },
      })
    : []

  const sessionsByGoal = new Map<string, string[]>()
  for (const s of allSessions) {
    if (s.goalId) {
      if (!sessionsByGoal.has(s.goalId)) sessionsByGoal.set(s.goalId, [])
      sessionsByGoal.get(s.goalId)!.push(s.localDate)
    }
  }

  const activeGoalStreak = activeGoal
    ? computeStreak(sessionsByGoal.get(activeGoal.id) ?? [])
    : 0

  // Non-active unarchived goals, alphabetical
  const otherGoals = userId
    ? await db.goal.findMany({
        where: { userId, isArchived: false, isActive: false },
        orderBy: { title: "asc" },
        select: { id: true, title: true },
      })
    : []

  return (
    <div className="pt-6 max-w-4xl">
      {/* Header */}
      <div className={activeGoal ? "mb-3" : "mb-8"}>
        {activeGoal ? (
          <div className="flex items-start gap-3">
            <h1 className="text-2xl font-semibold text-foreground">{activeGoal.title}</h1>
            {activeGoalStreak > 0 && (
              <span className="text-lg text-muted-foreground leading-tight">🔥 {activeGoalStreak}</span>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
              {greeting()}
            </p>
            <h1 className="text-2xl font-semibold text-foreground">Get started</h1>
          </>
        )}
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {activeGoal ? (
            <div className="space-y-4">
              {activeGoal.description && (
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  <ReactMarkdown>{activeGoal.description}</ReactMarkdown>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Practice routines</p>
                {activeGoal.routines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    <Link href={`/goals/${activeGoal.id}`} className="underline underline-offset-2 hover:text-foreground transition-colors">
                      Add a routine to get started →
                    </Link>
                  </p>
                ) : (
                  <>
                    {activeGoal.routines.map((routine) => {
                      const totalMin = routine.sections.reduce((s, r) => s + r.durationMinutes, 0)
                      return (
                        <Link
                          key={routine.id}
                          href={`/sessions/run?routineId=${routine.id}`}
                          className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted transition-colors group"
                        >
                          <div className="flex items-center gap-3 text-sm min-w-0">
                            <span className="font-medium truncate">{routine.title}</span>
                            <span className="text-muted-foreground shrink-0">
                              {routine._count.sections} sections · {formatDuration(totalMin)}
                            </span>
                          </div>
                          <span
                            aria-hidden="true"
                            className="shrink-0 px-3 py-1 text-xs rounded-md bg-accent text-accent-foreground group-hover:opacity-90 transition-opacity"
                          >
                            ▶ Start
                          </span>
                        </Link>
                      )
                    })}
                    <Link
                      href={`/goals/${activeGoal.id}`}
                      className="inline-block text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Manage goal and practice routines →
                    </Link>
                  </>
                )}
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

        {/* Other goals sidebar */}
        {otherGoals.length > 0 && (
          <div className="lg:w-1/3 shrink-0">
            <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2">Other goals</p>
            <div className="space-y-0.5">
              {otherGoals.map((goal) => {
                const streak = computeStreak(sessionsByGoal.get(goal.id) ?? [])
                return (
                  <Link
                    key={goal.id}
                    href={`/goals/${goal.id}`}
                    className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted transition-colors"
                  >
                    <span className="text-sm truncate text-muted-foreground">{goal.title}</span>
                    {streak > 0 && (
                      <span className="text-[11px] text-muted-foreground shrink-0">🔥 {streak}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
