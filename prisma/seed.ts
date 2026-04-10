import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { join, dirname } from "path"
import { PrismaClient } from "@/lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import * as dotenv from "dotenv"
import bcrypt from "bcryptjs"

dotenv.config({ path: ".env.local" })

type Lesson = { url: string; slug: string; title: string; category: string; order: number }

const CATEGORIES = [
  { slug: "fretboard-knowledge", name: "Fretboard Knowledge", order: 1 },
  { slug: "music-theory",        name: "Music Theory",        order: 2 },
  { slug: "improvisation",       name: "Improvisation",       order: 3 },
  { slug: "technique",           name: "Technique",           order: 4 },
  { slug: "sight-reading",       name: "Sight Reading",       order: 5 },
  { slug: "songs",               name: "Songs",               order: 6 },
]

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  // Idempotently create a default admin user
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com"
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(
      process.env.SEED_ADMIN_PASSWORD ?? "changeme123",
      12,
    )
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Admin",
        passwordHash,
        isAdmin: true,
        mustChangePassword: true,
      },
    })
    console.log(`Created default admin: ${adminEmail} (must change password on first login)`)
  } else {
    console.log(`Admin user already exists: ${adminEmail}`)
  }

  // Static lesson data — pre-built from the HubGuitar sitemap and curated topic ordering.
  // To refresh this file (e.g. after HubGuitar adds new lessons), see README.
  const lessons: Lesson[] = JSON.parse(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), "data/lessons.json"), "utf8")
  )

  try {
    let count = 0
    await prisma.$transaction(async (tx) => {
      const source = await tx.source.upsert({
        where: { name: "HubGuitar" },
        create: { name: "HubGuitar", baseUrl: "https://hubguitar.com" },
        update: {},
      })

      const categoryMap = new Map<string, string>()
      for (const cat of CATEGORIES) {
        const record = await tx.category.upsert({
          where: { slug: cat.slug },
          create: cat,
          update: { name: cat.name, order: cat.order },
        })
        categoryMap.set(cat.slug, record.id)
      }

      for (const lesson of lessons) {
        const categoryId = categoryMap.get(lesson.category)
        if (!categoryId) throw new Error(`Unknown category "${lesson.category}" in lessons.json`)
        await tx.topic.upsert({
          where: { url: lesson.url },
          create: { title: lesson.title, url: lesson.url, slug: lesson.slug, order: lesson.order, categoryId, sourceId: source.id },
          update: { title: lesson.title, order: lesson.order },
        })
        count++
      }
    })
    console.log(`Seeded ${count} topics across ${CATEGORIES.length} categories`)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
