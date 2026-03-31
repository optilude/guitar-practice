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
    include: { topics: { orderBy: { title: "asc" } } },
  })

  if (!data) notFound()

  return (
    <div className="pt-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
        Library
      </p>
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
              <span className="text-muted-foreground ml-4 flex-shrink-0">↗</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
