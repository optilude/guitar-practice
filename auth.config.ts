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
    jwt({ token, user, trigger, session }) {
      if (user?.id) token.id = user.id
      // user is only defined on initial sign-in (from authorize callback).
      // isAdmin and mustChangePassword are snapshotted into the JWT at login time.
      // They will NOT update in real-time if an admin changes them in the DB while the
      // user is signed in — the change only takes effect after the user's next sign-in
      // (or via session.update() — see change-password page).
      const u = user as { isAdmin?: boolean; mustChangePassword?: boolean } | undefined
      if (u?.isAdmin !== undefined) token.isAdmin = u.isAdmin
      if (u?.mustChangePassword !== undefined) token.mustChangePassword = u.mustChangePassword
      // Allow the change-password flow to clear mustChangePassword without a full sign-out.
      if (trigger === "update" && (session as { mustChangePassword?: boolean })?.mustChangePassword === false) {
        token.mustChangePassword = false
      }
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
