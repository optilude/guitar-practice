"use client"

import { HarmonyTab } from "./harmony-tab"

interface HarmonyStudyProps {
  tonic: string
  onChordSelect?: (tonic: string, type: string, quality: string, primaryScaleName: string) => void
  onScaleSelect?: (tonic: string, scaleName: string) => void
}

export function HarmonyStudy({ tonic, onChordSelect, onScaleSelect }: HarmonyStudyProps) {
  return (
    <HarmonyTab tonic={tonic} onChordSelect={onChordSelect} onScaleSelect={onScaleSelect} />
  )
}
