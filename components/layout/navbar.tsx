import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { NavbarClient } from "./navbar-client"

export async function Navbar() {
  const userId = await getUserId()
  let activeGoalTitle: string | null = null

  if (userId) {
    const goal = await db.goal.findFirst({
      where: { userId, isActive: true, isArchived: false },
      select: { title: true },
    })
    activeGoalTitle = goal?.title ?? null
  }

  return <NavbarClient activeGoalTitle={activeGoalTitle} />
}
