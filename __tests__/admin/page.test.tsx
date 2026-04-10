import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import AdminPage from "@/app/(app)/admin/page"

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: vi.fn().mockResolvedValue(undefined),
}))

describe("AdminPage", () => {
  beforeEach(async () => {
    const page = await AdminPage()
    render(page)
  })

  it("renders two tiles: User Management and Library Management", () => {
    expect(screen.getByText("User Management")).toBeInTheDocument()
    expect(screen.getByText("Library Management")).toBeInTheDocument()
  })

  it("Users tile links to /admin/users", () => {
    const usersLink = screen.getByRole("link", { name: /user management/i })
    expect(usersLink).toHaveAttribute("href", "/admin/users")
  })

  it("Library tile links to /admin/library", () => {
    const libraryLink = screen.getByRole("link", { name: /library management/i })
    expect(libraryLink).toHaveAttribute("href", "/admin/library")
  })
})
