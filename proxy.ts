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
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")

  if (!isLoggedIn && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }

  if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/", req.nextUrl))
  }

  // Redirect users who must change their password (but not if they're already on that page)
  // Also exclude public paths to allow /api/auth routes (signout, token refresh, etc.)
  // Note: this guard only applies to navigation requests. Server action POSTs (which go to
  // the same URL as the page but with a specific header) are not redirected here. This means
  // a mustChangePassword user can still invoke server actions directly. For a personal app
  // this is acceptable; for stricter enforcement, gate server actions individually.
  const mustChange = isLoggedIn && req.auth?.user?.mustChangePassword
  const isChangePwPath = pathname.startsWith("/change-password")
  if (mustChange && !isChangePwPath && !isPublicPath) {
    return NextResponse.redirect(new URL("/change-password", req.nextUrl))
  }

  // Forward user ID and admin status as request headers so server components
  // can read them via `await headers()`. Strip any client-supplied values first.
  const requestHeaders = new Headers(req.headers)
  requestHeaders.delete("x-user-id")
  requestHeaders.delete("x-is-admin")
  if (isLoggedIn && req.auth?.user?.id) {
    requestHeaders.set("x-user-id", req.auth.user.id)
  }
  if (isLoggedIn && req.auth?.user?.isAdmin) {
    requestHeaders.set("x-is-admin", "true")
  }
  return NextResponse.next({ request: { headers: requestHeaders } })
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/).*)"],
}
