import { requireAdmin } from "@/lib/require-admin"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return <>{children}</>
}
