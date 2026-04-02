"use client"

import { useState } from "react"
import { CircleOfFifths } from "./_components/circle-of-fifths"
import { HarmonyStudy } from "./_components/harmony-study"
import { ScalePanel } from "./_components/scale-panel"
import { ArpeggioPanel } from "./_components/arpeggio-panel"
import { ChordPanel } from "./_components/chord-panel"
import { TriadPanel } from "./_components/triad-panel"
import { cn } from "@/lib/utils"

type PanelTab = "scales" | "arpeggios" | "chords" | "triads"

const TABS: { id: PanelTab; label: string }[] = [
  { id: "scales",    label: "Scales" },
  { id: "arpeggios", label: "Arpeggios" },
  { id: "chords",    label: "Chords" },
  { id: "triads",    label: "Triads" },
]

export default function ReferencePage() {
  const [selectedKey, setSelectedKey] = useState("C")
  const [activeTab, setActiveTab] = useState<PanelTab>("scales")

  return (
    <div className="pt-6 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
          Music Theory
        </p>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Reference</h1>
      </div>

      {/* Top section: Circle of Fifths + Harmony Study */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <section
          aria-label="Circle of Fifths key picker"
          className="lg:sticky lg:top-6 lg:w-[400px] lg:shrink-0"
        >
          <CircleOfFifths selectedKey={selectedKey} onKeySelect={setSelectedKey} />
        </section>

        <div className="flex-1 min-w-0">
          <HarmonyStudy tonic={selectedKey} />
        </div>
      </div>

      {/* Bottom section: Study Tools — full width */}
      <section aria-label="Study tools">
        <div
          role="tablist"
          aria-label="Reference panels"
          className="flex border-b border-border"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === tab.id
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          className="pt-6"
        >
          {activeTab === "scales"    && <ScalePanel    tonic={selectedKey} />}
          {activeTab === "arpeggios" && <ArpeggioPanel tonic={selectedKey} />}
          {activeTab === "chords"    && <ChordPanel    tonic={selectedKey} />}
          {activeTab === "triads"    && <TriadPanel    tonic={selectedKey} />}
        </div>
      </section>
    </div>
  )
}
