import { NavbarClient } from "./navbar-client"
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"

export async function Navbar() {
  const userId = await getUserId()
  const user = userId
    ? await db.user.findUnique({
        where: { id: userId },
        select: { name: true, isAdmin: true },
      })
    : null
  return (
    <NavbarClient
      isAdmin={user?.isAdmin ?? false}
      userName={user?.name ?? null}
    />
  )
}
