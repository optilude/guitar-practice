import Link from "next/link"
import { db } from "@/lib/db"

export default async function LibraryPage() {
  const categories = await db.category.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { topics: true } } },
  })

  return (
    <div className="pt-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Lesson</p>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Library</h1>
      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/library/${cat.slug}`}
            className="block rounded-lg border border-border dark:border-neutral-600 bg-card dark:bg-neutral-800 p-4 hover:bg-muted dark:hover:bg-secondary transition-colors"
          >
            <p className="text-sm font-medium text-foreground">{cat.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {cat._count.topics} topics
            </p>
          </Link>
        ))}
      </div>
      <Link href="/library/manage" className="mt-4 inline-block text-sm text-foreground hover:underline">
        Manage my library →
      </Link>
    </div>
  )
}
