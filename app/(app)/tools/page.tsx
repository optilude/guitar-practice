import Link from "next/link"
import { Search, Music, Compass, ArrowLeftRight, Timer, BarChart2 } from "lucide-react"
import { type ReactNode } from "react"

const TOOLS: { href: string; icon: ReactNode; name: string; description: string }[] = [
  {
    href: "/tools/chord-finder",
    icon: <Search size={36} strokeWidth={1.5} aria-hidden="true" />,
    name: "Chord Finder",
    description: "Find chords by shape",
  },
  {
    href: "/tools/scale-finder",
    icon: <Music size={36} strokeWidth={1.5} aria-hidden="true" />,
    name: "Scale Finder",
    description: "Find scales from notes",
  },
  {
    href: "/tools/key-finder",
    icon: <Compass size={36} strokeWidth={1.5} aria-hidden="true" />,
    name: "Key Finder",
    description: "Identify keys from the chords in a progression",
  },
  {
    href: "/tools/transposer",
    icon: <ArrowLeftRight size={36} strokeWidth={1.5} aria-hidden="true" />,
    name: "Transposer",
    description: "Transpose chords and progressions",
  },
  {
    href: "/tools/progression-analysis",
    icon: <BarChart2 size={36} strokeWidth={1.5} aria-hidden="true" />,
    name: "Progression Analysis",
    description: "Analyse chord progressions with real-time harmonic labelling",
  },
  {
    href: "/tools/metronome",
    icon: <Timer size={36} strokeWidth={1.5} aria-hidden="true" />,
    name: "Metronome",
    description: "Keep time while you practice",
  },
]

export default function ToolsPage() {
  return (
    <div className="pt-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Utilities</p>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Tools</h1>
      <div className="grid grid-cols-2 gap-3">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="block rounded-lg border border-border dark:border-neutral-600 bg-card dark:bg-neutral-800 p-4 hover:bg-muted dark:hover:bg-secondary transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{tool.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>
              </div>
              <div className="text-foreground flex-shrink-0">
                {tool.icon}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
