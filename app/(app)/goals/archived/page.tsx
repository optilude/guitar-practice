import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArchivedGoalCard } from "./_components/archived-goal-card"

export default async function ArchivedGoalsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const goals = await db.goal.findMany({
    where: { userId: session.user.id, isArchived: true },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, description: true },
  })

  return (
    <div className="pt-6">
      <Link
        href="/goals"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
      >
        ← Goals
      </Link>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Archived Goals</h1>

      {goals.length === 0 ? (
        <p className="text-sm text-muted-foreground">No archived goals.</p>
      ) : (
        <ul className="space-y-3">
          {goals.map((goal) => (
            <ArchivedGoalCard key={goal.id} goal={goal} />
          ))}
        </ul>
      )}
    </div>
  )
}
