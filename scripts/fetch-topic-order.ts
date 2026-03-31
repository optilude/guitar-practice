/**
 * Fetches each HubGuitar category page and extracts the ordered list of lesson slugs
 * from the embedded RSC payload. Writes tmp/topic-order.json which the seed script
 * reads to assign correct topic ordering.
 *
 * Usage: pnpm tsx scripts/fetch-topic-order.ts
 *
 * Re-run whenever HubGuitar updates their curriculum order.
 * Songs are intentionally excluded — they are always sorted alphabetically.
 */

import { execSync } from "child_process"
import { writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

// Pages to fetch and which app category their slugs belong to.
// Technique and rhythm both map to the "technique" app category,
// with technique page slugs first.
const PAGES: { url: string; category: string }[] = [
  { url: "https://hubguitar.com/technique",    category: "technique" },
  { url: "https://hubguitar.com/rhythm",        category: "technique" },
  { url: "https://hubguitar.com/fretboard",     category: "fretboard-knowledge" },
  { url: "https://hubguitar.com/sight-reading", category: "sight-reading" },
  { url: "https://hubguitar.com/improvisation", category: "improvisation" },
  { url: "https://hubguitar.com/music-theory",  category: "music-theory" },
]

function fetchSlugs(url: string): string[] {
  console.log(`Fetching ${url}...`)
  const html = execSync(`curl -s -A "${UA}" "${url}"`, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  })
  const match = html.match(/\\"pages\\":\[(.*?)\]/)
  if (!match) throw new Error(`No "pages" array found in RSC payload for ${url}`)
  return match[1]
    .split(",")
    .map((s) => s.replace(/\\"/g, ""))
    .filter(Boolean)
}

const orderMap: Record<string, string[]> = {}

for (const { url, category } of PAGES) {
  const slugs = fetchSlugs(url)
  orderMap[category] = [...(orderMap[category] ?? []), ...slugs]
}

const outPath = join(dirname(fileURLToPath(import.meta.url)), "../tmp/topic-order.json")
writeFileSync(outPath, JSON.stringify(orderMap, null, 2))

console.log(`\nWritten to tmp/topic-order.json:`)
for (const [cat, slugs] of Object.entries(orderMap)) {
  console.log(`  ${cat}: ${slugs.length} slugs`)
}
