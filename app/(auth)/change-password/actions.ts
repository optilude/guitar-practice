"use server"

import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { getUserId } from "@/lib/get-user-id"

export async function changePassword(
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const userId = await getUserId()
  if (!userId) return { error: "Not authenticated" }

  const currentPassword = formData.get("currentPassword") as string
  const newPassword = formData.get("newPassword") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (newPassword !== confirmPassword) return { error: "Passwords do not match" }
  if (newPassword.length < 8) return { error: "Password must be at least 8 characters" }

  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return { error: "User not found" }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) return { error: "Current password is incorrect" }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await db.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false },
  })

  return { success: true }
}
