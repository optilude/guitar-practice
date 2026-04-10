import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    isAdmin?: boolean
    mustChangePassword?: boolean
  }
  interface Session {
    user: {
      id: string
      isAdmin: boolean
      mustChangePassword: boolean
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    isAdmin?: boolean
    mustChangePassword?: boolean
  }
}
