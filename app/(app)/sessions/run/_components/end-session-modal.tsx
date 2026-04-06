"use client"

import { useState } from "react"
import { format, differenceInMinutes, parseISO } from "date-fns"

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
                onClick={() => setShowDiscardConfirm(false)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onDiscardSession}
                className="px-4 py-2 rounded-md bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors"
              >
                Discard session
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
                onClick={onCancel}
                disabled={isSaving}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowDiscardConfirm(true)}
                disabled={isSaving}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                Discard session
              </button>
              <button
                onClick={() => onSave(finalNotes)}
                disabled={isSaving}
                className="px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save session"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
