"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { HarmonyTab } from "./harmony-tab"
import { ProgressionsTab } from "./progressions-tab"

interface HarmonyStudyProps {
  tonic: string
}

type HarmonySubTab = "harmony" | "progressions"

const TABS: HarmonySubTab[] = ["harmony", "progressions"]

export function HarmonyStudy({ tonic }: HarmonyStudyProps) {
  const [tab, setTab] = useState<HarmonySubTab>("harmony")

  return (
    <div>
      {/* Sub-tab bar */}
      <div
        role="tablist"
        aria-label="Harmony study tabs"
        className="flex border-b border-border"
        onKeyDown={(e) => {
          const current = TABS.indexOf(tab)
          if (e.key === "ArrowRight") setTab(TABS[(current + 1) % TABS.length])
          if (e.key === "ArrowLeft") setTab(TABS[(current - 1 + TABS.length) % TABS.length])
        }}
      >
        {TABS.map((id) => (
          <button
            key={id}
            id={`harmony-study-tab-${id}`}
            role="tab"
            aria-selected={tab === id}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === id
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {id.charAt(0).toUpperCase() + id.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab panel */}
      <div
        id="harmony-study-panel"
        role="tabpanel"
        aria-labelledby={`harmony-study-tab-${tab}`}
        className="pt-4"
      >
        {tab === "harmony" && <HarmonyTab tonic={tonic} />}
        {tab === "progressions" && <ProgressionsTab tonic={tonic} />}
      </div>
    </div>
  )
}
