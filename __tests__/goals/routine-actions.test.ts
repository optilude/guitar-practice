import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/get-user-id", () => ({ getUserId: vi.fn() }))
vi.mock("@/lib/db", () => ({
  db: {
    goal: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    routine: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    section: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    sectionTopic: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { getUserId } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import {
  getUserGoals,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
  addTopicToSection,
  removeTopicFromSection,
} from "@/app/(app)/goals/actions"

const MOCK_GOAL = { id: "goal-1", userId: "user-1" }
const MOCK_ROUTINE = { id: "routine-1", goalId: "goal-1", goal: MOCK_GOAL }
const MOCK_SECTION = { id: "section-1", routineId: "routine-1", routine: { ...MOCK_ROUTINE }, order: 0 }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getUserId).mockResolvedValue("user-1")
})

describe("getUserGoals", () => {
  it("returns unarchived goals for the current user", async () => {
    const goals = [{ id: "g1", title: "Goal A", isActive: true }]
    vi.mocked(db.goal.findMany).mockResolvedValue(goals as never)
    const result = await getUserGoals()
    expect(result).toEqual(goals)
    expect(db.goal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1", isArchived: false }),
      })
    )
  })

  it("returns empty array when not authenticated", async () => {
    vi.mocked(getUserId).mockResolvedValue(null)
    const result = await getUserGoals()
    expect(result).toEqual([])
  })
})

describe("createRoutine", () => {
  it("creates a routine for the given goal", async () => {
    vi.mocked(db.goal.findUnique).mockResolvedValue(MOCK_GOAL as never)
    vi.mocked(db.routine.create).mockResolvedValue({ id: "r1" } as never)
    vi.mocked(db.$transaction).mockResolvedValue({ id: "r1" } as never)
    const result = await createRoutine("goal-1", { title: "My Routine", durationMinutes: 60 })
    expect(result).toEqual({ success: true, id: "r1" })
  })

  it("returns not found when goal belongs to another user", async () => {
    vi.mocked(db.goal.findUnique).mockResolvedValue({ id: "goal-1", userId: "other" } as never)
    const result = await createRoutine("goal-1", { title: "Test", durationMinutes: 30 })
    expect(result).toEqual({ error: "Not found" })
  })
})

describe("updateRoutine", () => {
  it("updates the routine when it belongs to the current user's goal", async () => {
    vi.mocked(db.routine.findUnique).mockResolvedValue(MOCK_ROUTINE as never)
    vi.mocked(db.routine.update).mockResolvedValue(MOCK_ROUTINE as never)
    const result = await updateRoutine("routine-1", { title: "New Title" })
    expect(result).toEqual({ success: true })
    expect(db.routine.update).toHaveBeenCalledWith({
      where: { id: "routine-1" },
      data: { title: "New Title" },
    })
  })

  it("returns not found when routine's goal belongs to another user", async () => {
    vi.mocked(db.routine.findUnique).mockResolvedValue({
      ...MOCK_ROUTINE,
      goal: { ...MOCK_GOAL, userId: "other" },
    } as never)
    const result = await updateRoutine("routine-1", { title: "X" })
    expect(result).toEqual({ error: "Not found" })
  })
})

describe("deleteRoutine", () => {
  it("deletes the routine when ownership is verified", async () => {
    vi.mocked(db.routine.findUnique).mockResolvedValue(MOCK_ROUTINE as never)
    vi.mocked(db.routine.delete).mockResolvedValue(MOCK_ROUTINE as never)
    const result = await deleteRoutine("routine-1")
    expect(result).toEqual({ success: true })
  })
})

describe("createSection", () => {
  it("creates a section appended to the end", async () => {
    vi.mocked(db.routine.findUnique).mockResolvedValue(MOCK_ROUTINE as never)
    vi.mocked(db.section.findMany).mockResolvedValue([{ order: 0 }, { order: 1 }] as never)
    vi.mocked(db.section.create).mockResolvedValue({ id: "s1" } as never)
    const result = await createSection("routine-1", {
      type: "warmup",
      title: "Warm Up",
      durationMinutes: 5,
    })
    expect(result).toEqual({ success: true, id: "s1" })
    expect(db.section.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ order: 2 }),
      })
    )
  })
})

describe("reorderSections", () => {
  it("writes new order values in a transaction", async () => {
    vi.mocked(db.routine.findUnique).mockResolvedValue(MOCK_ROUTINE as never)
    vi.mocked(db.$transaction).mockResolvedValue([undefined, undefined] as never)
    const result = await reorderSections("routine-1", ["s2", "s1"])
    expect(result).toEqual({ success: true })
    expect(db.$transaction).toHaveBeenCalled()
  })
})

describe("addTopicToSection", () => {
  it("creates a SectionTopic linking the topic to the section", async () => {
    vi.mocked(db.section.findUnique).mockResolvedValue({
      ...MOCK_SECTION,
      routine: { ...MOCK_ROUTINE },
    } as never)
    vi.mocked(db.sectionTopic.create).mockResolvedValue({ id: "st-1" } as never)
    const result = await addTopicToSection("section-1", "goal-topic-1")
    expect(result).toEqual({ success: true, sectionTopicId: "st-1" })
    expect(db.sectionTopic.create).toHaveBeenCalledWith({
      data: { sectionId: "section-1", goalTopicId: "goal-topic-1" },
    })
  })
})

describe("removeTopicFromSection", () => {
  it("deletes the SectionTopic when ownership is verified", async () => {
    vi.mocked(db.sectionTopic.findUnique).mockResolvedValue({
      id: "st-1",
      section: {
        ...MOCK_SECTION,
        routine: { ...MOCK_ROUTINE },
      },
    } as never)
    vi.mocked(db.sectionTopic.delete).mockResolvedValue({} as never)
    const result = await removeTopicFromSection("st-1")
    expect(result).toEqual({ success: true })
  })
})
