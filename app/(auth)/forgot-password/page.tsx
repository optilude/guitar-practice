"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { requestPasswordReset } from "./actions"

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await requestPasswordReset(formData)
      setSubmitted(true)
    })
  }

  if (submitted) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-foreground">Check your email</p>
        <p className="text-xs text-muted-foreground">
          If that address is registered, you&apos;ll receive a reset link shortly.
        </p>
        <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-6 text-center">
        <h1 className="text-sm font-semibold text-foreground">Reset your password</h1>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-xs uppercase tracking-widest text-muted-foreground">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-shadow"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {isPending ? "Sending…" : "Send reset link"}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        <Link href="/login" className="text-foreground underline underline-offset-2 decoration-border hover:decoration-foreground transition-colors">
          Back to sign in
        </Link>
      </p>
    </form>
  )
}
