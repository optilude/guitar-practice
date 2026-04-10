"use server"

import { db } from "@/lib/db"
import { getIsAdmin, getUserId } from "@/lib/get-user-id"
import { revalidatePath } from "next/cache"

export async function setAdmin(
  userId: string,
  isAdmin: boolean,
  _formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const callerIsAdmin = await getIsAdmin()
  if (!callerIsAdmin) return { error: "Forbidden" }

  const callerId = await getUserId()
  if (callerId === userId && !isAdmin) {
    return { error: "You cannot remove your own admin status" }
  }

  try {
    await db.user.update({ where: { id: userId }, data: { isAdmin } })
  } catch (err) {
    console.error("setAdmin: db.user.update failed", err)
    return { error: "Failed to update user. Please try again." }
  }
  revalidatePath("/admin/users")
  return { success: true }
}
