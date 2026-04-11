import { redirect } from "next/navigation"
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { formatTopicName } from "@/lib/goals"
import { SessionRunnerClient } from "./_components/session-runner-client"
import type { SessionRoutine } from "@/lib/sessions"

export default async function SessionRunPage({
  searchParams,
}: {
  searchParams: Promise<{ routineId?: string }>
}) {
  const { routineId } = await searchParams
  if (!routineId) redirect("/goals")

  const userId = await getUserId()
  if (!userId) redirect("/goals")

  const routine = await db.routine.findUnique({
    where: { id: routineId },
    include: {
      goal: { select: { id: true, title: true, userId: true } },
      sections: {
        orderBy: { order: "asc" },
        include: {
          sectionTopics: {
            take: 1,
            include: {
              goalTopic: {
                include: {
                  lesson: { select: { title: true, url: true } },
                  userLesson: { select: { title: true, url: true } },
                  userProgression: { select: { displayName: true } },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!routine) redirect("/goals")

  // Verify ownership via goal
  if (routine.goal.userId !== userId) redirect("/goals")

  const sessionRoutine: SessionRoutine = {
    id: routine.id,
    title: routine.title,
    goalId: routine.goalId,
    goalTitle: routine.goal.title,
    sections: routine.sections.map((s) => {
      const st = s.sectionTopics[0]
      const gt = st?.goalTopic
      return {
        id: s.id,
        title: s.title,
        type: s.type,
        description: s.description,
        durationMinutes: s.durationMinutes,
        order: s.order,
        topic: gt
          ? {
              kind: gt.kind,
              subtype: gt.subtype,
              displayName: formatTopicName({
                kind: gt.kind,
                subtype: gt.subtype,
                defaultKey: gt.defaultKey,
                lesson: gt.lesson,
                userLesson: gt.userLesson,
                userProgression: gt.userProgression,
              }),
              defaultKey: gt.defaultKey,
              keys: st.keys,
              practiceMode: st.practiceMode,
              lessonUrl: gt.lesson?.url ?? gt.userLesson?.url ?? null,
            }
          : null,
      }
    }),
  }

  return <SessionRunnerClient routine={sessionRoutine} />
}
