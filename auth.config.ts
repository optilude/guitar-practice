import type { NextAuthConfig } from "next-auth"

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  // Note: Credentials provider is added in lib/auth.ts (server-only)
  // This config is used for both middleware (edge) and server-side session checking
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id
      // user is only defined on initial sign-in (from authorize callback)
      const u = user as { isAdmin?: boolean; mustChangePassword?: boolean } | undefined
      if (u?.isAdmin !== undefined) token.isAdmin = u.isAdmin
      if (u?.mustChangePassword !== undefined) token.mustChangePassword = u.mustChangePassword
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      session.user.isAdmin = (token.isAdmin as boolean) ?? false
      session.user.mustChangePassword = (token.mustChangePassword as boolean) ?? false
      return session
    },
  },
}
