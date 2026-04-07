import Link from "next/link"

const TOOLS = [
  {
    href: "/tools/chord-finder",
    icon: "♦",
    name: "Chord Finder",
    description: "Find chords by name or shape",
  },
  {
    href: "/tools/scale-finder",
    icon: "〜",
    name: "Scale Finder",
    description: "Explore scales and modes",
  },
  {
    href: "/tools/key-finder",
    icon: "♩",
    name: "Key Finder",
    description: "Identify keys from notes or chords",
  },
  {
    href: "/tools/transposer",
    icon: "⇄",
    name: "Transposer",
    description: "Transpose chords and progressions",
  },
  {
    href: "/tools/metronome",
    icon: "⏱",
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
            <p className="text-sm font-medium text-foreground">{tool.icon} {tool.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
