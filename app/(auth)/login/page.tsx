"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const passwordChanged = searchParams.get("passwordChanged") === "1"

  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid email or password")
      setPending(false)
    } else {
      router.push("/")
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {passwordChanged && (
        <p className="text-xs text-green-600 dark:text-green-400 text-center">
          Password changed. Please sign in with your new password.
        </p>
      )}

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
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent transition-shadow"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="block text-xs uppercase tracking-widest text-muted-foreground">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-shadow"
        />
      </div>

      {error && (
        <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        No account?{" "}
        <Link
          href="/register"
          className="text-foreground underline underline-offset-2 decoration-border hover:decoration-foreground transition-colors"
        >
          Register
        </Link>
      </p>
    </form>
  )
}
