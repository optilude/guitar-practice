"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface FullscreenContextValue {
  isFullscreen: boolean
  enter: () => void
  exit: () => void
}

const FullscreenContext = createContext<FullscreenContextValue>({
  isFullscreen: false,
  enter: () => {},
  exit: () => {},
})

export function FullscreenProvider({ children }: { children: ReactNode }) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isFullscreen])

  return (
    <FullscreenContext.Provider
      value={{
        isFullscreen,
        enter: () => setIsFullscreen(true),
        exit: () => setIsFullscreen(false),
      }}
    >
      {children}
    </FullscreenContext.Provider>
  )
}

export const useFullscreen = () => useContext(FullscreenContext)
