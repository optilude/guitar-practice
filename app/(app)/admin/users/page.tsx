import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/require-admin"
import { getUserId } from "@/lib/get-user-id"
import { setAdmin } from "./actions"
import { DeleteUserForm } from "./delete-user-form"

export default async function AdminUsersPage() {
  await requireAdmin()

  const [users, currentUserId] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, isAdmin: true, mustChangePassword: true, createdAt: true },
    }),
    getUserId(),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">User Management</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Name</th>
              <th className="pb-2 pr-4 font-medium">Email</th>
              <th className="pb-2 pr-4 font-medium">Role</th>
              <th className="pb-2 pr-4 font-medium">Joined</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-border/50">
                <td className="py-2 pr-4">{user.name ?? "—"}</td>
                <td className="py-2 pr-4 text-muted-foreground">{user.email}</td>
                <td className="py-2 pr-4">
                  {user.isAdmin ? "Admin" : "User"}
                  {user.mustChangePassword && (
                    <span className="ml-2 text-xs text-amber-500">(must change pw)</span>
                  )}
                </td>
                <td className="py-2 pr-4 text-muted-foreground">
                  {user.createdAt.toLocaleDateString()}
                </td>
                <td className="py-2">
                  {user.id !== currentUserId && (
                    <div className="flex items-center gap-3">
                      <form action={setAdmin.bind(null, user.id, !user.isAdmin)}>
                        <button type="submit" className="text-xs text-accent hover:underline">
                          {user.isAdmin ? "Remove admin" : "Make admin"}
                        </button>
                      </form>
                      <DeleteUserForm userId={user.id} email={user.email} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
