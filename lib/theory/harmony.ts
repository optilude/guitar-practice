import { getKey } from "@/lib/theory/keys"
import type { DiatonicChord } from "@/lib/theory/types"

export function getDiatonicChords(tonic: string, mode: string): DiatonicChord[] {
  const key = getKey(tonic, mode)
  return key.diatonicChords
}
