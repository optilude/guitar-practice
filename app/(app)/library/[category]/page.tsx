import Link from "next/link"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { getUserId } from "@/lib/get-user-id"
import { CategoryTabs } from "./_components/category-tabs"

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

  const userId = await getUserId()
  const userLessons = userId
    ? await db.userLesson.findMany({
        where: { userId, categoryId: data.id },
        orderBy: { order: "asc" },
      })
    : []

  // Add empty description for topics that predate this field (TypeScript safety)
  const standardTopics = data.topics.map((t) => ({
    ...t,
    description: (t as any).description ?? "",
  }))

  return (
    <div className="pt-6">
      <Link
        href="/library"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
      >
        ← Library
      </Link>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">{data.name}</h1>
        <Link
          href={`/library/manage#${data.slug}`}
          className="text-xs text-accent hover:underline"
        >
          Manage my library ↗
        </Link>
      </div>
      <CategoryTabs standardTopics={standardTopics} userLessons={userLessons} />
    </div>
  )
}
