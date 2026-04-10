import Link from "next/link"
import { AnalyserClient } from "./_components/analyser-client"

export default function ProgressionAnalyserPage() {
  return (
    <div className="pt-6">
      <Link
        href="/tools"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
      >
        ← Tools
      </Link>
      <h1 className="text-2xl font-semibold text-foreground mb-2">Progression Analysis</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Enter any chord sequence to see real-time harmonic analysis, explore substitutions, and find scales to solo over each chord.
      </p>
      <AnalyserClient />
    </div>
  )
}
