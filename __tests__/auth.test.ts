import { vi, describe, it, expect, beforeEach } from "vitest"

// Mock next-auth to prevent it from resolving next/server at import time
vi.mock("next-auth", () => ({
  default: () => ({
    handlers: { GET: vi.fn(), POST: vi.fn() },
    signIn: vi.fn(),
    signOut: vi.fn(),
    auth: vi.fn(),
  }),
}))

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn(() => ({})),
}))

// Mock the db module before importing auth
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}))

import { authorizeUser } from "@/lib/auth"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

const mockUser = {
  id: "cuid_123",
  email: "test@example.com",
  name: "Test User",
  passwordHash: "$2b$12$hashedpassword",
  isAdmin: false,
  mustChangePassword: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  goals: [],
  userLessons: [],
  userProgressions: [],
  practiceSessions: [],
  passwordResetTokens: [],
}

describe("authorizeUser", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns null when user does not exist", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null)

    const result = await authorizeUser("nobody@example.com", "password")

    expect(result).toBeNull()
    expect(db.user.findUnique).toHaveBeenCalledWith({
      where: { email: "nobody@example.com" },
    })
  })

  it("returns null when password is incorrect", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

    const result = await authorizeUser("test@example.com", "wrong-password")

    expect(result).toBeNull()
  })

  it("returns user payload when credentials are valid", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const result = await authorizeUser("test@example.com", "correct-password")

    expect(result).toEqual({
      id: "cuid_123",
      email: "test@example.com",
      name: "Test User",
      isAdmin: false,
      mustChangePassword: false,
    })
  })

  it("does not include passwordHash in the returned payload", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const result = await authorizeUser("test@example.com", "correct-password")

    expect(result).not.toHaveProperty("passwordHash")
  })

})
