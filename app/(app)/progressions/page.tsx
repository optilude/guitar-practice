import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { ProgressionsPageClient } from "./_components/progressions-page-client"
import type { UserProgressionForTab } from "@/app/(app)/reference/_components/reference-page-client"

export default async function ProgressionsPage() {
  const userId = await getUserId()

  const userProgressions: UserProgressionForTab[] = userId
    ? await db.userProgression.findMany({
        where: { userId },
        orderBy: { order: "asc" },
        select: { id: true, displayName: true, mode: true, degrees: true, description: true },
      })
    : []

  return <ProgressionsPageClient userProgressions={userProgressions} />
}
