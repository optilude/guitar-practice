import { redirect } from "next/navigation"
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { SettingsForm } from "./settings-form"

export default async function SettingsPage() {
  const userId = await getUserId()
  if (!userId) redirect("/login")

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  })
  if (!user) redirect("/login")

  return (
    <div className="pt-6 max-w-lg">
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">User</p>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Settings</h1>
      <SettingsForm name={user.name} email={user.email} />
    </div>
  )
}
