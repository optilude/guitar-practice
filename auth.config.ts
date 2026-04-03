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
      // Persist user.id into the JWT on sign-in
      if (user?.id) {
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      // Expose user.id from the JWT to the session object
      if (token.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
}
