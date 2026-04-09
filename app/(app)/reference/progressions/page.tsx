import Link from "next/link"
import { notFound } from "next/navigation"
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
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
      <div className="mb-6">
        <Link
          href="/reference"
          className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
        >
          ← Reference
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">My progressions</h1>
      </div>

      <UserProgressionList initialProgressions={progressions} />

      <Link
        href="/reference/progressions/new"
        className="mt-2 flex w-full items-center justify-center text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg py-2 hover:border-foreground/40 transition-colors"
      >
        + New progression
      </Link>
    </div>
  )
}
