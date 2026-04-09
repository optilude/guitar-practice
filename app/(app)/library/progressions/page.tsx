import Link from "next/link"
import { notFound } from "next/navigation"
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { btn } from "@/lib/button-styles"
import { UserProgressionList } from "./_components/user-progression-list"

export default async function UserProgressionsPage() {
  const userId = await getUserId()
  if (!userId) notFound()

  const progressions = await db.userProgression.findMany({
    where: { userId },
    orderBy: { order: "asc" },
  })

  return (
    <div className="pt-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/reference"
            className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            ← Reference
          </Link>
          <h1 className="text-2xl font-semibold text-foreground">My Progressions</h1>
        </div>
        <Link href="/library/progressions/new" className={btn("primary")}>
          New progression
        </Link>
      </div>

      <UserProgressionList initialProgressions={progressions} />
    </div>
  )
}
