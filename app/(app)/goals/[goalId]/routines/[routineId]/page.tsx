import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import { SectionList } from "./_components/section-list"

export default async function RoutineDetailPage({
  params,
}: {
  params: Promise<{ goalId: string; routineId: string }>
}) {
  const { goalId, routineId } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

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

  if (!routine || routine.goal.userId !== session.user.id || routine.goalId !== goalId) {
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

      <h1 className="text-2xl font-semibold text-foreground mb-1">{routine.title}</h1>
      <p className="text-xs text-muted-foreground mb-4">
        {routine.durationMinutes} minutes total
      </p>

      {routine.description && (
        <div className="prose prose-sm max-w-none text-foreground mb-6">
          <ReactMarkdown>{routine.description}</ReactMarkdown>
        </div>
      )}

      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Sections</p>

      <SectionList
        routineId={routineId}
        routineGoalId={goalId}
        initialSections={routine.sections}
        availableTopics={routine.goal.topics}
      />
    </div>
  )
}
