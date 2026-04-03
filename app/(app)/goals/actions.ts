"use server"

import { revalidatePath } from "next/cache"
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { computeRefKey } from "@/lib/goals"
import type { TopicKind, SectionType, PracticeMode } from "@/lib/generated/prisma/enums"

async function requireUserId(): Promise<string> {
  const userId = await getUserId()
  if (!userId) throw new Error("Not authenticated")
  return userId
}

export async function createGoal(data: {
  title: string
  description?: string
}): Promise<{ success: true; id: string } | { error: string }> {
  try {
    const userId = await requireUserId()
    const hasActive = await db.goal.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
    })
    const goal = await db.goal.create({
      data: {
        userId,
        title: data.title.trim(),
        description: data.description?.trim() ?? "",
        isActive: !hasActive,
      },
    })
    revalidatePath("/goals")
    return { success: true, id: goal.id }
  } catch {
    return { error: "Failed to create goal" }
  }
}

export async function updateGoal(
  goalId: string,
  data: { title?: string; description?: string }
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const goal = await db.goal.findUnique({ where: { id: goalId } })
    if (!goal || goal.userId !== userId) return { error: "Not found" }
    await db.goal.update({
      where: { id: goalId },
      data: {
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description.trim() } : {}),
      },
    })
    revalidatePath("/goals")
    revalidatePath(`/goals/${goalId}`)
    return { success: true }
  } catch {
    return { error: "Failed to update goal" }
  }
}

export async function setActiveGoal(
  goalId: string
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const goal = await db.goal.findUnique({ where: { id: goalId } })
    if (!goal || goal.userId !== userId) return { error: "Not found" }
    await db.$transaction([
      db.goal.updateMany({ where: { userId, isActive: true }, data: { isActive: false } }),
      db.goal.update({ where: { id: goalId }, data: { isActive: true } }),
    ])
    revalidatePath("/goals")
    return { success: true }
  } catch {
    return { error: "Failed to set active goal" }
  }
}

export async function archiveGoal(
  goalId: string
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const goal = await db.goal.findUnique({ where: { id: goalId } })
    if (!goal || goal.userId !== userId) return { error: "Not found" }
    await db.goal.update({
      where: { id: goalId },
      data: { isArchived: true, isActive: false },
    })
    revalidatePath("/goals")
    revalidatePath(`/goals/${goalId}`)
    return { success: true }
  } catch {
    return { error: "Failed to archive goal" }
  }
}

export async function unarchiveGoal(
  goalId: string
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const goal = await db.goal.findUnique({ where: { id: goalId } })
    if (!goal || goal.userId !== userId) return { error: "Not found" }
    await db.goal.update({
      where: { id: goalId },
      data: { isArchived: false },
    })
    revalidatePath("/goals/archived")
    return { success: true }
  } catch {
    return { error: "Failed to unarchive goal" }
  }
}

export async function deleteGoal(
  goalId: string
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const goal = await db.goal.findUnique({ where: { id: goalId } })
    if (!goal || goal.userId !== userId) return { error: "Not found" }
    await db.goal.delete({ where: { id: goalId } })
    revalidatePath("/goals")
    revalidatePath("/goals/archived")
    return { success: true }
  } catch {
    return { error: "Failed to delete goal" }
  }
}

export async function addTopicToGoal(
  goalId: string,
  topicRef: {
    kind: TopicKind
    subtype?: string
    lessonId?: string
    defaultKey?: string
  }
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const goal = await db.goal.findUnique({ where: { id: goalId } })
    if (!goal || goal.userId !== userId) return { error: "Not found" }
    const refKey = computeRefKey(topicRef)
    await db.goalTopic.upsert({
      where: { goalId_refKey: { goalId, refKey } },
      create: {
        goalId,
        kind: topicRef.kind,
        subtype: topicRef.subtype ?? null,
        lessonId: topicRef.lessonId ?? null,
        defaultKey: topicRef.defaultKey ?? null,
        refKey,
      },
      update: {},
    })
    revalidatePath(`/goals/${goalId}`)
    return { success: true }
  } catch {
    return { error: "Failed to add topic" }
  }
}

export async function removeTopicFromGoal(
  goalTopicId: string
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const topic = await db.goalTopic.findUnique({
      where: { id: goalTopicId },
      include: { goal: true },
    })
    if (!topic || topic.goal.userId !== userId) return { error: "Not found" }
    await db.goalTopic.delete({ where: { id: goalTopicId } })
    revalidatePath(`/goals/${topic.goalId}`)
    return { success: true }
  } catch {
    return { error: "Failed to remove topic" }
  }
}

// ── Goal query (used by AddToGoalButton modal) ────────────────────────────────

export async function getUserGoals(): Promise<
  { id: string; title: string; isActive: boolean }[]
> {
  try {
    const userId = await requireUserId()
    return await db.goal.findMany({
      where: { userId, isArchived: false },
      select: { id: true, title: true, isActive: true },
      orderBy: { createdAt: "desc" },
    })
  } catch {
    return []
  }
}

// ── Routine actions ───────────────────────────────────────────────────────────

const DEFAULT_SECTIONS: {
  type: SectionType
  title: string
  durationMinutes: number
}[] = [
  { type: "warmup", title: "Warm Up", durationMinutes: 5 },
  { type: "technique", title: "Technique & Scales", durationMinutes: 15 },
  { type: "muscle_memory", title: "Muscle Memory", durationMinutes: 10 },
  { type: "songs", title: "Songs & Repertoire", durationMinutes: 20 },
  { type: "free_practice", title: "Free Practice", durationMinutes: 10 },
]

export async function createRoutine(
  goalId: string,
  data: {
    title: string
    durationMinutes: number
    description?: string
    useRecommended?: boolean
  }
): Promise<{ success: true; id: string } | { error: string }> {
  try {
    const userId = await requireUserId()
    const goal = await db.goal.findUnique({ where: { id: goalId } })
    if (!goal || goal.userId !== userId) return { error: "Not found" }

    const routine = await db.$transaction(async (tx) => {
      const r = await tx.routine.create({
        data: {
          goalId,
          title: data.title.trim(),
          description: data.description?.trim() ?? "",
          durationMinutes: data.durationMinutes,
        },
      })
      if (data.useRecommended) {
        await Promise.all(
          DEFAULT_SECTIONS.map((s, i) =>
            tx.section.create({
              data: {
                routineId: r.id,
                type: s.type,
                title: s.title,
                durationMinutes: s.durationMinutes,
                order: i,
              },
            })
          )
        )
      }
      return r
    })

    revalidatePath(`/goals/${goalId}`)
    return { success: true, id: routine.id }
  } catch {
    return { error: "Failed to create routine" }
  }
}

export async function updateRoutine(
  routineId: string,
  data: { title?: string; durationMinutes?: number; description?: string }
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const routine = await db.routine.findUnique({
      where: { id: routineId },
      include: { goal: true },
    })
    if (!routine || routine.goal.userId !== userId) return { error: "Not found" }
    await db.routine.update({
      where: { id: routineId },
      data: {
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description.trim() } : {}),
        ...(data.durationMinutes !== undefined ? { durationMinutes: data.durationMinutes } : {}),
      },
    })
    revalidatePath(`/goals/${routine.goalId}/routines/${routineId}`)
    return { success: true }
  } catch {
    return { error: "Failed to update routine" }
  }
}

export async function deleteRoutine(
  routineId: string
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const routine = await db.routine.findUnique({
      where: { id: routineId },
      include: { goal: true },
    })
    if (!routine || routine.goal.userId !== userId) return { error: "Not found" }
    await db.routine.delete({ where: { id: routineId } })
    revalidatePath(`/goals/${routine.goalId}`)
    return { success: true }
  } catch {
    return { error: "Failed to delete routine" }
  }
}

// ── Section actions ───────────────────────────────────────────────────────────

async function requireSectionOwner(sectionId: string, userId: string) {
  const section = await db.section.findUnique({
    where: { id: sectionId },
    include: { routine: { include: { goal: true } } },
  })
  if (!section || section.routine.goal.userId !== userId) return null
  return section
}

export async function createSection(
  routineId: string,
  data: {
    type: SectionType
    title: string
    durationMinutes: number
    description?: string
  }
): Promise<{ success: true; id: string } | { error: string }> {
  try {
    const userId = await requireUserId()
    const routine = await db.routine.findUnique({
      where: { id: routineId },
      include: { goal: true },
    })
    if (!routine || routine.goal.userId !== userId) return { error: "Not found" }

    const existing = await db.section.findMany({
      where: { routineId },
      select: { order: true },
    })
    const maxOrder = existing.length > 0 ? Math.max(...existing.map((s) => s.order)) : -1

    const section = await db.section.create({
      data: {
        routineId,
        type: data.type,
        title: data.title.trim(),
        durationMinutes: data.durationMinutes,
        description: data.description?.trim() ?? "",
        order: maxOrder + 1,
      },
    })
    revalidatePath(`/goals/${routine.goalId}/routines/${routineId}`)
    return { success: true, id: section.id }
  } catch {
    return { error: "Failed to create section" }
  }
}

export async function updateSection(
  sectionId: string,
  data: { type?: SectionType; title?: string; durationMinutes?: number; description?: string }
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const section = await requireSectionOwner(sectionId, userId)
    if (!section) return { error: "Not found" }
    await db.section.update({
      where: { id: sectionId },
      data: {
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.durationMinutes !== undefined ? { durationMinutes: data.durationMinutes } : {}),
        ...(data.description !== undefined ? { description: data.description.trim() } : {}),
      },
    })
    revalidatePath(
      `/goals/${section.routine.goalId}/routines/${section.routineId}`
    )
    return { success: true }
  } catch {
    return { error: "Failed to update section" }
  }
}

export async function deleteSection(
  sectionId: string
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const section = await requireSectionOwner(sectionId, userId)
    if (!section) return { error: "Not found" }
    await db.section.delete({ where: { id: sectionId } })
    revalidatePath(
      `/goals/${section.routine.goalId}/routines/${section.routineId}`
    )
    return { success: true }
  } catch {
    return { error: "Failed to delete section" }
  }
}

export async function reorderSections(
  routineId: string,
  orderedIds: string[]
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const routine = await db.routine.findUnique({
      where: { id: routineId },
      include: { goal: true },
    })
    if (!routine || routine.goal.userId !== userId) return { error: "Not found" }
    await db.$transaction(
      orderedIds.map((id, index) =>
        db.section.update({ where: { id }, data: { order: index } })
      )
    )
    revalidatePath(`/goals/${routine.goalId}/routines/${routineId}`)
    return { success: true }
  } catch {
    return { error: "Failed to reorder sections" }
  }
}

// ── Section topic actions ─────────────────────────────────────────────────────

export async function addTopicToSection(
  sectionId: string,
  goalTopicId: string
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const section = await requireSectionOwner(sectionId, userId)
    if (!section) return { error: "Not found" }
    await db.sectionTopic.create({
      data: { sectionId, goalTopicId },
    })
    revalidatePath(
      `/goals/${section.routine.goalId}/routines/${section.routineId}`
    )
    return { success: true }
  } catch {
    return { error: "Failed to add topic to section" }
  }
}

export async function removeTopicFromSection(
  sectionTopicId: string
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const st = await db.sectionTopic.findUnique({
      where: { id: sectionTopicId },
      include: { section: { include: { routine: { include: { goal: true } } } } },
    })
    if (!st || st.section.routine.goal.userId !== userId) return { error: "Not found" }
    await db.sectionTopic.delete({ where: { id: sectionTopicId } })
    revalidatePath(
      `/goals/${st.section.routine.goalId}/routines/${st.section.routineId}`
    )
    return { success: true }
  } catch {
    return { error: "Failed to remove topic from section" }
  }
}

export async function updateSectionTopic(
  sectionTopicId: string,
  data: { keys?: string[]; practiceMode?: PracticeMode | null }
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const st = await db.sectionTopic.findUnique({
      where: { id: sectionTopicId },
      include: { section: { include: { routine: { include: { goal: true } } } } },
    })
    if (!st || st.section.routine.goal.userId !== userId) return { error: "Not found" }
    await db.sectionTopic.update({
      where: { id: sectionTopicId },
      data: {
        ...(data.keys !== undefined ? { keys: data.keys } : {}),
        ...(data.practiceMode !== undefined ? { practiceMode: data.practiceMode } : {}),
      },
    })
    revalidatePath(
      `/goals/${st.section.routine.goalId}/routines/${st.section.routineId}`
    )
    return { success: true }
  } catch {
    return { error: "Failed to update section topic" }
  }
}
