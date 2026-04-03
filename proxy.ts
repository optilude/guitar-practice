import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  const isPublicPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/api/auth")

  if (!isLoggedIn && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }

  if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/", req.nextUrl))
  }

  // Forward user ID as a request header so server components and actions
  // can read it via `await headers()` (Next.js 16 requires async API).
  // Strip any client-supplied x-user-id first to prevent spoofing.
  const requestHeaders = new Headers(req.headers)
  requestHeaders.delete("x-user-id")
  if (isLoggedIn && req.auth?.user?.id) {
    requestHeaders.set("x-user-id", req.auth.user.id)
  }
  return NextResponse.next({ request: { headers: requestHeaders } })
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/).*)"],
}
