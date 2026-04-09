import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { ReferencePageClient } from "./_components/reference-page-client"
import type { UserProgressionForTab } from "./_components/reference-page-client"

export default async function ReferencePage() {
  const userId = await getUserId()

  const userProgressions: UserProgressionForTab[] = userId
    ? await db.userProgression.findMany({
        where: { userId },
        select: { id: true, displayName: true, mode: true, degrees: true, description: true },
        orderBy: { order: "asc" },
      })
    : []

  return <ReferencePageClient userProgressions={userProgressions} />
}
