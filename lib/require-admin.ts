import { redirect } from "next/navigation"
import { getIsAdmin } from "@/lib/get-user-id"

/**
 * Call at the top of any server component or server action that requires admin access.
 * Redirects to the home page if the current user is not an admin.
 */
export async function requireAdmin(): Promise<void> {
  const isAdmin = await getIsAdmin()
  if (!isAdmin) redirect("/")
}
