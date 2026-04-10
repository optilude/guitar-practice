import Link from "next/link"
import { Users, BookOpen } from "lucide-react"
import { requireAdmin } from "@/lib/require-admin"
import { type ReactNode } from "react"

const ADMIN_TILES: { href: string; icon: ReactNode; name: string; description: string }[] = [
  {
    href: "/admin/users",
    icon: <Users size={36} strokeWidth={1.5} aria-hidden="true" />,
    name: "User Management",
    description: "Manage user accounts and admin permissions",
  },
  {
    href: "/admin/library",
    icon: <BookOpen size={36} strokeWidth={1.5} aria-hidden="true" />,
    name: "Library Management",
    description: "Add, edit, and reorder standard library topics",
  },
]

export default async function AdminPage() {
  await requireAdmin()
  return (
    <div className="pt-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Admin</p>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Administration</h1>
      <div className="grid grid-cols-2 gap-3">
        {ADMIN_TILES.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="block rounded-lg border border-border dark:border-neutral-600 bg-card dark:bg-neutral-800 p-4 hover:bg-muted dark:hover:bg-secondary transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{tile.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{tile.description}</p>
              </div>
              <div className="text-foreground flex-shrink-0">{tile.icon}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
