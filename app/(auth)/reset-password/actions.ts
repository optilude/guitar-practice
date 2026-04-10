"use server"

import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

export async function validateResetToken(
  token: string,
): Promise<{ valid: true; userId: string } | { valid: false }> {
  const record = await db.passwordResetToken.findUnique({ where: { token } })
  if (!record || record.expiresAt < new Date()) return { valid: false }
  return { valid: true, userId: record.userId }
}

export async function resetPassword(
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const token = formData.get("token")
  const newPassword = formData.get("newPassword")
  const confirmPassword = formData.get("confirmPassword")

  if (typeof token !== "string" || typeof newPassword !== "string" || typeof confirmPassword !== "string") {
    return { error: "Invalid request" }
  }

  if (newPassword !== confirmPassword) return { error: "Passwords do not match" }
  if (newPassword.length < 8) return { error: "Password must be at least 8 characters" }

  const record = await db.passwordResetToken.findUnique({ where: { token } })
  if (!record || record.expiresAt < new Date()) return { error: "Invalid or expired reset link" }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    db.passwordResetToken.delete({ where: { token } }),
  ])

  return { success: true }
}
