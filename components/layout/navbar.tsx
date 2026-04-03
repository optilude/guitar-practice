import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NavbarClient } from "./navbar-client"

export async function Navbar() {
  const session = await auth()
  let activeGoalTitle: string | null = null

  if (session?.user?.id) {
    const goal = await db.goal.findFirst({
      where: { userId: session.user.id, isActive: true, isArchived: false },
      select: { title: true },
    })
    activeGoalTitle = goal?.title ?? null
  }

  return <NavbarClient activeGoalTitle={activeGoalTitle} />
}
