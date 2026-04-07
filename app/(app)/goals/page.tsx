import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { GoalCard } from "./_components/goal-card"
import { NewGoalForm } from "./_components/new-goal-form"

export default async function GoalsPage() {
  const userId = await getUserId()
  if (!userId) notFound()

  const goals = await db.goal.findMany({
    where: { userId, isArchived: false },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { topics: true, routines: true } } },
  })

  return (
    <div className="pt-6">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
          Your goals
        </p>
        <h1 className="text-2xl font-semibold text-foreground">Goals</h1>
      </div>

      {goals.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No goals yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              topicCount={goal._count.topics}
              routineCount={goal._count.routines}
            />
          ))}
        </ul>
      )}

      <div className="mt-3">
        <NewGoalForm />
      </div>

      <div className="mt-8">
        <Link
          href="/goals/archived"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View archived goals →
        </Link>
      </div>
    </div>
  )
}
