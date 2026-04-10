import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    user: { update: vi.fn(), delete: vi.fn() },
  },
}))

vi.mock("@/lib/get-user-id", () => ({
  getUserId: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

import { updateName, deleteAccount } from "@/app/(app)/settings/actions"
import { db } from "@/lib/db"
import { getUserId } from "@/lib/get-user-id"
import { revalidatePath } from "next/cache"

describe("updateName", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns error when unauthenticated", async () => {
    vi.mocked(getUserId).mockResolvedValue(null)
    const result = await updateName("Alice", new FormData())
    expect(result).toEqual({ error: "Not authenticated" })
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it("returns error for blank name", async () => {
    vi.mocked(getUserId).mockResolvedValue("user-1")
    const result = await updateName("   ", new FormData())
    expect(result).toEqual({ error: "Name is required" })
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it("updates with trimmed name and revalidates layout", async () => {
    vi.mocked(getUserId).mockResolvedValue("user-1")
    vi.mocked(db.user.update).mockResolvedValue({} as never)

    const result = await updateName("  Alice  ", new FormData())

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { name: "Alice" },
    })
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout")
    expect(result).toEqual({ success: true })
  })

  it("returns error when db throws", async () => {
    vi.mocked(getUserId).mockResolvedValue("user-1")
    vi.mocked(db.user.update).mockRejectedValue(new Error("db error"))

    const result = await updateName("Alice", new FormData())

    expect(result).toEqual({ error: "Failed to update name. Please try again." })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe("deleteAccount", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns error when unauthenticated", async () => {
    vi.mocked(getUserId).mockResolvedValue(null)
    const result = await deleteAccount(new FormData())
    expect(result).toEqual({ error: "Not authenticated" })
    expect(db.user.delete).not.toHaveBeenCalled()
  })

  it("deletes the user and returns success", async () => {
    vi.mocked(getUserId).mockResolvedValue("user-1")
    vi.mocked(db.user.delete).mockResolvedValue({} as never)

    const result = await deleteAccount(new FormData())

    expect(db.user.delete).toHaveBeenCalledWith({ where: { id: "user-1" } })
    expect(revalidatePath).not.toHaveBeenCalled()
    expect(result).toEqual({ success: true })
  })

  it("returns error when db throws", async () => {
    vi.mocked(getUserId).mockResolvedValue("user-1")
    vi.mocked(db.user.delete).mockRejectedValue(new Error("constraint"))

    const result = await deleteAccount(new FormData())

    expect(result).toEqual({ error: "Failed to delete account. Please try again." })
  })
})
