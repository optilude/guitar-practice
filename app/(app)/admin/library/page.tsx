import Link from "next/link"
import { requireAdmin } from "@/lib/require-admin"
import { db } from "@/lib/db"
import { TopicList } from "./_components/topic-list"

export default async function AdminLibraryPage() {
  await requireAdmin()

  const categories = await db.category.findMany({
    orderBy: { order: "asc" },
    include: {
      topics: {
        orderBy: { order: "asc" },
        include: { source: true },
      },
    },
  })

  return (
    <div className="pt-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
        >
          ← Admin
        </Link>
        <h1 className="text-2xl font-semibold text-foreground mb-6">Manage standard library</h1>
      </div>

      <div className="space-y-10">
        {categories.map((cat) => (
          <section key={cat.id} id={cat.slug}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-foreground">{cat.name}</h2>
              <Link
                href={`/library/${cat.slug}`}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View public →
              </Link>
            </div>
            <TopicList
              categoryId={cat.id}
              categoryName={cat.name}
              initialTopics={cat.topics}
            />
          </section>
        ))}
      </div>
    </div>
  )
}
