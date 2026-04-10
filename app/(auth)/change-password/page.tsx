"use client"

import { useState, useTransition } from "react"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { changePassword } from "./actions"

export default function ChangePasswordPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await changePassword(formData)
      if ("error" in result) {
        setError(result.error)
      } else {
        // Clear the session so the next sign-in gets a fresh JWT without mustChangePassword
        await signOut({ redirect: false })
        router.push("/login?passwordChanged=1")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-6 text-center space-y-1">
        <h1 className="text-sm font-semibold text-foreground">Set a new password</h1>
        <p className="text-xs text-muted-foreground">You must change your password before continuing.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="currentPassword" className="block text-xs uppercase tracking-widest text-muted-foreground">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-shadow"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="newPassword" className="block text-xs uppercase tracking-widest text-muted-foreground">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-shadow"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="block text-xs uppercase tracking-widest text-muted-foreground">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-shadow"
        />
      </div>

      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {isPending ? "Saving…" : "Set new password"}
      </button>
    </form>
  )
}
