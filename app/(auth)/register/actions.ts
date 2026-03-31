"use server"

import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

export async function createUser(formData: FormData): Promise<
  { success: true } | { error: string }
> {
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return { error: "An account with this email already exists" }
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await db.user.create({
    data: { name, email, passwordHash },
  })

  return { success: true }
}
