import Link from "next/link"

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export default function HomePage() {
  return (
    <div className="pt-6">
      {/* Header row: greeting + placeholder streak area */}
      <div className="flex justify-between items-baseline mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
            {greeting()}
          </p>
          <h1 className="text-xl font-normal text-foreground">Get started</h1>
        </div>
        {/* Streak display — wired up in Phase 5 */}
        <div className="text-right opacity-0 select-none" aria-hidden>
          <div className="text-[13px] font-medium text-accent">— day streak</div>
          <div className="text-[10px] text-muted-foreground">— days on this goal</div>
        </div>
      </div>

      {/* Goal section */}
      <div className="mb-1">
        <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2">
          Goal
        </p>
        <p className="text-sm text-muted-foreground">
          <Link
            href="/goals"
            className="text-foreground underline underline-offset-2 decoration-border hover:decoration-foreground transition-colors"
          >
            Set your first goal to get started →
          </Link>
        </p>
      </div>
    </div>
  )
}
