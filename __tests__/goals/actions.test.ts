import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: {
    goal: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    goalTopic: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  createGoal,
  updateGoal,
  setActiveGoal,
  archiveGoal,
  unarchiveGoal,
  deleteGoal,
  addTopicToGoal,
  removeTopicFromGoal,
} from "@/app/(app)/goals/actions"

const MOCK_SESSION = { user: { id: "user-1", email: "test@example.com", name: "Test" } }
const MOCK_GOAL = { id: "goal-1", userId: "user-1", title: "My Goal", description: "", isActive: false, isArchived: false, createdAt: new Date(), updatedAt: new Date() }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue(MOCK_SESSION as never)
})

describe("createGoal", () => {
  it("creates a goal for the current user and returns its id", async () => {
    vi.mocked(db.goal.create).mockResolvedValue({ ...MOCK_GOAL, id: "new-goal" } as never)
    const result = await createGoal({ title: "My Goal" })
    expect(result).toEqual({ success: true, id: "new-goal" })
    expect(db.goal.create).toHaveBeenCalledWith({
      data: { userId: "user-1", title: "My Goal", description: "" },
    })
  })

  it("returns an error when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    const result = await createGoal({ title: "My Goal" })
    expect(result).toEqual({ error: "Failed to create goal" })
  })

  it("trims whitespace from title and description", async () => {
    vi.mocked(db.goal.create).mockResolvedValue({ ...MOCK_GOAL, id: "g2" } as never)
    await createGoal({ title: "  Padded  ", description: "  Notes  " })
    expect(db.goal.create).toHaveBeenCalledWith({
      data: { userId: "user-1", title: "Padded", description: "Notes" },
    })
  })
})

describe("updateGoal", () => {
  it("updates the goal when it belongs to the current user", async () => {
    vi.mocked(db.goal.findUnique).mockResolvedValue(MOCK_GOAL as never)
    vi.mocked(db.goal.update).mockResolvedValue(MOCK_GOAL as never)
    const result = await updateGoal("goal-1", { title: "New Title" })
    expect(result).toEqual({ success: true })
    expect(db.goal.update).toHaveBeenCalledWith({
      where: { id: "goal-1" },
      data: { title: "New Title" },
    })
  })

  it("returns not found when goal belongs to another user", async () => {
    vi.mocked(db.goal.findUnique).mockResolvedValue({ ...MOCK_GOAL, userId: "other-user" } as never)
    const result = await updateGoal("goal-1", { title: "New Title" })
    expect(result).toEqual({ error: "Not found" })
    expect(db.goal.update).not.toHaveBeenCalled()
  })
})

describe("setActiveGoal", () => {
  it("runs a transaction to deactivate all then activate the target", async () => {
    vi.mocked(db.goal.findUnique).mockResolvedValue(MOCK_GOAL as never)
    vi.mocked(db.$transaction).mockResolvedValue([undefined, MOCK_GOAL] as never)
    const result = await setActiveGoal("goal-1")
    expect(result).toEqual({ success: true })
    expect(db.$transaction).toHaveBeenCalled()
  })

  it("returns not found for a goal owned by another user", async () => {
    vi.mocked(db.goal.findUnique).mockResolvedValue({ ...MOCK_GOAL, userId: "other-user" } as never)
    const result = await setActiveGoal("goal-1")
    expect(result).toEqual({ error: "Not found" })
    expect(db.$transaction).not.toHaveBeenCalled()
  })
})

describe("archiveGoal", () => {
  it("sets isArchived=true and isActive=false", async () => {
    vi.mocked(db.goal.findUnique).mockResolvedValue(MOCK_GOAL as never)
    vi.mocked(db.goal.update).mockResolvedValue(MOCK_GOAL as never)
    const result = await archiveGoal("goal-1")
    expect(result).toEqual({ success: true })
    expect(db.goal.update).toHaveBeenCalledWith({
      where: { id: "goal-1" },
      data: { isArchived: true, isActive: false },
    })
  })
})

describe("unarchiveGoal", () => {
  it("sets isArchived=false", async () => {
    vi.mocked(db.goal.findUnique).mockResolvedValue({ ...MOCK_GOAL, isArchived: true } as never)
    vi.mocked(db.goal.update).mockResolvedValue(MOCK_GOAL as never)
    const result = await unarchiveGoal("goal-1")
    expect(result).toEqual({ success: true })
    expect(db.goal.update).toHaveBeenCalledWith({
      where: { id: "goal-1" },
      data: { isArchived: false },
    })
  })
})

describe("deleteGoal", () => {
  it("deletes the goal when owned by current user", async () => {
    vi.mocked(db.goal.findUnique).mockResolvedValue(MOCK_GOAL as never)
    vi.mocked(db.goal.delete).mockResolvedValue(MOCK_GOAL as never)
    const result = await deleteGoal("goal-1")
    expect(result).toEqual({ success: true })
    expect(db.goal.delete).toHaveBeenCalledWith({ where: { id: "goal-1" } })
  })
})

describe("addTopicToGoal", () => {
  it("upserts a GoalTopic with the computed refKey", async () => {
    vi.mocked(db.goal.findUnique).mockResolvedValue(MOCK_GOAL as never)
    vi.mocked(db.goalTopic.upsert).mockResolvedValue({} as never)
    const result = await addTopicToGoal("goal-1", { kind: "scale", subtype: "major", defaultKey: "C" })
    expect(result).toEqual({ success: true })
    expect(db.goalTopic.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { goalId_refKey: { goalId: "goal-1", refKey: "scale:major:C" } },
        create: expect.objectContaining({ refKey: "scale:major:C", kind: "scale" }),
      })
    )
  })

  it("returns not found when goal belongs to another user", async () => {
    vi.mocked(db.goal.findUnique).mockResolvedValue({ ...MOCK_GOAL, userId: "other" } as never)
    const result = await addTopicToGoal("goal-1", { kind: "scale", subtype: "major", defaultKey: "C" })
    expect(result).toEqual({ error: "Not found" })
  })
})

describe("removeTopicFromGoal", () => {
  it("deletes the GoalTopic when the goal belongs to the current user", async () => {
    vi.mocked(db.goalTopic.findUnique).mockResolvedValue({
      id: "gt-1",
      goalId: "goal-1",
      goal: MOCK_GOAL,
    } as never)
    vi.mocked(db.goalTopic.delete).mockResolvedValue({} as never)
    const result = await removeTopicFromGoal("gt-1")
    expect(result).toEqual({ success: true })
    expect(db.goalTopic.delete).toHaveBeenCalledWith({ where: { id: "gt-1" } })
  })

  it("returns not found when the topic's goal belongs to another user", async () => {
    vi.mocked(db.goalTopic.findUnique).mockResolvedValue({
      id: "gt-1",
      goalId: "goal-1",
      goal: { ...MOCK_GOAL, userId: "other-user" },
    } as never)
    const result = await removeTopicFromGoal("gt-1")
    expect(result).toEqual({ error: "Not found" })
    expect(db.goalTopic.delete).not.toHaveBeenCalled()
  })
})
