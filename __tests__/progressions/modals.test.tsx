import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { SaveAsModal } from "@/app/(app)/progressions/_components/save-as-modal"
import { EditMetaModal } from "@/app/(app)/progressions/_components/edit-meta-modal"
import { DeleteConfirmModal } from "@/app/(app)/progressions/_components/delete-confirm-modal"

vi.mock("@/app/(app)/progressions/actions", () => ({
  createUserProgression: vi.fn(),
  updateUserProgression: vi.fn(),
  deleteUserProgression: vi.fn(),
}))

vi.mock("@/lib/theory/key-finder", () => ({
  parseChord: vi.fn((s: string) => ({ root: s, type: "", symbol: s })),
  analyzeChordInKey: vi.fn(() => null),
  applyFunctionalRomanOverrides: vi.fn((a: unknown[]) => a),
}))

vi.mock("@/lib/theory/transposer", () => ({
  analyzeProgression: vi.fn(() => [{ roman: "I", degree: 1, role: "diatonic", score: 1, inputChord: { root: "C", type: "maj7", symbol: "Cmaj7" } }]),
}))

import { createUserProgression, updateUserProgression, deleteUserProgression } from "@/app/(app)/progressions/actions"

// ─── SaveAsModal ────────────────────────────────────────────────────────────

describe("SaveAsModal", () => {
  const onClose = vi.fn()
  const onSaved = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders with default title and description", () => {
    render(
      <SaveAsModal
        defaultTitle="Pop Axis"
        defaultDescription="A common pop progression"
        parsedChords={[]}
        tonic="C"
        modeName="major"
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    expect(screen.getByDisplayValue("Pop Axis")).toBeInTheDocument()
    expect(screen.getByDisplayValue("A common pop progression")).toBeInTheDocument()
  })

  it("shows error when title is empty on save", async () => {
    render(
      <SaveAsModal
        defaultTitle=""
        defaultDescription=""
        parsedChords={[]}
        tonic="C"
        modeName="major"
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    expect(await screen.findByText(/title is required/i)).toBeInTheDocument()
    expect(createUserProgression).not.toHaveBeenCalled()
  })

  it("calls createUserProgression and onSaved on success", async () => {
    vi.mocked(createUserProgression).mockResolvedValue({ success: true, id: "new-id" })
    render(
      <SaveAsModal
        defaultTitle="My Progression"
        defaultDescription=""
        parsedChords={[{ root: "C", type: "maj7", symbol: "Cmaj7" }]}
        tonic="C"
        modeName="major"
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("new-id"))
  })

  it("calls onClose when Cancel clicked", () => {
    render(
      <SaveAsModal
        defaultTitle="Pop Axis"
        defaultDescription=""
        parsedChords={[]}
        tonic="C"
        modeName="major"
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })
})

// ─── EditMetaModal ──────────────────────────────────────────────────────────

describe("EditMetaModal", () => {
  const onClose = vi.fn()
  const onSaved = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders with current title and description", () => {
    render(
      <EditMetaModal
        progressionId="p1"
        currentTitle="My Blues"
        currentDescription="A blues progression"
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    expect(screen.getByDisplayValue("My Blues")).toBeInTheDocument()
    expect(screen.getByDisplayValue("A blues progression")).toBeInTheDocument()
  })

  it("calls updateUserProgression with new title and description on save", async () => {
    vi.mocked(updateUserProgression).mockResolvedValue({ success: true })
    render(
      <EditMetaModal
        progressionId="p1"
        currentTitle="My Blues"
        currentDescription=""
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    fireEvent.change(screen.getByDisplayValue("My Blues"), { target: { value: "Updated Blues" } })
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(updateUserProgression).toHaveBeenCalledWith("p1", {
      displayName: "Updated Blues",
      description: "",
    })
  })

  it("calls onClose when Cancel clicked", () => {
    render(
      <EditMetaModal
        progressionId="p1"
        currentTitle="My Blues"
        currentDescription=""
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })
})

// ─── DeleteConfirmModal ──────────────────────────────────────────────────────

describe("DeleteConfirmModal", () => {
  const onClose = vi.fn()
  const onDeleted = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows progression title in confirmation text", () => {
    render(
      <DeleteConfirmModal
        progressionId="p1"
        progressionTitle="My Blues"
        onClose={onClose}
        onDeleted={onDeleted}
      />
    )
    expect(screen.getByText(/my blues/i)).toBeInTheDocument()
  })

  it("calls deleteUserProgression and onDeleted on confirm", async () => {
    vi.mocked(deleteUserProgression).mockResolvedValue({ success: true })
    render(
      <DeleteConfirmModal
        progressionId="p1"
        progressionTitle="My Blues"
        onClose={onClose}
        onDeleted={onDeleted}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /delete/i }))
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
    expect(deleteUserProgression).toHaveBeenCalledWith("p1")
  })

  it("calls onClose when Cancel clicked", () => {
    render(
      <DeleteConfirmModal
        progressionId="p1"
        progressionTitle="My Blues"
        onClose={onClose}
        onDeleted={onDeleted}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
