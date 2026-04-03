"use server"

import { revalidatePath } from "next/cache"
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"

async function requireUserId(): Promise<string> {
  const userId = await getUserId()
  if (!userId) throw new Error("Not authenticated")
  return userId
}

function revalidateLibraryPaths(categorySlug?: string) {
  revalidatePath("/library")
  revalidatePath("/library/manage")
  if (categorySlug) revalidatePath(`/library/${categorySlug}`)
}

export async function createUserLesson(
  categoryId: string,
  data: { title: string; url?: string; description?: string; source?: string }
): Promise<{ success: true; id: string } | { error: string }> {
  try {
    const userId = await requireUserId()
    const category = await db.category.findUnique({ where: { id: categoryId } })
    if (!category) return { error: "Category not found" }
    const last = await db.userLesson.findFirst({
      where: { userId, categoryId },
      orderBy: { order: "desc" },
    })
    const order = (last?.order ?? -1) + 1
    const lesson = await db.userLesson.create({
      data: {
        userId,
        categoryId,
        title: data.title,
        url: data.url?.trim() || null,
        description: data.description ?? "",
        source: data.source ?? "",
        order,
      },
    })
    revalidateLibraryPaths(category.slug)
    return { success: true, id: lesson.id }
  } catch {
    return { error: "Failed to create lesson" }
  }
}

export async function updateUserLesson(
  id: string,
  data: { title?: string; url?: string | null; description?: string; source?: string }
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const lesson = await db.userLesson.findUnique({
      where: { id },
      include: { category: true },
    })
    if (!lesson || lesson.userId !== userId) return { error: "Not found" }
    await db.userLesson.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.url !== undefined && { url: data.url }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.source !== undefined && { source: data.source }),
      },
    })
    revalidateLibraryPaths(lesson.category.slug)
    return { success: true }
  } catch {
    return { error: "Failed to update lesson" }
  }
}

export async function deleteUserLesson(
  id: string
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    const lesson = await db.userLesson.findUnique({
      where: { id },
      include: { category: true },
    })
    if (!lesson || lesson.userId !== userId) return { error: "Not found" }
    await db.$transaction(async (tx) => {
      await tx.userLesson.delete({ where: { id } })
      const remaining = await tx.userLesson.findMany({
        where: { userId, categoryId: lesson.categoryId },
        orderBy: { order: "asc" },
      })
      for (let i = 0; i < remaining.length; i++) {
        await tx.userLesson.update({ where: { id: remaining[i].id }, data: { order: i } })
      }
    })
    revalidateLibraryPaths(lesson.category.slug)
    return { success: true }
  } catch {
    return { error: "Failed to delete lesson" }
  }
}

export async function reorderUserLessons(
  categoryId: string,
  orderedIds: string[]
): Promise<{ success: true } | { error: string }> {
  try {
    const userId = await requireUserId()
    await db.$transaction(
      orderedIds.map((id, index) =>
        db.userLesson.update({
          where: { id, userId },
          data: { order: index },
        })
      )
    )
    revalidatePath("/library/manage")
    return { success: true }
  } catch {
    return { error: "Failed to reorder lessons" }
  }
}
