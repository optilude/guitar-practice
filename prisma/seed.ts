import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { join, dirname } from "path"
import { PrismaClient } from "@/lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import * as dotenv from "dotenv"
import { urlToCategory, slugToTitle } from "@/lib/seed-helpers"

dotenv.config({ path: ".env.local" })

const CATEGORIES = [
  { slug: "fretboard-knowledge", name: "Fretboard Knowledge", order: 1 },
  { slug: "music-theory",        name: "Music Theory",        order: 2 },
  { slug: "improvisation",       name: "Improvisation",       order: 3 },
  { slug: "technique",           name: "Technique",           order: 4 },
  { slug: "ear-training",        name: "Ear Training",        order: 5 },
  { slug: "sight-reading",       name: "Sight Reading",       order: 6 },
  { slug: "songs",               name: "Songs",               order: 7 },
]

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  // Sitemap downloaded from https://hubguitar.com/sitemap.xml — re-download to refresh content
  const xml = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../tmp/hubguitar-sitemap.xml"),
    "utf8"
  )
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1])

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

      for (const url of urls) {
        const catSlug = urlToCategory(url)
        if (!catSlug) continue
        const categoryId = categoryMap.get(catSlug)
        if (!categoryId) throw new Error(`No category ID found for slug "${catSlug}" — check CATEGORIES array matches CATEGORY_MAP`)
        const slug = new URL(url).pathname.split("/").filter(Boolean)[1]
        const title = slugToTitle(slug)
        await tx.topic.upsert({
          where: { url },
          create: { title, url, slug, categoryId, sourceId: source.id },
          update: { title },
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
