"use client"

import { useState } from "react"
import { CircleOfFifths } from "./_components/circle-of-fifths"
import { HarmonyStudy } from "./_components/harmony-study"
import { ScalePanel } from "./_components/scale-panel"
import { ArpeggioPanel } from "./_components/arpeggio-panel"
import { ChordPanel } from "./_components/chord-panel"
import { InversionPanel } from "./_components/inversion-panel"
import { cn } from "@/lib/utils"

type PanelTab = "scales" | "arpeggios" | "chords" | "inversions"

const TABS: { id: PanelTab; label: string }[] = [
  { id: "scales",     label: "Scales" },
  { id: "arpeggios",  label: "Arpeggios" },
  { id: "chords",     label: "Chords" },
  { id: "inversions", label: "Inversions" },
]

// Diatonic chord quality → InversionPanel inversion type (must match inversions-db.json suffixes)
const QUALITY_TO_INVERSION_TYPE: Record<string, string> = {
  major:      "major",
  minor:      "minor",
  dominant:   "major",   // dominant 7th has a major triad on top
  diminished: "dim",
  augmented:  "aug",
}

// Solo scale display name → ScalePanel scale type value
const SOLO_SCALE_TO_PANEL_TYPE: Record<string, string> = {
  "Ionian (major)":          "Major",
  "Dorian":                  "Dorian",
  "Phrygian":                "Phrygian",
  "Lydian":                  "Lydian",
  "Mixolydian":              "Mixolydian",
  "Aeolian (natural minor)": "Aeolian",
  "Locrian":                 "Locrian",
  "Major Pentatonic":        "Pentatonic Major",
  "Minor Pentatonic":        "Pentatonic Minor",
  "Blues Scale":             "Blues",
  "Locrian #2":              "Locrian #2",
  "Altered":                 "Altered",
  "Lydian Dominant":         "Lydian Dominant",
  "Lydian Augmented":        "Lydian Augmented",
  "Phrygian Dominant":       "Phrygian Dominant",
  "Bebop Dominant":          "Bebop Dominant",
  "Melodic Minor":           "Melodic Minor",
  "Diminished Half-Whole":   "Diminished Half-Whole",
}

export default function ReferencePage() {
  const [selectedKey, setSelectedKey] = useState("C")
  const [activeTab, setActiveTab] = useState<PanelTab>("scales")

  // Shared panel state — driven by Circle of Fifths, chord clicks, and scale clicks
  const [panelRoot, setPanelRoot] = useState("C")
  const [panelScaleTypeTrigger, setPanelScaleTypeTrigger] = useState<{ type: string } | null>(null)
  const [panelChordTypeTrigger, setPanelChordTypeTrigger] = useState<{ type: string } | null>(null)
  const [panelArpeggioTypeTrigger, setPanelArpeggioTypeTrigger] = useState<{ type: string } | null>(null)
  const [panelInversionTypeTrigger, setPanelInversionTypeTrigger] = useState<{ type: string } | null>(null)

  function handleKeySelect(key: string) {
    setSelectedKey(key)
    setPanelRoot(key)
  }

  function handleChordSelect(chordTonic: string, type: string, quality: string, primaryScaleName: string) {
    setPanelRoot(chordTonic)
    setPanelChordTypeTrigger({ type })
    setPanelArpeggioTypeTrigger({ type })
    const inversionType = QUALITY_TO_INVERSION_TYPE[quality]
    if (inversionType) setPanelInversionTypeTrigger({ type: inversionType })
    const panelScaleType = SOLO_SCALE_TO_PANEL_TYPE[primaryScaleName]
    if (panelScaleType) setPanelScaleTypeTrigger({ type: panelScaleType })
  }

  function handleScaleSelect(scaleTonic: string, scaleName: string) {
    setPanelRoot(scaleTonic)
    const panelType = SOLO_SCALE_TO_PANEL_TYPE[scaleName]
    if (panelType) setPanelScaleTypeTrigger({ type: panelType })
    setActiveTab("scales")
  }

  const TAB_IDS = TABS.map((t) => t.id)

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
          <CircleOfFifths selectedKey={selectedKey} onKeySelect={handleKeySelect} />
        </section>

        <div className="flex-1 min-w-0">
          <HarmonyStudy tonic={selectedKey} onChordSelect={handleChordSelect} onScaleSelect={handleScaleSelect} />
        </div>
      </div>

      {/* Bottom section: Study Tools — full width */}
      <section aria-label="Study tools">
        <div
          role="tablist"
          aria-label="Reference panels"
          className="flex border-b border-border"
          onKeyDown={(e) => {
            const current = TAB_IDS.indexOf(activeTab)
            if (e.key === "ArrowRight") setActiveTab(TAB_IDS[(current + 1) % TAB_IDS.length])
            if (e.key === "ArrowLeft") setActiveTab(TAB_IDS[(current - 1 + TAB_IDS.length) % TAB_IDS.length])
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
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
          {activeTab === "scales"    && <ScalePanel    root={panelRoot} onRootChange={setPanelRoot} scaleTypeTrigger={panelScaleTypeTrigger} />}
          {activeTab === "arpeggios" && <ArpeggioPanel root={panelRoot} onRootChange={setPanelRoot} chordTypeTrigger={panelArpeggioTypeTrigger} />}
          {activeTab === "chords"    && <ChordPanel    root={panelRoot} onRootChange={setPanelRoot} chordTypeTrigger={panelChordTypeTrigger} onScaleSelect={handleScaleSelect} />}
          {activeTab === "inversions" && <InversionPanel root={panelRoot} onRootChange={setPanelRoot} inversionTypeTrigger={panelInversionTypeTrigger} onScaleSelect={handleScaleSelect} />}
        </div>
      </section>
    </div>
  )
}
