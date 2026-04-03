import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND")
  }),
}))

vi.mock("@/components/add-to-goal-button", () => ({
  AddToGoalButton: () => null,
}))

import LibraryPage from "@/app/(app)/library/page"
import CategoryPage from "@/app/(app)/library/[category]/page"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { render, screen, cleanup } from "@testing-library/react"

const mockCategories = [
  { id: "1", slug: "fretboard-knowledge", name: "Fretboard Knowledge", order: 1, _count: { topics: 18 } },
  { id: "2", slug: "music-theory",        name: "Music Theory",        order: 2, _count: { topics: 12 } },
  { id: "3", slug: "technique",           name: "Technique",           order: 4, _count: { topics: 24 } },
]

afterEach(cleanup)

describe("LibraryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.category.findMany).mockResolvedValue(mockCategories as any)
  })

  it("renders each category name", async () => {
    render(await LibraryPage())
    expect(screen.getByText("Fretboard Knowledge")).toBeInTheDocument()
    expect(screen.getByText("Music Theory")).toBeInTheDocument()
    expect(screen.getByText("Technique")).toBeInTheDocument()
  })

  it("renders topic counts for each category", async () => {
    render(await LibraryPage())
    expect(screen.getByText("18 topics")).toBeInTheDocument()
    expect(screen.getByText("12 topics")).toBeInTheDocument()
    expect(screen.getByText("24 topics")).toBeInTheDocument()
  })

  it("renders each category as a link to its detail page", async () => {
    render(await LibraryPage())
    expect(screen.getByRole("link", { name: /Fretboard Knowledge/ })).toHaveAttribute(
      "href",
      "/library/fretboard-knowledge"
    )
  })

  it("renders a 'Manage my library' link to /library/manage", async () => {
    render(await LibraryPage())
    const link = screen.getByRole("link", { name: /manage my library/i })
    expect(link).toHaveAttribute("href", "/library/manage")
  })
})

const mockCategory = {
  id: "1",
  slug: "technique",
  name: "Technique",
  order: 4,
  topics: [
    {
      id: "t1",
      title: "Alternate Picking Basics",
      url: "https://hubguitar.com/technique/alternate-picking",
      slug: "alternate-picking",
      order: 1,
      categoryId: "1",
      sourceId: "s1",
      source: { id: "s1", name: "HubGuitar", baseUrl: "https://hubguitar.com" },
      createdAt: new Date(),
    },
    {
      id: "t2",
      title: "Economy Picking Guide",
      url: "https://hubguitar.com/technique/economy-picking",
      slug: "economy-picking",
      order: 2,
      categoryId: "1",
      sourceId: "s1",
      source: { id: "s1", name: "HubGuitar", baseUrl: "https://hubguitar.com" },
      createdAt: new Date(),
    },
  ],
}

describe("CategoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the category name as a heading", async () => {
    vi.mocked(db.category.findUnique).mockResolvedValue(mockCategory as any)
    render(await CategoryPage({ params: Promise.resolve({ category: "technique" }) }))
    expect(screen.getByRole("heading", { name: "Technique" })).toBeInTheDocument()
  })

  it("renders each topic as an external link with correct href", async () => {
    vi.mocked(db.category.findUnique).mockResolvedValue(mockCategory as any)
    render(await CategoryPage({ params: Promise.resolve({ category: "technique" }) }))
    const link = screen.getByRole("link", { name: /Alternate Picking Basics/ })
    expect(link).toHaveAttribute("href", "https://hubguitar.com/technique/alternate-picking")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("calls notFound for an unknown category slug", async () => {
    vi.mocked(db.category.findUnique).mockResolvedValue(null)
    await expect(
      CategoryPage({ params: Promise.resolve({ category: "unknown-slug" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND")
    expect(notFound).toHaveBeenCalled()
  })
})
