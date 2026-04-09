import Link from "next/link"
import { type ReactNode } from "react"

const TOOLS: { href: string; icon: ReactNode; name: string; description: string }[] = [
  {
    href: "/tools/chord-finder",
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
    name: "Chord Finder",
    description: "Find chords by shape",
  },
  {
    href: "/tools/scale-finder",
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </svg>
    ),
    name: "Scale Finder",
    description: "Find scales from notes",
  },
  {
    href: "/tools/key-finder",
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="7.5" cy="15.5" r="5.5"/>
        <path d="m21 2-9.6 9.6"/>
        <path d="m15.5 7.5 3 3L22 7l-3-3"/>
      </svg>
    ),
    name: "Key Finder",
    description: "Identify keys from the chords in a progression",
  },
  {
    href: "/tools/transposer",
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8 3 4 7l4 4"/>
        <path d="M4 7h16"/>
        <path d="m16 21 4-4-4-4"/>
        <path d="M20 17H4"/>
      </svg>
    ),
    name: "Transposer",
    description: "Transpose chords and progressions",
  },
  {
    href: "/tools/metronome",
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 2h4"/>
        <path d="M12 14 8 10"/>
        <circle cx="12" cy="14" r="8"/>
      </svg>
    ),
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
              <div className="text-muted-foreground/40 flex-shrink-0">
                {tool.icon}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
