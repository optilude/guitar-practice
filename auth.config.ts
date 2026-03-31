import type { NextAuthConfig } from "next-auth"

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  // Note: Credentials provider is added in lib/auth.ts (server-only)
  // This config is used only for middleware (edge) session checking
}
