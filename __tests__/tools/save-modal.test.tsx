import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { SaveModal } from "@/app/(app)/tools/progression-analysis/_components/save-modal"
import type { InputChord } from "@/lib/theory/key-finder"

const mockPush = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }))
vi.mock("@/lib/theory/transposer", () => ({
  analyzeProgression: () => [
    { roman: "I", degree: 1, role: "diatonic", score: 1, inputChord: { root: "C", type: "maj7", symbol: "Cmaj7" } },
  ],
}))
vi.mock("@/app/(app)/reference/progressions/actions", () => ({
  createUserProgression: vi.fn().mockResolvedValue({ success: true, id: "new-id" }),
}))

const fakeParsedChords: InputChord[] = [{ root: "C", type: "maj7", symbol: "Cmaj7" }]

beforeEach(() => {
  mockPush.mockClear()
  vi.clearAllMocks()
})

describe("SaveModal", () => {
  it("renders with pre-filled title and description", () => {
    render(
      <SaveModal
        parsedChords={fakeParsedChords}
        tonic="C"
        modeName="major"
        initialTitle="My Test"
        initialDescription="A nice progression"
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByDisplayValue("My Test")).toBeInTheDocument()
    expect(screen.getByDisplayValue("A nice progression")).toBeInTheDocument()
  })

  it("shows error when title is empty and save is clicked", async () => {
    render(
      <SaveModal
        parsedChords={fakeParsedChords}
        tonic="C"
        modeName="major"
        initialTitle=""
        initialDescription=""
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument()
  })

  it("calls createUserProgression and navigates on success", async () => {
    const { createUserProgression } = await import("@/app/(app)/reference/progressions/actions")
    render(
      <SaveModal
        parsedChords={fakeParsedChords}
        tonic="C"
        modeName="major"
        initialTitle="My Progression"
        initialDescription=""
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => expect(createUserProgression).toHaveBeenCalledWith({
      displayName: "My Progression",
      description: "",
      mode: "major",
      degrees: expect.arrayContaining(["I:maj7"]),
    }))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/reference/progressions"))
  })

  it("calls onClose when Cancel is clicked", () => {
    const onClose = vi.fn()
    render(
      <SaveModal
        parsedChords={fakeParsedChords}
        tonic="C"
        modeName="major"
        initialTitle=""
        initialDescription=""
        onClose={onClose}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
