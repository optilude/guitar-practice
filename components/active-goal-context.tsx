"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { getActiveGoalTopicKeys } from "@/app/(app)/goals/actions"

type ActiveGoalContextValue = {
  activeGoalKeys: Set<string>
  markAdded: (key: string) => void
}

const ActiveGoalContext = createContext<ActiveGoalContextValue>({
  activeGoalKeys: new Set(),
  markAdded: () => {},
})

export function ActiveGoalProvider({ children }: { children: React.ReactNode }) {
  const [activeGoalKeys, setActiveGoalKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    getActiveGoalTopicKeys().then((keys) => setActiveGoalKeys(new Set(keys)))
  }, [])

  const markAdded = useCallback((key: string) => {
    setActiveGoalKeys((prev) => new Set([...prev, key]))
  }, [])

  return (
    <ActiveGoalContext.Provider value={{ activeGoalKeys, markAdded }}>
      {children}
    </ActiveGoalContext.Provider>
  )
}

export function useActiveGoal() {
  return useContext(ActiveGoalContext)
}
