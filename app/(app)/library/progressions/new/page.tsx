import Link from "next/link"
import { notFound } from "next/navigation"
import { getUserId } from "@/lib/get-user-id"
import { ProgressionForm } from "../_components/progression-form"

export default async function NewProgressionPage() {
  const userId = await getUserId()
  if (!userId) notFound()

  return (
    <div className="pt-6">
      <Link
        href="/library/progressions"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
      >
        ← My Progressions
      </Link>
      <h1 className="text-2xl font-semibold text-foreground mb-6">New progression</h1>
      <ProgressionForm />
    </div>
  )
}
