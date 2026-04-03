import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { SectionList } from "./_components/section-list"
import { RoutineHeader } from "./_components/routine-header"
import { DeleteRoutineButton } from "./_components/delete-routine-button"

export default async function RoutineDetailPage({
  params,
}: {
  params: Promise<{ goalId: string; routineId: string }>
}) {
  const { goalId, routineId } = await params
  const userId = await getUserId()
  if (!userId) notFound()

  const routine = await db.routine.findUnique({
    where: { id: routineId },
    include: {
      goal: {
        include: {
          topics: {
            include: { lesson: { select: { title: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      sections: {
        orderBy: { order: "asc" },
        include: {
          sectionTopics: {
            include: {
              goalTopic: { include: { lesson: { select: { title: true } } } },
            },
          },
        },
      },
    },
  })

  if (!routine || routine.goal.userId !== userId || routine.goalId !== goalId) {
    notFound()
  }

  return (
    <div className="pt-6">
      <Link
        href={`/goals/${goalId}`}
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
      >
        ← Goal
      </Link>

      <RoutineHeader
        routineId={routineId}
        title={routine.title}
        description={routine.description}
        totalMinutes={routine.sections.reduce((sum, s) => sum + s.durationMinutes, 0)}
      />

      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Sections</p>

      <SectionList
        routineId={routineId}
        routineGoalId={goalId}
        initialSections={routine.sections}
        availableTopics={routine.goal.topics}
      />

      <DeleteRoutineButton
        routineId={routineId}
        goalId={goalId}
        routineTitle={routine.title}
      />
    </div>
  )
}
