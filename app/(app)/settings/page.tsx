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
    <div className="max-w-lg space-y-8">
      <h1 className="text-lg font-semibold">Settings</h1>
      <SettingsForm name={user.name} email={user.email} />
    </div>
  )
}
