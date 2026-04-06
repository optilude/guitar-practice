function fmt(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, "0")
  const s = (secs % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

interface TimerDisplayProps {
  sectionSecondsRemaining: number
  totalSecondsRemaining: number
}

export function TimerDisplay({ sectionSecondsRemaining, totalSecondsRemaining }: TimerDisplayProps) {
  return (
    <div className="flex items-baseline gap-1 text-sm tabular-nums text-muted-foreground">
      <span className="text-foreground font-medium">{fmt(sectionSecondsRemaining)}</span>
      <span>/</span>
      <span>{fmt(totalSecondsRemaining)}</span>
    </div>
  )
}
