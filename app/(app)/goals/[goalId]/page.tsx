import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { GoalDetailClient } from "./_components/goal-detail-client"

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ goalId: string }>
}) {
  const { goalId } = await params
  const userId = await getUserId()
  if (!userId) notFound()

  const goal = await db.goal.findUnique({
    where: { id: goalId },
    include: {
      topics: {
        include: { lesson: { select: { title: true } } },
        orderBy: { createdAt: "asc" },
      },
      routines: {
        orderBy: { createdAt: "asc" },
        include: {
          _count: { select: { sections: true } },
          sections: { select: { durationMinutes: true } },
        },
      },
    },
  })

  if (!goal || goal.userId !== userId) notFound()

  return <GoalDetailClient goal={goal} />
}
