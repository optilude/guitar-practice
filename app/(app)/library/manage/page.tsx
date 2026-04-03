import Link from "next/link"
import { notFound } from "next/navigation"
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { UserLessonList } from "./_components/user-lesson-list"

export default async function ManageLibraryPage() {
  const userId = await getUserId()
  if (!userId) notFound()

  const [categories, sourceRows] = await Promise.all([
    db.category.findMany({
      orderBy: { order: "asc" },
      include: {
        userLessons: {
          where: { userId },
          orderBy: { order: "asc" },
        },
      },
    }),
    db.userLesson.findMany({
      where: { userId, NOT: { source: "" } },
      select: { source: true },
      distinct: ["source"],
      orderBy: { source: "asc" },
    }),
  ])

  const sourceOptions = sourceRows.map((r) => r.source)

  return (
    <div className="pt-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
            Library
          </p>
          <h1 className="text-2xl font-semibold text-foreground">Manage my library</h1>
        </div>
        <Link
          href="/library"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to library
        </Link>
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
                Browse standard ↗
              </Link>
            </div>
            <UserLessonList
              categoryId={cat.id}
              categoryName={cat.name}
              initialLessons={cat.userLessons}
              sourceOptions={sourceOptions}
            />
          </section>
        ))}
      </div>
    </div>
  )
}
