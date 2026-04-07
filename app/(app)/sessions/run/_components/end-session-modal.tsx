"use client"

import { useState } from "react"
import { format, differenceInMinutes, parseISO } from "date-fns"
import { btn } from "@/lib/button-styles"

interface EndSessionModalProps {
  routineTitle: string
  goalTitle: string
  startedAtLocal: string
  notes: string
  onSave: (finalNotes: string) => Promise<void>
  onCancel: () => void
  onDiscardSession: () => void
  isSaving: boolean
}

function formatLocalTime(localStr: string): string {
  return localStr.slice(11, 16)
}

function formatLocalDate(localStr: string): string {
  try {
    return format(parseISO(localStr.slice(0, 10)), "d MMM yyyy")
  } catch {
    return localStr.slice(0, 10)
  }
}

function durationMinutes(start: string, end: string): number {
  try {
    return Math.max(0, differenceInMinutes(
      new Date(end.replace(" ", "T")),
      new Date(start.replace(" ", "T")),
    ))
  } catch {
    return 0
  }
}

export function EndSessionModal({
  routineTitle,
  goalTitle,
  startedAtLocal,
  notes,
  onSave,
  onCancel,
  onDiscardSession,
  isSaving,
}: EndSessionModalProps) {
  const [finalNotes, setFinalNotes] = useState(notes)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const endedAtLocal = format(new Date(), "yyyy-MM-dd HH:mm:ss")
  const dur = durationMinutes(startedAtLocal, endedAtLocal)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-xl border border-border p-6 w-full max-w-md space-y-4 shadow-xl">
        {showDiscardConfirm ? (
          <>
            <h2 className="text-lg font-semibold">Discard this session?</h2>
            <p className="text-sm text-muted-foreground">
              This session will not be saved. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onDiscardSession}
                className={btn("destructive")}
              >
                Discard session
              </button>
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className={btn("secondary")}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold">Save session?</h2>

            <div className="space-y-1">
              <p className="font-medium">{routineTitle}</p>
              <p className="text-sm text-muted-foreground">
                {goalTitle} · {formatLocalDate(startedAtLocal)} · {formatLocalTime(startedAtLocal)} – {endedAtLocal.slice(11, 16)}
              </p>
              <p className="text-sm text-muted-foreground">Duration: {dur} min</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Session notes</p>
              <textarea
                value={finalNotes}
                onChange={(e) => setFinalNotes(e.target.value)}
                placeholder="Note anything useful from this session…"
                className="w-full resize-none rounded-md border border-border bg-card text-foreground text-sm p-3 focus:outline-none focus:ring-1 focus:ring-accent"
                rows={4}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => onSave(finalNotes)}
                disabled={isSaving}
                className={btn("primary")}
              >
                {isSaving ? "Saving…" : "Save session"}
              </button>
              <button
                onClick={() => setShowDiscardConfirm(true)}
                disabled={isSaving}
                className={btn("destructive")}
              >
                Discard session
              </button>
              <button
                onClick={onCancel}
                disabled={isSaving}
                className={btn("secondary")}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
