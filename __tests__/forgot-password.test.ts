import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn() },
    passwordResetToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
}))

vi.mock("crypto", async () => {
  const actual = await vi.importActual<typeof import("crypto")>("crypto")
  return { ...actual, randomBytes: vi.fn(() => Buffer.from("deadbeefdeadbeef", "hex")) }
})

import { requestPasswordReset } from "@/app/(auth)/forgot-password/actions"
import { db } from "@/lib/db"
import { sendEmail } from "@/lib/email"

const makeFormData = (fields: Record<string, string>) => {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.set(k, v))
  return fd
}

const mockUser = {
  id: "cuid_123",
  email: "test@example.com",
  name: "Test",
  passwordHash: "hash",
  isAdmin: false,
  mustChangePassword: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe("requestPasswordReset", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns success without sending email when user does not exist (prevents enumeration)", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null)

    const result = await requestPasswordReset(makeFormData({ email: "nobody@example.com" }))

    expect(result).toEqual({ success: true })
    expect(sendEmail).not.toHaveBeenCalled()
    expect(db.passwordResetToken.create).not.toHaveBeenCalled()
  })

  it("deletes existing tokens, creates a new one, and sends email when user exists", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)
    vi.mocked(db.passwordResetToken.deleteMany).mockResolvedValue({ count: 0 })
    vi.mocked(db.passwordResetToken.create).mockResolvedValue({
      id: "tok1",
      token: "deadbeefdeadbeef",
      userId: "cuid_123",
      expiresAt: new Date(),
      createdAt: new Date(),
    })

    const result = await requestPasswordReset(makeFormData({ email: "test@example.com" }))

    expect(db.passwordResetToken.deleteMany).toHaveBeenCalledWith({ where: { userId: "cuid_123" } })
    expect(db.passwordResetToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "cuid_123", expiresAt: expect.any(Date) }),
    })
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "test@example.com", subject: expect.stringContaining("password") })
    )
    expect(result).toEqual({ success: true })
  })

  it("returns success even when email delivery fails (preserves enumeration guarantee)", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)
    vi.mocked(db.passwordResetToken.deleteMany).mockResolvedValue({ count: 0 })
    vi.mocked(db.passwordResetToken.create).mockResolvedValue({
      id: "tok1",
      token: "deadbeefdeadbeef",
      userId: "cuid_123",
      expiresAt: new Date(),
      createdAt: new Date(),
    })
    vi.mocked(sendEmail).mockRejectedValue(new Error("SMTP connection refused"))

    const result = await requestPasswordReset(makeFormData({ email: "test@example.com" }))

    expect(result).toEqual({ success: true })
  })
})
