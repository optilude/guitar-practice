"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import type { SessionRoutine } from "@/lib/sessions"

async function requireUserId(): Promise<string> {
  const userId = await getUserId()
  if (!userId) throw new Error("Not authenticated")
  return userId
}

export type SaveSessionInput = {
  routine: SessionRoutine
  startedAtLocal: string
  endedAtLocal: string
  notes: string
}

export async function saveSession(
  input: SaveSessionInput,
): Promise<{ success: true; id: string } | { error: string }> {
  try {
    const userId = await requireUserId()
    const localDate = input.startedAtLocal.slice(0, 10)

    const session = await db.practiceSession.create({
      data: {
        userId,
        goalId: input.routine.goalId || null,
        goalTitle: input.routine.goalTitle,
        routineTitle: input.routine.title,
        startedAtLocal: input.startedAtLocal,
        endedAtLocal: input.endedAtLocal,
        localDate,
        notes: input.notes,
        sections: {
          create: input.routine.sections.map((s) => ({
            title: s.title,
            type: s.type,
            description: s.description,
            durationMinutes: s.durationMinutes,
            order: s.order,
            topics: s.topic
              ? {
                  create: {
                    kind: s.topic.kind,
                    subtype: s.topic.subtype,
                    displayName: s.topic.displayName,
                    keys: s.topic.keys,
                    practiceMode: s.topic.practiceMode,
                    lessonUrl: s.topic.lessonUrl,
                  },
                }
              : undefined,
          })),
        },
      },
    })

    revalidatePath("/history")
    revalidatePath("/")
    return { success: true, id: session.id }
  } catch {
    return { error: "Failed to save session" }
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  const userId = await requireUserId()
  const session = await db.practiceSession.findUnique({
    where: { id: sessionId },
    select: { userId: true },
  })
  if (!session || session.userId !== userId) {
    throw new Error("Not authorized")
  }

  await db.practiceSession.delete({ where: { id: sessionId } })
  revalidatePath("/history")
  revalidatePath("/")
  redirect("/history")
}
