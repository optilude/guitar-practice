"use server"

import { revalidatePath } from "next/cache"
import { getIsAdmin } from "@/lib/get-user-id"
import { db } from "@/lib/db"

class AuthorizationError extends Error {}

async function requireAdminUser(): Promise<void> {
  const isAdmin = await getIsAdmin()
  if (!isAdmin) throw new AuthorizationError("Not authorized")
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function extractBaseUrl(url: string): string {
  try {
    return new URL(url).origin
  } catch {
    return ""
  }
}

function revalidateLibraryPaths(categorySlug?: string) {
  revalidatePath("/admin/library")
  revalidatePath("/library")
  if (categorySlug) revalidatePath(`/library/${categorySlug}`)
}

export async function createTopic(
  categoryId: string,
  data: { title: string; url: string; description?: string; sourceName: string }
): Promise<{ success: true; id: string } | { error: string }> {
  try {
    await requireAdminUser()
    const category = await db.category.findUnique({ where: { id: categoryId } })
    if (!category) return { error: "Category not found" }
    const source = await db.source.upsert({
      where: { name: data.sourceName },
      update: {},
      create: { name: data.sourceName, baseUrl: extractBaseUrl(data.url) },
    })
    const last = await db.topic.findFirst({
      where: { categoryId },
      orderBy: { order: "desc" },
    })
    const order = (last?.order ?? -1) + 1
    const topic = await db.topic.create({
      data: {
        title: data.title,
        url: data.url,
        slug: slugify(data.title),
        order,
        categoryId,
        sourceId: source.id,
        description: data.description ?? "",
      },
    })
    revalidateLibraryPaths(category.slug)
    return { success: true, id: topic.id }
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Not authorized" }
    return { error: "Failed to create topic" }
  }
}

export async function updateTopic(
  id: string,
  data: { title?: string; url?: string; description?: string; sourceName?: string }
): Promise<{ success: true } | { error: string }> {
  try {
    await requireAdminUser()
    const topic = await db.topic.findUnique({
      where: { id },
      include: { category: true },
    })
    if (!topic) return { error: "Not found" }
    let sourceId: string | undefined
    if (data.sourceName !== undefined) {
      const baseUrl = data.url ? extractBaseUrl(data.url) : extractBaseUrl(topic.url)
      const source = await db.source.upsert({
        where: { name: data.sourceName },
        update: {},
        create: { name: data.sourceName, baseUrl },
      })
      sourceId = source.id
    }
    await db.topic.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title, slug: slugify(data.title) }),
        ...(data.url !== undefined && { url: data.url }),
        ...(data.description !== undefined && { description: data.description }),
        ...(sourceId !== undefined && { sourceId }),
      },
    })
    revalidateLibraryPaths(topic.category.slug)
    return { success: true }
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Not authorized" }
    return { error: "Failed to update topic" }
  }
}

export async function deleteTopic(
  id: string
): Promise<{ success: true } | { error: string }> {
  try {
    await requireAdminUser()
    const topic = await db.topic.findUnique({
      where: { id },
      include: { category: true },
    })
    if (!topic) return { error: "Not found" }
    await db.$transaction(async (tx) => {
      await tx.topic.delete({ where: { id } })
      const remaining = await tx.topic.findMany({
        where: { categoryId: topic.categoryId },
        orderBy: { order: "asc" },
      })
      for (let i = 0; i < remaining.length; i++) {
        await tx.topic.update({ where: { id: remaining[i].id }, data: { order: i } })
      }
    })
    revalidateLibraryPaths(topic.category.slug)
    return { success: true }
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Not authorized" }
    return { error: "Failed to delete topic" }
  }
}

export async function reorderTopics(
  categoryId: string,
  orderedIds: string[]
): Promise<{ success: true } | { error: string }> {
  try {
    await requireAdminUser()
    const topics = await db.topic.findMany({
      where: { categoryId, id: { in: orderedIds } },
    })
    if (topics.length !== orderedIds.length) {
      return { error: "Invalid topics provided" }
    }
    await db.$transaction(
      orderedIds.map((id, index) =>
        db.topic.update({
          where: { id },
          data: { order: index },
        })
      )
    )
    revalidatePath("/admin/library")
    revalidatePath("/library")
    return { success: true }
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Not authorized" }
    return { error: "Failed to reorder topics" }
  }
}
