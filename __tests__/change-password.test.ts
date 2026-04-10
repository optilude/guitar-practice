import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}))

vi.mock("@/lib/get-user-id", () => ({
  getUserId: vi.fn(),
}))

import { changePassword } from "@/app/(auth)/change-password/actions"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { getUserId } from "@/lib/get-user-id"

const makeFormData = (fields: Record<string, string>) => {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.set(k, v))
  return fd
}

const mockUser = {
  id: "cuid_123",
  email: "test@example.com",
  name: "Test User",
  passwordHash: "$2b$12$oldhash",
  isAdmin: false,
  mustChangePassword: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  passwordResetTokens: [],
}

describe("changePassword", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns error when not authenticated", async () => {
    vi.mocked(getUserId).mockResolvedValue(null)

    const result = await changePassword(
      makeFormData({ currentPassword: "old", newPassword: "newpass1", confirmPassword: "newpass1" })
    )

    expect(result).toEqual({ error: "Not authenticated" })
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it("returns error when passwords do not match", async () => {
    vi.mocked(getUserId).mockResolvedValue("cuid_123")
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const result = await changePassword(
      makeFormData({ currentPassword: "old", newPassword: "newpass1", confirmPassword: "different" })
    )

    expect(result).toEqual({ error: "Passwords do not match" })
  })

  it("returns error when new password is too short", async () => {
    vi.mocked(getUserId).mockResolvedValue("cuid_123")
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const result = await changePassword(
      makeFormData({ currentPassword: "old", newPassword: "short", confirmPassword: "short" })
    )

    expect(result).toEqual({ error: "Password must be at least 8 characters" })
  })

  it("returns error when current password is incorrect", async () => {
    vi.mocked(getUserId).mockResolvedValue("cuid_123")
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

    const result = await changePassword(
      makeFormData({ currentPassword: "wrong", newPassword: "newpassword1", confirmPassword: "newpassword1" })
    )

    expect(result).toEqual({ error: "Current password is incorrect" })
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it("updates password hash and clears mustChangePassword on success", async () => {
    vi.mocked(getUserId).mockResolvedValue("cuid_123")
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
    vi.mocked(bcrypt.hash).mockResolvedValue("$2b$12$newhash" as never)
    vi.mocked(db.user.update).mockResolvedValue({ ...mockUser, mustChangePassword: false })

    const result = await changePassword(
      makeFormData({ currentPassword: "old", newPassword: "newpassword1", confirmPassword: "newpassword1" })
    )

    expect(bcrypt.hash).toHaveBeenCalledWith("newpassword1", 12)
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "cuid_123" },
      data: { passwordHash: "$2b$12$newhash", mustChangePassword: false },
    })
    expect(result).toEqual({ success: true })
  })
})
