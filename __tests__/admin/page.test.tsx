import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import AdminPage from "@/app/(app)/admin/page"

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: vi.fn().mockResolvedValue(undefined),
}))

describe("AdminPage", () => {
  it("renders two tiles: User Management and Library Management", async () => {
    const page = await AdminPage()
    render(page)
    expect(screen.getByText("User Management")).toBeInTheDocument()
    expect(screen.getByText("Library Management")).toBeInTheDocument()
  })

  it("Users tile links to /admin/users", async () => {
    const page = await AdminPage()
    render(page)
    const usersLink = screen.getByRole("link", { name: /user management/i })
    expect(usersLink).toHaveAttribute("href", "/admin/users")
  })

  it("Library tile links to /admin/library", async () => {
    const page = await AdminPage()
    render(page)
    const libraryLink = screen.getByRole("link", { name: /library management/i })
    expect(libraryLink).toHaveAttribute("href", "/admin/library")
  })
})
