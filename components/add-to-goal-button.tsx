"use client"

import { useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { getUserGoalsWithStatus, addTopicToGoal } from "@/app/(app)/goals/actions"
import { computeRefKey } from "@/lib/goals"
import { useActiveGoal } from "@/components/active-goal-context"
import { btn } from "@/lib/button-styles"
import type { TopicKind } from "@/lib/generated/prisma/enums"

interface AddToGoalButtonProps {
  kind: TopicKind
  subtype?: string
  defaultKey?: string
  lessonId?: string
  userLessonId?: string
  userProgressionId?: string
  displayName: string
  popupAlign?: "left" | "right" // retained for call-site compatibility; ignored (modal is centred)
}

export function AddToGoalButton({
  kind,
  subtype,
  defaultKey,
  lessonId,
  userLessonId,
  userProgressionId,
  displayName,
}: AddToGoalButtonProps) {
  const refKey = computeRefKey({ kind, subtype, lessonId, userLessonId, userProgressionId, defaultKey })
  const { activeGoalKeys, markAdded } = useActiveGoal()
  const isAddedToActive = activeGoalKeys.has(refKey)

  const [isOpen, setIsOpen] = useState(false)
  const [goals, setGoals] = useState<
    { id: string; title: string; isActive: boolean; alreadyAdded: boolean }[]
  >([])
  const [selectedGoalId, setSelectedGoalId] = useState<string>("")
  const [status, setStatus] = useState<"idle" | "loading" | "added" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleOpen() {
    setIsOpen(true)
    setStatus("loading")
    setErrorMsg(null)
    const fetched = await getUserGoalsWithStatus(refKey)
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
      userLessonId,
      userProgressionId,
      defaultKey,
    })
    if ("error" in result) {
      setStatus("error")
      setErrorMsg(result.error)
    } else {
      const selectedGoal = goals.find((g) => g.id === selectedGoalId)
      if (selectedGoal?.isActive) markAdded(refKey)
      setStatus("added")
      setTimeout(() => {
        setIsOpen(false)
        setStatus("idle")
      }, 1200)
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open && status !== "loading") {
      setIsOpen(false)
      setStatus("idle")
      setErrorMsg(null)
    }
  }

  const selectedGoal = goals.find((g) => g.id === selectedGoalId)
  const selectedAlreadyAdded = selectedGoal?.alreadyAdded ?? false

  return (
    <>
      <button
        type="button"
        aria-label="Add to goal"
        onClick={handleOpen}
        className={
          isAddedToActive
            ? "flex items-center justify-center w-6 h-6 rounded-full border transition-colors text-sm font-semibold select-none border-muted-foreground/40 text-muted-foreground/60 hover:text-accent hover:border-accent"
            : "flex items-center justify-center w-6 h-6 rounded-full border border-muted-foreground/50 text-muted-foreground hover:text-accent hover:border-accent transition-colors text-sm font-semibold select-none"
        }
      >
        <span className="relative -top-px">+</span>
      </button>

      <Dialog.Root open={isOpen} onOpenChange={handleOpenChange} disablePointerDismissal={status === "loading"}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-[51] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-xl transition duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0">
            <div className="space-y-4">
              <div>
                <Dialog.Title className="text-sm font-semibold">Add to goal</Dialog.Title>
                <Dialog.Description className="text-sm text-muted-foreground truncate mt-0.5">
                  {displayName}
                </Dialog.Description>
              </div>

              {status === "added" ? (
                <p className="text-sm text-accent font-semibold">Added to goal!</p>
              ) : goals.length === 0 && status !== "loading" ? (
                <p className="text-sm text-muted-foreground">
                  No goals yet.{" "}
                  <a href="/goals" className="text-accent hover:underline">
                    Create your first goal
                  </a>
                </p>
              ) : (
                <div className="space-y-3">
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

                  {selectedAlreadyAdded && (
                    <p className="text-xs text-muted-foreground italic">Already in this goal</p>
                  )}
                  {errorMsg && (
                    <p className="text-xs text-destructive">{errorMsg}</p>
                  )}
                </div>
              )}

              {status !== "added" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={selectedAlreadyAdded || !selectedGoalId || status === "loading" || goals.length === 0}
                    className={btn("primary")}
                  >
                    {status === "loading" ? "Adding…" : "Add"}
                  </button>
                  <Dialog.Close disabled={status === "loading"} className={btn("standalone")}>
                    Cancel
                  </Dialog.Close>
                </div>
              )}
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
