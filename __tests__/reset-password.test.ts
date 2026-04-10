import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    passwordResetToken: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  },
}))

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn() },
}))

import { validateResetToken, resetPassword } from "@/app/(auth)/reset-password/actions"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

const makeFormData = (fields: Record<string, string>) => {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.set(k, v))
  return fd
}

const validToken = {
  id: "tok1",
  token: "abc123",
  userId: "cuid_123",
  expiresAt: new Date(Date.now() + 3600_000), // 1 hour from now
  createdAt: new Date(),
}

const expiredToken = {
  ...validToken,
  expiresAt: new Date(Date.now() - 1000), // 1 second ago
}

describe("validateResetToken", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns valid: false when token does not exist", async () => {
    vi.mocked(db.passwordResetToken.findUnique).mockResolvedValue(null)
    expect(await validateResetToken("bad-token")).toEqual({ valid: false })
  })

  it("returns valid: false when token is expired", async () => {
    vi.mocked(db.passwordResetToken.findUnique).mockResolvedValue(expiredToken)
    expect(await validateResetToken("abc123")).toEqual({ valid: false })
  })

  it("returns valid: true with userId when token is valid", async () => {
    vi.mocked(db.passwordResetToken.findUnique).mockResolvedValue(validToken)
    expect(await validateResetToken("abc123")).toEqual({ valid: true, userId: "cuid_123" })
  })
})

describe("resetPassword", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns error when passwords do not match", async () => {
    const result = await resetPassword(
      makeFormData({ token: "abc123", newPassword: "newpass1", confirmPassword: "different" })
    )
    expect(result).toEqual({ error: "Passwords do not match" })
  })

  it("returns error when password is too short", async () => {
    const result = await resetPassword(
      makeFormData({ token: "abc123", newPassword: "short", confirmPassword: "short" })
    )
    expect(result).toEqual({ error: "Password must be at least 8 characters" })
  })

  it("returns error when token is invalid or expired", async () => {
    vi.mocked(db.passwordResetToken.findUnique).mockResolvedValue(null)
    const result = await resetPassword(
      makeFormData({ token: "bad", newPassword: "newpassword1", confirmPassword: "newpassword1" })
    )
    expect(result).toEqual({ error: "Invalid or expired reset link" })
  })

  it("updates password and deletes token on success", async () => {
    vi.mocked(db.passwordResetToken.findUnique).mockResolvedValue(validToken)
    vi.mocked(bcrypt.hash).mockResolvedValue("$2b$12$newhash" as never)
    vi.mocked(db.user.update).mockResolvedValue({} as never)
    vi.mocked(db.passwordResetToken.delete).mockResolvedValue({} as never)

    const result = await resetPassword(
      makeFormData({ token: "abc123", newPassword: "newpassword1", confirmPassword: "newpassword1" })
    )

    expect(bcrypt.hash).toHaveBeenCalledWith("newpassword1", 12)
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "cuid_123" },
      data: { passwordHash: "$2b$12$newhash" },
    })
    expect(db.passwordResetToken.delete).toHaveBeenCalledWith({ where: { token: "abc123" } })
    expect(result).toEqual({ success: true })
  })
})
