import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    source: { upsert: vi.fn() },
    category: { findUnique: vi.fn() },
    topic: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/get-user-id", () => ({
  getIsAdmin: vi.fn().mockResolvedValue(true),
}))

import { getIsAdmin } from "@/lib/get-user-id"
import { db } from "@/lib/db"
import { createTopic, updateTopic, deleteTopic, reorderTopics } from "@/app/(app)/admin/library/actions"

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getIsAdmin).mockResolvedValue(true)
})

describe("createTopic", () => {
  it("creates a topic with upserted source", async () => {
    vi.mocked(db.source.upsert).mockResolvedValue({ id: "src-1" } as never)
    vi.mocked(db.category.findUnique).mockResolvedValue({ id: "cat-1", slug: "technique" } as never)
    vi.mocked(db.topic.findFirst).mockResolvedValue({ order: 2 } as never)
    vi.mocked(db.topic.create).mockResolvedValue({ id: "topic-1" } as never)

    const result = await createTopic("cat-1", {
      title: "Pentatonic Scales",
      url: "https://www.hubguitar.com/pentatonic",
      sourceName: "HubGuitar",
    })

    expect(result).toEqual({ success: true, id: "topic-1" })
    expect(db.source.upsert).toHaveBeenCalledWith({
      where: { name: "HubGuitar" },
      update: {},
      create: { name: "HubGuitar", baseUrl: "https://www.hubguitar.com" },
    })
    expect(db.topic.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Pentatonic Scales",
        url: "https://www.hubguitar.com/pentatonic",
        slug: "pentatonic-scales",
        order: 3,
        categoryId: "cat-1",
        sourceId: "src-1",
        description: "",
      }),
    })
  })

  it("returns error when category not found", async () => {
    vi.mocked(db.source.upsert).mockResolvedValue({ id: "src-1" } as never)
    vi.mocked(db.category.findUnique).mockResolvedValue(null as never)

    const result = await createTopic("bad-id", {
      title: "Test",
      url: "https://example.com/test",
      sourceName: "Example",
    })

    expect(result).toEqual({ error: "Category not found" })
  })

  it("returns error when not admin", async () => {
    vi.mocked(getIsAdmin).mockResolvedValueOnce(false)

    const result = await createTopic("cat-1", {
      title: "Test",
      url: "https://example.com/test",
      sourceName: "Example",
    })

    expect(result).toEqual({ error: "Not authorized" })
  })

  it("uses order 0 when no existing topics in category", async () => {
    vi.mocked(db.source.upsert).mockResolvedValue({ id: "src-1" } as never)
    vi.mocked(db.category.findUnique).mockResolvedValue({ id: "cat-1", slug: "technique" } as never)
    vi.mocked(db.topic.findFirst).mockResolvedValue(null as never)
    vi.mocked(db.topic.create).mockResolvedValue({ id: "topic-1" } as never)

    await createTopic("cat-1", {
      title: "First Topic",
      url: "https://example.com/first",
      sourceName: "Example",
    })

    expect(db.topic.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ order: 0 }),
    })
  })
})

describe("updateTopic", () => {
  it("updates topic fields and upserts source", async () => {
    vi.mocked(db.topic.findUnique).mockResolvedValue({
      id: "topic-1",
      categoryId: "cat-1",
      url: "https://www.hubguitar.com/old",
      category: { slug: "technique" },
    } as never)
    vi.mocked(db.source.upsert).mockResolvedValue({ id: "src-1" } as never)
    vi.mocked(db.topic.update).mockResolvedValue({} as never)

    const result = await updateTopic("topic-1", {
      title: "Updated Title",
      sourceName: "HubGuitar",
    })

    expect(result).toEqual({ success: true })
    expect(db.topic.update).toHaveBeenCalledWith({
      where: { id: "topic-1" },
      data: expect.objectContaining({ title: "Updated Title", slug: "updated-title", sourceId: "src-1" }),
    })
  })

  it("returns error when topic not found", async () => {
    vi.mocked(db.topic.findUnique).mockResolvedValue(null as never)
    const result = await updateTopic("bad-id", { title: "X" })
    expect(result).toEqual({ error: "Not found" })
  })

  it("skips source upsert when sourceName not provided", async () => {
    vi.mocked(db.topic.findUnique).mockResolvedValue({
      id: "topic-1",
      categoryId: "cat-1",
      url: "https://example.com/test",
      category: { slug: "technique" },
    } as never)
    vi.mocked(db.topic.update).mockResolvedValue({} as never)

    await updateTopic("topic-1", { description: "New description" })

    expect(db.source.upsert).not.toHaveBeenCalled()
    expect(db.topic.update).toHaveBeenCalledWith({
      where: { id: "topic-1" },
      data: expect.objectContaining({ description: "New description" }),
    })
  })
})

describe("deleteTopic", () => {
  it("deletes topic and re-indexes remaining", async () => {
    vi.mocked(db.topic.findUnique).mockResolvedValue({
      id: "topic-1",
      categoryId: "cat-1",
      category: { slug: "technique" },
    } as never)
    const mockTx = {
      topic: {
        delete: vi.fn().mockResolvedValue({}),
        findMany: vi.fn().mockResolvedValue([{ id: "topic-2" }, { id: "topic-3" }]),
        update: vi.fn().mockResolvedValue({}),
      },
    }
    vi.mocked(db.$transaction).mockImplementation(async (fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx))

    const result = await deleteTopic("topic-1")

    expect(result).toEqual({ success: true })
    expect(mockTx.topic.delete).toHaveBeenCalledWith({ where: { id: "topic-1" } })
    expect(mockTx.topic.update).toHaveBeenCalledTimes(2)
  })

  it("returns error when topic not found", async () => {
    vi.mocked(db.topic.findUnique).mockResolvedValue(null as never)
    const result = await deleteTopic("bad-id")
    expect(result).toEqual({ error: "Not found" })
  })
})

describe("reorderTopics", () => {
  it("reorders topics in category", async () => {
    vi.mocked(db.topic.findMany).mockResolvedValue([
      { id: "topic-1" },
      { id: "topic-2" },
    ] as never)
    vi.mocked(db.$transaction).mockResolvedValue(undefined as never)

    const result = await reorderTopics("cat-1", ["topic-2", "topic-1"])

    expect(result).toEqual({ success: true })
  })

  it("returns error when IDs mismatch", async () => {
    vi.mocked(db.topic.findMany).mockResolvedValue([{ id: "topic-1" }] as never)
    const result = await reorderTopics("cat-1", ["topic-1", "topic-99"])
    expect(result).toEqual({ error: "Invalid topics provided" })
  })
})
