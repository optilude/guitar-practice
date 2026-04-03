import { headers } from "next/headers"

/**
 * Returns the authenticated user's ID, forwarded by the proxy as "x-user-id".
 * Works in server components, server actions, and route handlers.
 *
 * NextAuth v5 beta.30 calls cookies() synchronously internally, which is
 * incompatible with Next.js 16 (async-only request APIs). The proxy reads
 * the JWT at the edge and forwards the user ID as a request header instead.
 */
export async function getUserId(): Promise<string | null> {
  const headersList = await headers()
  return headersList.get("x-user-id")
}
