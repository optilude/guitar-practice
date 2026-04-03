"use client"

import { useState, useEffect, useRef } from "react"
import { getUserGoals, addTopicToGoal } from "@/app/(app)/goals/actions"
import type { TopicKind } from "@/lib/generated/prisma/enums"

interface AddToGoalButtonProps {
  kind: TopicKind
  subtype?: string
  defaultKey?: string
  lessonId?: string
  displayName: string
  popupAlign?: "left" | "right"
}

export function AddToGoalButton({
  kind,
  subtype,
  defaultKey,
  lessonId,
  displayName,
  popupAlign = "left",
}: AddToGoalButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [goals, setGoals] = useState<{ id: string; title: string; isActive: boolean }[]>([])
  const [selectedGoalId, setSelectedGoalId] = useState<string>("")
  const [status, setStatus] = useState<"idle" | "loading" | "added" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handlePointerDown(e: PointerEvent) {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false)
    }
    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  async function handleOpen() {
    setIsOpen(true)
    setStatus("loading")
    setErrorMsg(null)
    const fetched = await getUserGoals()
    setGoals(fetched)
    const active = fetched.find((g) => g.isActive)
    setSelectedGoalId(active?.id ?? fetched[0]?.id ?? "")
    setStatus("idle")
  }

  async function handleAdd() {
    if (!selectedGoalId) return
    setStatus("loading")
    const result = await addTopicToGoal(selectedGoalId, {
      kind,
      subtype,
      lessonId,
      defaultKey,
    })
    if ("error" in result) {
      setStatus("error")
      setErrorMsg(result.error)
    } else {
      setStatus("added")
      setTimeout(() => {
        setIsOpen(false)
        setStatus("idle")
      }, 1200)
    }
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        aria-label="Add to goal"
        onClick={handleOpen}
        className="flex items-center justify-center w-6 h-6 rounded-full border border-border text-muted-foreground hover:text-accent hover:border-accent transition-colors text-sm font-semibold select-none"
      >
        +
      </button>

      {isOpen && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-label="Add to goal"
          className={`absolute ${popupAlign === "right" ? "right-0" : "left-0"} top-8 z-30 w-72 rounded-lg border border-border bg-card shadow-lg p-4 space-y-3`}
        >
          <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>

          {status === "added" ? (
            <p className="text-xs text-accent font-semibold">Added to goal!</p>
          ) : goals.length === 0 && status !== "loading" ? (
            <p className="text-xs text-muted-foreground">
              No goals yet.{" "}
              <a href="/goals" className="text-accent hover:underline">
                Create your first goal
              </a>
            </p>
          ) : (
            <>
              <div>
                <label
                  htmlFor="add-to-goal-select"
                  className="block text-xs uppercase tracking-widest text-muted-foreground mb-1"
                >
                  Goal
                </label>
                <select
                  id="add-to-goal-select"
                  value={selectedGoalId}
                  onChange={(e) => setSelectedGoalId(e.target.value)}
                  disabled={status === "loading"}
                  className="w-full rounded border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}{g.isActive ? " (active)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {defaultKey && (
                <p className="text-xs text-muted-foreground">Default key: {defaultKey}</p>
              )}

              {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}

              <button
                type="button"
                onClick={handleAdd}
                disabled={!selectedGoalId || status === "loading"}
                className="w-full text-xs font-semibold bg-accent text-accent-foreground px-3 py-1.5 rounded hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {status === "loading" ? "Adding…" : "Add to goal"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
