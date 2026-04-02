"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { HarmonyTab } from "./harmony-tab"
import { ProgressionsTab } from "./progressions-tab"

interface HarmonyStudyProps {
  tonic: string
}

type HarmonySubTab = "harmony" | "progressions"

export function HarmonyStudy({ tonic }: HarmonyStudyProps) {
  const [tab, setTab] = useState<HarmonySubTab>("harmony")

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Sub-tab bar */}
      <div
        role="tablist"
        aria-label="Harmony study panels"
        className="flex border-b border-border mb-4"
      >
        {(["harmony", "progressions"] as const).map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            aria-controls="harmony-study-panel"
            onClick={() => setTab(id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize",
              tab === id
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {id === "harmony" ? "Harmony" : "Progressions"}
          </button>
        ))}
      </div>

      {/* Tab panel */}
      <div id="harmony-study-panel" role="tabpanel">
        {tab === "harmony" && <HarmonyTab tonic={tonic} />}
        {tab === "progressions" && <ProgressionsTab tonic={tonic} />}
      </div>
    </div>
  )
}
