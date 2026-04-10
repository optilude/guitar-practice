"use server"

import crypto from "crypto"
import { db } from "@/lib/db"
import { sendEmail } from "@/lib/email"

export async function requestPasswordReset(
  formData: FormData,
): Promise<{ success: true }> {
  const email = formData.get("email")
  if (typeof email !== "string" || !email) return { success: true }

  const user = await db.user.findUnique({ where: { email } })
  // Always return success — prevents email enumeration
  if (!user) return { success: true }

  // Delete any existing tokens for this user before creating a new one
  await db.passwordResetToken.deleteMany({ where: { userId: user.id } })

  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await db.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const resetUrl = `${appUrl}/reset-password?token=${token}`

  try {
    await sendEmail({
      to: email,
      subject: "Reset your Guitar Practice password",
      html: `
        <p>You requested a password reset for your Guitar Practice account.</p>
        <p>Click the link below to set a new password. This link expires in 1 hour.</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
    })
  } catch {
    console.error("[password-reset] email delivery failed for userId", user.id)
  }

  return { success: true }
}
