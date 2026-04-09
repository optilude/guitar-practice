import Link from "next/link"
import { MetronomeClient } from "./_components/metronome-client"

export default function MetronomePage() {
  return (
    <div className="pt-6">
      <Link
        href="/tools"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
      >
        ← Tools
      </Link>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Metronome</h1>
      <MetronomeClient />
    </div>
  )
}
