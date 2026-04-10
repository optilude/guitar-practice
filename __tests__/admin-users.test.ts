import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    user: { update: vi.fn() },
  },
}))

vi.mock("@/lib/get-user-id", () => ({
  getIsAdmin: vi.fn(),
  getUserId: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

import { setAdmin } from "@/app/(app)/admin/users/actions"
import { db } from "@/lib/db"
import { getIsAdmin, getUserId } from "@/lib/get-user-id"
import { revalidatePath } from "next/cache"

describe("setAdmin", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns Forbidden when caller is not an admin", async () => {
    vi.mocked(getIsAdmin).mockResolvedValue(false)

    const fd = new FormData()
    const result = await setAdmin("target-id", true, fd)

    expect(result).toEqual({ error: "Forbidden" })
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it("returns error when admin tries to remove their own admin status", async () => {
    vi.mocked(getIsAdmin).mockResolvedValue(true)
    vi.mocked(getUserId).mockResolvedValue("caller-id")

    const fd = new FormData()
    const result = await setAdmin("caller-id", false, fd)

    expect(result).toEqual({ error: "You cannot remove your own admin status" })
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it("promotes another user to admin", async () => {
    vi.mocked(getIsAdmin).mockResolvedValue(true)
    vi.mocked(getUserId).mockResolvedValue("caller-id")
    vi.mocked(db.user.update).mockResolvedValue({} as never)

    const fd = new FormData()
    const result = await setAdmin("target-id", true, fd)

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "target-id" },
      data: { isAdmin: true },
    })
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users")
    expect(result).toEqual({ success: true })
  })

  it("demotes another user from admin", async () => {
    vi.mocked(getIsAdmin).mockResolvedValue(true)
    vi.mocked(getUserId).mockResolvedValue("caller-id")
    vi.mocked(db.user.update).mockResolvedValue({} as never)

    const fd = new FormData()
    const result = await setAdmin("target-id", false, fd)

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "target-id" },
      data: { isAdmin: false },
    })
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users")
    expect(result).toEqual({ success: true })
  })

  it("returns error when db.user.update throws", async () => {
    vi.mocked(getIsAdmin).mockResolvedValue(true)
    vi.mocked(getUserId).mockResolvedValue("caller-id")
    vi.mocked(db.user.update).mockRejectedValue(new Error("connection refused"))

    const result = await setAdmin("target-id", true, new FormData())

    expect(result).toEqual({ error: "Failed to update user. Please try again." })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
