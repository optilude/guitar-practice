import { vi, describe, it, expect, beforeEach } from "vitest"

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

import LibraryPage from "@/app/(app)/library/page"
import { db } from "@/lib/db"
import { render, screen } from "@testing-library/react"

const mockCategories = [
  { id: "1", slug: "fretboard-knowledge", name: "Fretboard Knowledge", order: 1, _count: { topics: 18 } },
  { id: "2", slug: "music-theory",        name: "Music Theory",        order: 2, _count: { topics: 12 } },
  { id: "3", slug: "technique",           name: "Technique",           order: 4, _count: { topics: 24 } },
]

describe("LibraryPage", () => {
  beforeEach(() => vi.clearAllMocks())

  it("renders each category name", async () => {
    vi.mocked(db.category.findMany).mockResolvedValue(mockCategories as any)

    const jsx = await LibraryPage()
    render(jsx)

    expect(screen.getByText("Fretboard Knowledge")).toBeInTheDocument()
    expect(screen.getByText("Music Theory")).toBeInTheDocument()
    expect(screen.getByText("Technique")).toBeInTheDocument()
  })

  it("renders topic counts for each category", async () => {
    vi.mocked(db.category.findMany).mockResolvedValue(mockCategories as any)

    const jsx = await LibraryPage()
    render(jsx)

    expect(screen.getByText("18 links")).toBeInTheDocument()
    expect(screen.getByText("12 links")).toBeInTheDocument()
    expect(screen.getByText("24 links")).toBeInTheDocument()
  })

  it("renders each category as a link to its detail page", async () => {
    vi.mocked(db.category.findMany).mockResolvedValue(mockCategories as any)

    const jsx = await LibraryPage()
    render(jsx)

    expect(screen.getByRole("link", { name: /Fretboard Knowledge/ })).toHaveAttribute(
      "href",
      "/library/fretboard-knowledge"
    )
  })
})
