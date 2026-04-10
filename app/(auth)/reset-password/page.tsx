"use client"

import { useState, useTransition, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { validateResetToken, resetPassword } from "./actions"

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token") ?? ""

  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!token) { setTokenValid(false); return }
    validateResetToken(token).then(result => setTokenValid(result.valid))
  }, [token])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set("token", token)

    startTransition(async () => {
      const result = await resetPassword(formData)
      if ("error" in result) {
        setError(result.error)
      } else {
        router.push("/login?passwordChanged=1")
      }
    })
  }

  if (tokenValid === null) {
    return <p className="text-xs text-muted-foreground text-center">Checking reset link…</p>
  }

  if (tokenValid === false) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-foreground">Link expired or invalid</p>
        <p className="text-xs text-muted-foreground">This reset link has expired or already been used.</p>
        <Link href="/forgot-password" className="text-xs text-accent hover:underline">
          Request a new link
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-6 text-center">
        <h1 className="text-sm font-semibold text-foreground">Set a new password</h1>
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
          autoComplete="new-password"
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
          autoComplete="new-password"
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
