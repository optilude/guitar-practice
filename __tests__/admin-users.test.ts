import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    user: { update: vi.fn(), delete: vi.fn() },
  },
}))

vi.mock("@/lib/get-user-id", () => ({
  getIsAdmin: vi.fn(),
  getUserId: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

import { setAdmin, deleteUser } from "@/app/(app)/admin/users/actions"
import { db } from "@/lib/db"
import { getIsAdmin, getUserId } from "@/lib/get-user-id"
import { revalidatePath } from "next/cache"

describe("setAdmin", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns Forbidden when caller is not an admin", async () => {
    vi.mocked(getIsAdmin).mockResolvedValue(false)

    const fd = new FormData()
    const result = await setAdmin("target-id", true, fd)

    expect(result).toBeUndefined()
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it("returns error when admin tries to remove their own admin status", async () => {
    vi.mocked(getIsAdmin).mockResolvedValue(true)
    vi.mocked(getUserId).mockResolvedValue("caller-id")

    const fd = new FormData()
    const result = await setAdmin("caller-id", false, fd)

    expect(result).toBeUndefined()
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
    expect(result).toBeUndefined()
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
    expect(result).toBeUndefined()
  })

  it("returns error when db.user.update throws", async () => {
    vi.mocked(getIsAdmin).mockResolvedValue(true)
    vi.mocked(getUserId).mockResolvedValue("caller-id")
    vi.mocked(db.user.update).mockRejectedValue(new Error("connection refused"))

    const result = await setAdmin("target-id", true, new FormData())

    expect(result).toBeUndefined()
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe("deleteUser", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns Forbidden when caller is not an admin", async () => {
    vi.mocked(getIsAdmin).mockResolvedValue(false)

    const result = await deleteUser("target-id", new FormData())

    expect(result).toEqual({ error: "Forbidden" })
    expect(db.user.delete).not.toHaveBeenCalled()
  })

  it("returns error when admin tries to delete themselves", async () => {
    vi.mocked(getIsAdmin).mockResolvedValue(true)
    vi.mocked(getUserId).mockResolvedValue("caller-id")

    const result = await deleteUser("caller-id", new FormData())

    expect(result).toEqual({ error: "You cannot delete your own account" })
    expect(db.user.delete).not.toHaveBeenCalled()
  })

  it("deletes another user and revalidates the page", async () => {
    vi.mocked(getIsAdmin).mockResolvedValue(true)
    vi.mocked(getUserId).mockResolvedValue("caller-id")
    vi.mocked(db.user.delete).mockResolvedValue({} as never)

    const result = await deleteUser("target-id", new FormData())

    expect(db.user.delete).toHaveBeenCalledWith({ where: { id: "target-id" } })
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users")
    expect(result).toEqual({ success: true })
  })

  it("returns error when db.user.delete throws", async () => {
    vi.mocked(getIsAdmin).mockResolvedValue(true)
    vi.mocked(getUserId).mockResolvedValue("caller-id")
    vi.mocked(db.user.delete).mockRejectedValue(new Error("fk constraint"))

    const result = await deleteUser("target-id", new FormData())

    expect(result).toEqual({ error: "Failed to delete user. Please try again." })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
