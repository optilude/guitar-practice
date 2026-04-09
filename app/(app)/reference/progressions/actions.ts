"use server"

import { revalidatePath } from "next/cache"
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"

async function requireUserId(): Promise<string> {
  const userId = await getUserId()
  if (!userId) throw new Error("Not authenticated")
  return userId
}

function revalidate() {
  revalidatePath("/reference/progressions")
  revalidatePath("/reference")
}

export async function createUserProgression(data: {
  displayName: string
  description: string
  mode: string
  degrees: string[]
}): Promise<{ success: true; id: string } | { error: string }> {
  try {
    const userId = await requireUserId()
    const last = await db.userProgression.findFirst({
      where: { userId },
      orderBy: { order: "desc" },
      select: { order: true },
    })
    const order = (last?.order ?? -1) + 1
    const prog = await db.userProgression.create({
      data: {
        userId,
        displayName: data.displayName.trim(),
        description: data.description,
        mode: data.mode,
        degrees: data.degrees,
        order,
      },
    })
    revalidate()
    return { success: true, id: prog.id }
  } catch {
    return { error: "Failed to create progression" }
  }
}

export async function updateUserProgression(
  id: string,
  data: {
    displayName?: string
    description?: string
    mode?: string
    degrees?: string[]
  }
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const prog = await db.userProgression.findUnique({ where: { id } })
    if (!prog || prog.userId !== userId) return { error: "Not found" }
    await db.userProgression.update({
      where: { id },
      data: {
        ...(data.displayName !== undefined && { displayName: data.displayName.trim() }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.mode       !== undefined && { mode: data.mode }),
        ...(data.degrees    !== undefined && { degrees: data.degrees }),
      },
    })
    revalidate()
    return { success: true }
  } catch {
    return { error: "Failed to update progression" }
  }
}

export async function deleteUserProgression(
  id: string
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const prog = await db.userProgression.findUnique({ where: { id } })
    if (!prog || prog.userId !== userId) return { error: "Not found" }
    await db.$transaction(async (tx) => {
      await tx.userProgression.delete({ where: { id } })
      const remaining = await tx.userProgression.findMany({
        where: { userId },
        orderBy: { order: "asc" },
        select: { id: true },
      })
      for (let i = 0; i < remaining.length; i++) {
        await tx.userProgression.update({ where: { id: remaining[i].id }, data: { order: i } })
      }
    })
    revalidate()
    return { success: true }
  } catch {
    return { error: "Failed to delete progression" }
  }
}

export async function reorderUserProgressions(
  orderedIds: string[]
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const progs = await db.userProgression.findMany({
      where: { userId, id: { in: orderedIds } },
      select: { id: true },
    })
    if (progs.length !== orderedIds.length) return { error: "Invalid progressions" }
    await db.$transaction(
      orderedIds.map((id, index) =>
        db.userProgression.update({ where: { id }, data: { order: index } })
      )
    )
    revalidatePath("/reference/progressions")
    return { success: true }
  } catch {
    return { error: "Failed to reorder progressions" }
  }
}
