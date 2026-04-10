"use client"

import { useState, useTransition } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { Dialog } from "@base-ui/react/dialog"
import { cn } from "@/lib/utils"
import { btn } from "@/lib/button-styles"
import { updateName, deleteAccount } from "./actions"
import { changePassword } from "@/app/(auth)/change-password/actions"

type Step = "idle" | "confirm1" | "confirm2"
type Message = { type: "success" | "error"; text: string }

export function SettingsForm({
  name,
  email,
}: {
  name: string | null
  email: string
}) {
  const { update } = useSession()
  const router = useRouter()

  // Name section
  const [nameValue, setNameValue] = useState(name ?? "")
  const [nameMsg, setNameMsg] = useState<Message | null>(null)
  const [isNamePending, startNameTransition] = useTransition()

  // Password section
  const [passwordMsg, setPasswordMsg] = useState<Message | null>(null)
  const [isPasswordPending, startPasswordTransition] = useTransition()

  // Delete section
  const [step, setStep] = useState<Step>("idle")
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeletePending, startDeleteTransition] = useTransition()

  function handleNameSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setNameMsg(null)
    startNameTransition(async () => {
      const result = await updateName(nameValue, new FormData())
      if ("error" in result) {
        setNameMsg({ type: "error", text: result.error })
      } else {
        setNameMsg({ type: "success", text: "Name updated." })
      }
    })
  }

  function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPasswordMsg(null)
    const fd = new FormData(e.currentTarget)
    startPasswordTransition(async () => {
      const result = await changePassword(fd)
      if ("error" in result) {
        setPasswordMsg({ type: "error", text: result.error })
      } else {
        await update({ mustChangePassword: false })
        setPasswordMsg({ type: "success", text: "Password updated." });
        (e.target as HTMLFormElement).reset()
      }
    })
  }

  function handleDelete() {
    setDeleteError(null)
    startDeleteTransition(async () => {
      const result = await deleteAccount(new FormData())
      if ("error" in result) {
        setDeleteError(result.error)
      } else {
        await signOut({ redirect: false })
        router.push("/login")
      }
    })
  }

  return (
    <div className="space-y-10">

      {/* ── Display name ──────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Display name</h2>
        <form onSubmit={handleNameSubmit} className="space-y-3 max-w-sm">
          <input
            type="text"
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-shadow"
          />
          {nameMsg && (
            <p className={cn("text-xs", nameMsg.type === "error" ? "text-destructive" : "text-green-600 dark:text-green-400")}>
              {nameMsg.text}
            </p>
          )}
          <button type="submit" disabled={isNamePending} className={btn("primary", "sm")}>
            {isNamePending ? "Saving…" : "Save"}
          </button>
        </form>
      </section>

      <hr className="border-border" />

      {/* ── Password ──────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Password</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-3 max-w-sm">
          <div className="space-y-1.5">
            <label className="block text-xs text-muted-foreground">Current password</label>
            <input
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-shadow"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs text-muted-foreground">New password</label>
            <input
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-shadow"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs text-muted-foreground">Confirm new password</label>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-shadow"
            />
          </div>
          {passwordMsg && (
            <p className={cn("text-xs", passwordMsg.type === "error" ? "text-destructive" : "text-green-600 dark:text-green-400")}>
              {passwordMsg.text}
            </p>
          )}
          <button type="submit" disabled={isPasswordPending} className={btn("primary", "sm")}>
            {isPasswordPending ? "Saving…" : "Update password"}
          </button>
        </form>
      </section>

      <hr className="border-border" />

      {/* ── Danger zone ───────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
        <p className="text-xs text-muted-foreground">
          Deleting your account is permanent. All your data will be erased immediately.
        </p>
        <button
          type="button"
          onClick={() => setStep("confirm1")}
          className={btn("destructive", "sm")}
        >
          Delete account
        </button>

        <Dialog.Root
          open={step !== "idle"}
          onOpenChange={open => { if (!open) setStep("idle") }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
            <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-xl">

              {step === "confirm1" && (
                <div className="space-y-4">
                  <Dialog.Title className="text-sm font-semibold">Delete account?</Dialog.Title>
                  <Dialog.Description className="text-sm text-muted-foreground">
                    All your data — goals, practice history, and progressions — will be permanently deleted.
                  </Dialog.Description>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setStep("idle")}
                      className={btn("standalone", "sm")}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep("confirm2")}
                      className={btn("destructive", "sm")}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {step === "confirm2" && (
                <div className="space-y-4">
                  <Dialog.Title className="text-sm font-semibold">Are you really sure?</Dialog.Title>
                  <Dialog.Description className="text-sm text-muted-foreground">
                    This cannot be undone. Your account will be deleted immediately.
                  </Dialog.Description>
                  {deleteError && (
                    <p className="text-xs text-destructive">{deleteError}</p>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setStep("idle")}
                      disabled={isDeletePending}
                      className={btn("standalone", "sm")}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeletePending}
                      className={btn("destructive", "sm")}
                    >
                      {isDeletePending ? "Deleting…" : "Yes, delete my account"}
                    </button>
                  </div>
                </div>
              )}

            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </section>

    </div>
  )
}
