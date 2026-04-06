import { useState, useMemo, useCallback } from "react"
import { resolveKeySequence } from "@/lib/sessions"
import type { SessionSection } from "@/lib/sessions"

export function useSessionNav(sections: SessionSection[]) {
  const [currentSectionIndex, setSectionIndex] = useState(0)
  const [currentKeyIndex, setKeyIndex] = useState(0)

  const currentSection = sections[currentSectionIndex]
  const currentKeySequence = useMemo(
    () => (currentSection?.topic ? resolveKeySequence(currentSection.topic) : [""]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentSectionIndex, sections],
  )

  const goToSection = useCallback((index: number) => {
    setSectionIndex(index)
    setKeyIndex(0)
  }, [])

  const goToNextSection = useCallback(() => {
    setSectionIndex((i) => {
      if (i >= sections.length - 1) return i
      setKeyIndex(0)
      return i + 1
    })
  }, [sections.length])

  const goToPrevSection = useCallback(() => {
    setSectionIndex((i) => {
      if (i <= 0) return i
      setKeyIndex(0)
      return i - 1
    })
  }, [])

  const goToNextKey = useCallback(() => {
    setKeyIndex((k) => (k + 1) % (currentKeySequence.length || 1))
  }, [currentKeySequence.length])

  const goToPrevKey = useCallback(() => {
    setKeyIndex((k) => (k - 1 + (currentKeySequence.length || 1)) % (currentKeySequence.length || 1))
  }, [currentKeySequence.length])

  const goToKeyIndex = useCallback((index: number) => {
    setKeyIndex(index)
  }, [])

  return {
    currentSectionIndex,
    currentKeyIndex,
    currentKeySequence,
    goToSection,
    goToNextSection,
    goToPrevSection,
    goToNextKey,
    goToPrevKey,
    goToKeyIndex,
  }
}
