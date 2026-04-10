/**
 * Reset the admin account password and force a password change on next login.
 *
 * Usage:
 *   pnpm db:reset-admin-password
 *
 * Reads SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD from .env.local.
 * If the account does not exist, exits with an error — run db:seed first.
 */
import { PrismaClient } from "@/lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import * as dotenv from "dotenv"
import bcrypt from "bcryptjs"

dotenv.config({ path: ".env.local" })

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com"
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "changeme123"

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    const user = await prisma.user.findUnique({ where: { email: adminEmail } })
    if (!user) {
      console.error(`No user found with email ${adminEmail}. Run pnpm db:seed first.`)
      process.exit(1)
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12)
    await prisma.user.update({
      where: { email: adminEmail },
      data: { passwordHash, mustChangePassword: true },
    })

    console.log(`Password reset for ${adminEmail}. mustChangePassword=true.`)
    console.log("The admin must set a new password on their next login.")
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
