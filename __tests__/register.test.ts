import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(),
  },
}))

import { createUser } from "@/app/(auth)/register/actions"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

const makeFormData = (fields: Record<string, string>) => {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.set(k, v))
  return fd
}

describe("createUser", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns error when email is already registered", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "existing",
      email: "taken@example.com",
      name: "Existing",
      passwordHash: "hash",
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await createUser(
      makeFormData({ name: "New", email: "taken@example.com", password: "pass" })
    )

    expect(result).toEqual({ error: "An account with this email already exists" })
    expect(db.user.create).not.toHaveBeenCalled()
  })

  it("hashes password with bcrypt cost 12 and creates user", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null)
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed_pw" as never)
    vi.mocked(db.user.create).mockResolvedValue({
      id: "new-cuid",
      email: "new@example.com",
      name: "New User",
      passwordHash: "hashed_pw",
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await createUser(
      makeFormData({ name: "New User", email: "new@example.com", password: "my-password" })
    )

    expect(bcrypt.hash).toHaveBeenCalledWith("my-password", 12)
    expect(db.user.create).toHaveBeenCalledWith({
      data: {
        name: "New User",
        email: "new@example.com",
        passwordHash: "hashed_pw",
      },
    })
    expect(result).toEqual({ success: true })
  })
})
