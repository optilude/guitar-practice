"use client"
import type { InputChord } from "@/lib/theory/key-finder"

interface SaveModalProps {
  parsedChords: InputChord[]
  tonic: string
  modeName: string
  initialTitle: string
  initialDescription: string
  onClose: () => void
}
export function SaveModal({ onClose }: SaveModalProps) {
  return (
    <div role="dialog" aria-label="Save progression">
      <button type="button" onClick={onClose}>Close</button>
    </div>
  )
}
