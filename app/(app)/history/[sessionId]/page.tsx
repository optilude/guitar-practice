import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import { DeleteSessionButton } from "./_components/delete-session-button"
import { format, parseISO } from "date-fns"

const SECTION_TYPE_LABELS: Record<string, string> = {
  warmup: "Warm Up",
  technique: "Technique",
  muscle_memory: "Muscle Memory",
  theory: "Theory",
  lessons: "Lessons",
  songs: "Songs",
  free_practice: "Free Practice",
}

const SECTION_TYPE_COLORS: Record<string, string> = {
  warmup: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  technique: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  muscle_memory: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  theory: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  lessons: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  songs: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
  free_practice: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ")
}

function formatDuration(start: string, end: string): string {
  try {
    const diff = new Date(end.replace(" ", "T")).getTime() - new Date(start.replace(" ", "T")).getTime()
    const min = Math.round(diff / 60000)
    return `${min} min`
  } catch { return "" }
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  const userId = await getUserId()
  if (!userId) notFound()

  const session = await db.practiceSession.findUnique({
    where: { id: sessionId },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: { topics: true },
      },
    },
  })

  if (!session || session.userId !== userId) notFound()

  let formattedDate = session.localDate
  try {
    formattedDate = format(parseISO(session.localDate), "d MMMM yyyy")
  } catch { /* keep as-is */ }

  return (
    <div className="pt-6 max-w-2xl">
      <Link
        href="/history"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        ← Back to History
      </Link>

      <h1 className="text-2xl font-semibold mb-1">{session.routineTitle}</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {session.goalTitle} · {formattedDate} · {session.startedAtLocal.slice(11, 16)} – {session.endedAtLocal.slice(11, 16)}
        {" "}({formatDuration(session.startedAtLocal, session.endedAtLocal)})
      </p>

      <div className="space-y-4 mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Sections</p>
        {session.sections.map((s, i) => (
          <div key={s.id} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{i + 1}. {s.title}</span>
              <span className="text-xs text-muted-foreground">({s.durationMinutes} min)</span>
              <span className={cn("text-xs px-1.5 py-0.5 rounded", SECTION_TYPE_COLORS[s.type])}>
                {SECTION_TYPE_LABELS[s.type] ?? s.type}
              </span>
            </div>
            {s.topics.map((t) => (
              <p key={t.id} className="text-sm text-muted-foreground ml-4">
                {t.displayName}
                {t.keys.length > 0 && t.keys[0] !== "*" && (
                  <> · Keys: {t.keys.join(", ")}</>
                )}
                {t.keys[0] === "*" && t.practiceMode && (
                  <> · All 12 keys ({t.practiceMode.replace(/_/g, " ")})</>
                )}
              </p>
            ))}
            {s.topics.length === 0 && (
              <p className="text-sm text-muted-foreground ml-4 italic">(no topic)</p>
            )}
          </div>
        ))}
      </div>

      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Notes</p>
        {session.notes ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{session.notes}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">(no notes recorded)</p>
        )}
      </div>

      <DeleteSessionButton sessionId={session.id} />
    </div>
  )
}
