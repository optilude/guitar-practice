import Link from "next/link"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params

  const data = await db.category.findUnique({
    where: { slug: category },
    include: { topics: { orderBy: { order: "asc" }, include: { source: true } } },
  })

  if (!data) return notFound()

  return (
    <div className="pt-6">
      <Link
        href="/library"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
      >
        ← Library
      </Link>
      <h1 className="text-2xl font-semibold text-foreground mb-6">{data.name}</h1>
      <ul className="space-y-1">
        {data.topics.map((topic) => (
          <li key={topic.id}>
            <a
              href={topic.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between py-2 text-base text-foreground hover:text-muted-foreground transition-colors"
            >
              <span>{topic.title}</span>
              <span className="flex items-center gap-2 ml-4 flex-shrink-0">
                <span className="text-xs text-muted-foreground border border-border px-1.5 py-0.5 rounded">
                  {topic.source.name}
                </span>
                <span className="text-muted-foreground">↗</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
