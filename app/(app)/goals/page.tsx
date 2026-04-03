import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { GoalCard } from "./_components/goal-card"
import { NewGoalForm } from "./_components/new-goal-form"

export default async function GoalsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const goals = await db.goal.findMany({
    where: { userId: session.user.id, isArchived: false },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { topics: true, routines: true } } },
  })

  return (
    <div className="pt-6">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
            Your goals
          </p>
          <h1 className="text-2xl font-semibold text-foreground">Goals</h1>
        </div>
        <NewGoalForm showOpenByDefault={goals.length === 0} />
      </div>

      {goals.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You don&apos;t have any goals yet. Goals help you stay focused — create your first one
          above!
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
