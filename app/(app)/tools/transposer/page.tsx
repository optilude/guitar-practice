import Link from "next/link"
import { TransposerClient } from "./_components/transposer-client"

export default function TransposerPage() {
  return (
    <div className="pt-6">
      <Link
        href="/tools"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-1"
      >
        ← Tools
      </Link>
      <h1 className="text-2xl font-semibold text-foreground mb-2">Transposer</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Enter a progression in a source key and transpose it to any other root.
      </p>
      <TransposerClient />
    </div>
  )
}
