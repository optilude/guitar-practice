import Link from "next/link"
import { notFound } from "next/navigation"
import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { ProgressionForm } from "../../_components/progression-form"

interface EditProgressionPageProps {
  params: Promise<{ id: string }>
}

export default async function EditProgressionPage({ params }: EditProgressionPageProps) {
  const { id } = await params
  const userId = await getUserId()
  if (!userId) notFound()

  const prog = await db.userProgression.findUnique({ where: { id } })
  if (!prog || prog.userId !== userId) notFound()

  return (
    <div className="pt-6">
      <Link
        href="/reference/progressions"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
      >
        ← My Progressions
      </Link>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Edit progression</h1>
      <ProgressionForm
        initialData={{
          id: prog.id,
          displayName: prog.displayName,
          description: prog.description,
          mode: prog.mode,
          degrees: prog.degrees,
        }}
      />
    </div>
  )
}
