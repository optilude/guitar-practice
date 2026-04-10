import { readFileSync, existsSync } from "fs"
import { fileURLToPath } from "url"
import { join, dirname } from "path"
import { PrismaClient } from "@/lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import * as dotenv from "dotenv"
import bcrypt from "bcryptjs"
import { urlToCategory, slugToTitle } from "@/lib/seed-helpers"

dotenv.config({ path: ".env.local" })

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

  // Sitemap downloaded from https://hubguitar.com/sitemap.xml — re-download to refresh content
  const xml = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../tmp/hubguitar-sitemap.xml"),
    "utf8"
  )
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1])

  // Load topic ordering produced by scripts/fetch-topic-order.ts.
  // Songs are absent (sorted alphabetically via sitemap order).
  const orderMapPath = join(dirname(fileURLToPath(import.meta.url)), "../tmp/topic-order.json")
  const orderMap: Record<string, string[]> = existsSync(orderMapPath)
    ? JSON.parse(readFileSync(orderMapPath, "utf8"))
    : {}
  if (Object.keys(orderMap).length === 0) {
    console.warn("Warning: tmp/topic-order.json not found — using sitemap order. Run: pnpm tsx scripts/fetch-topic-order.ts")
  }

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

      const categoryCounters = new Map<string, number>()
      for (const url of urls) {
        const catSlug = urlToCategory(url)
        if (!catSlug) continue
        const categoryId = categoryMap.get(catSlug)
        if (!categoryId) throw new Error(`No category ID found for slug "${catSlug}" — check CATEGORIES array matches CATEGORY_MAP`)
        const slug = new URL(url).pathname.split("/").filter(Boolean)[1]
        const title = slugToTitle(slug)
        const counter = (categoryCounters.get(catSlug) ?? 0) + 1
        categoryCounters.set(catSlug, counter)
        const slugList = orderMap[catSlug] as string[] | undefined
        const pos = slugList?.indexOf(slug) ?? -1
        // Known slugs use their position in the curated order (1-based).
        // Unknown slugs (not on HubGuitar's category page) are appended after
        // all known slugs using a high base so they don't displace anything.
        const order = pos >= 0 ? pos + 1 : 10000 + counter
        await tx.topic.upsert({
          where: { url },
          create: { title, url, slug, order, categoryId, sourceId: source.id },
          update: { title, order },
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
