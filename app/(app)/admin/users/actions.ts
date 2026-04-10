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

export async function deleteUser(
  userId: string,
  _formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const callerIsAdmin = await getIsAdmin()
  if (!callerIsAdmin) return { error: "Forbidden" }

  const callerId = await getUserId()
  if (callerId === userId) return { error: "You cannot delete your own account" }

  try {
    await db.user.delete({ where: { id: userId } })
  } catch (err) {
    console.error("deleteUser: db.user.delete failed", err)
    return { error: "Failed to delete user. Please try again." }
  }
  revalidatePath("/admin/users")
  return { success: true }
}
