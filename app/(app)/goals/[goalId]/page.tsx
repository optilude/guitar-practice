import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import { GoalDetailClient } from "./_components/goal-detail-client"

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ goalId: string }>
}) {
  const { goalId } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const goal = await db.goal.findUnique({
    where: { id: goalId },
    include: {
      topics: {
        include: { lesson: { select: { title: true } } },
        orderBy: { createdAt: "asc" },
      },
      routines: {
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { sections: true } } },
      },
    },
  })

  if (!goal || goal.userId !== session.user.id) notFound()

  return <GoalDetailClient goal={goal} />
}
