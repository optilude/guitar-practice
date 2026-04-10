"use server"

import { db } from "@/lib/db"
import { getUserId } from "@/lib/get-user-id"
import { revalidatePath } from "next/cache"

export async function updateName(
  name: string,
  _fd: FormData,
): Promise<{ success: true } | { error: string }> {
  const userId = await getUserId()
  if (!userId) return { error: "Not authenticated" }

  const trimmed = name.trim()
  if (!trimmed) return { error: "Name is required" }

  try {
    await db.user.update({ where: { id: userId }, data: { name: trimmed } })
  } catch (err) {
    console.error("updateName: db.user.update failed", err)
    return { error: "Failed to update name. Please try again." }
  }
  revalidatePath("/", "layout")
  return { success: true }
}

export async function deleteAccount(
  _fd: FormData,
): Promise<{ success: true } | { error: string }> {
  const userId = await getUserId()
  if (!userId) return { error: "Not authenticated" }

  try {
    await db.user.delete({ where: { id: userId } })
  } catch (err) {
    console.error("deleteAccount: db.user.delete failed", err)
    return { error: "Failed to delete account. Please try again." }
  }
  return { success: true }
}
