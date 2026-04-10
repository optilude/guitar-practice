import { NavbarClient } from "./navbar-client"
import { getIsAdmin } from "@/lib/get-user-id"

export async function Navbar() {
  const isAdmin = await getIsAdmin()
  return <NavbarClient isAdmin={isAdmin} />
}
